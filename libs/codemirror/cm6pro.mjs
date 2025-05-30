// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Tiny CodePro plugin. Thin wrapper around CodeMirror 6
 *
 * @module      tiny_codepro/plugin
 * @copyright   2024 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import { basicSetup } from "codemirror";
import { EditorView, keymap } from "@codemirror/view";
import { EditorState, Transaction, Compartment, Prec } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { SearchCursor } from '@codemirror/search';
import { html as htmlLang } from "@codemirror/lang-html";
import { cm6proDark } from './cm6pro-dark-theme';

// 3rd party extensions.
import { indentationMarkers } from '@replit/codemirror-indentation-markers';
import { colorPicker } from '@replit/codemirror-css-color-picker';
import { showMinimap } from "@replit/codemirror-minimap";

const MIN_FONTSIZE = 8;
const MAX_FONTSIZE = 22;


function printTreePathToRoot(node, doc) {
      const path = [];
  const cursor = node.cursor();

  // Step up to the root, capturing each level's context
  do {
    const siblings = [];

    // Capture all siblings at this level
    const siblingCursor = cursor.node.parent?.cursor();
    if (siblingCursor?.firstChild()) {
      do {
        const sFrom = siblingCursor.from;
        const sTo = siblingCursor.to;
        const sText = doc.sliceString(sFrom, sTo).replace(/\n/g, "\\n");
        const isCurrent = siblingCursor.from === cursor.from && siblingCursor.to === cursor.to;
        siblings.push(`${isCurrent ? "👉 " : "   "}${siblingCursor.name} [${sFrom}, ${sTo}]: "${sText}"`);
      } while (siblingCursor.nextSibling());
    }

    path.push(siblings);
  } while (cursor.parent());

  // Print from leaf to root
  console.log("Tree path from node to root with siblings:");
  path.forEach((siblings, level) => {
    const indent = "  ".repeat(level);
    siblings.forEach(line => console.log(indent + line));
  });
}

function printFullSyntaxTree(state) {
    const doc = state.doc;
    const tree = syntaxTree(state);
    const cursor = tree.topNode.cursor();

    function printNode(c, indent = 0) {
        const padding = "  ".repeat(indent);
        const content = doc.sliceString(c.from, c.to).replace(/\n/g, "\\n");
        console.log(`${padding}${c.name} [${c.from}, ${c.to}]: "${content}"`);

        if (c.firstChild()) {
            do {
                printNode(c, indent + 1);
            } while (c.nextSibling());
            c.parent();
        }
    }

    printNode(cursor);
}

const disallowedTags = new Set([
    "script", "style", "textarea", "title", "noscript",
    "option", "optgroup", "select",
    "svg", "math", "object", "iframe",
    "head", "meta", "link", "base", "source", "track", "param",
    "img", "input", "br", "hr", "col", "embed", "area", "wbr"
]);

const themes = {
    'light': EditorView.baseTheme(),
    'dark': cm6proDark
};

// The wrapper class
export default class CodeProEditor {
    static getThemes() {
        return ['light', 'dark'];
    }
    static Marker = String.fromCharCode(0);
    static MarkerType = {
        none: 0,
        atElement: 1,
        atCursor: 2
    };
    /**
     * @member {HTMLElement} _parentElement
     * @member {string} _source
     * @member {CodeMirrorView} _editorView
     * @member {Record<string,*>} _config
     */
    _parentElement;
    _source;
    _editorView;
    _config;
    /**
     * @param {HTMLElement} parentElement
     * @param {Record<string, any>} [options]
     */
    constructor(parentElement, options) {
        // Default configuration
        this._config = {
            themeName: options?.theme ?? 'light',
            fontSize: options?.fontSize ?? 11,
            lineWrapping: options?.lineWrapping ?? false,
            minimap: options?.minimap ?? true,
            changesListener: options?.changesListener,
            commands: options.commands
        };

        this._parentElement = parentElement;
        this._editorView = new EditorView({
            state: this._createState(options.doc),
            parent: this._parentElement
        });
        if (options.doc) {
            this.scrollToCaretPosition();
        }

        // Make sure that any changes on the parent dimensions, will triger a view requestMeasure
        this.resizeObserver = new ResizeObserver(() => {
            // No need to check entries here, as we only observe one element
            if (this._editorView) {
                this._editorView.requestMeasure();
            }
        });
        // Start observing the parent element
        let observeElement = parentElement;
        if (parentElement instanceof ShadowRoot) {
            observeElement = parentElement.host;
        }
        this.resizeObserver.observe(observeElement);
    }

    /**
     *
     * @param {string} [html] - The initial html
     * @returns {*} a new State
     */
    _createState(html) {
        this.themeConfig = new Compartment();
        this.linewrapConfig = new Compartment();
        this.minimapConfig = new Compartment();

        const extensions = [
            basicSetup,
            htmlLang(),
            indentationMarkers(),
            colorPicker,
            this.linewrapConfig.of(this._config.lineWrapping ? [EditorView.lineWrapping] : []),
            this.themeConfig.of(this._createTheme()),
            this.minimapConfig.of(this._createMinimap()),
            Prec.high(keymap.of(this._createKeyMap())),
            EditorView.editorAttributes.of({ 'class': "tiny_codepro-editorview" })
        ];
        if (this._config.changesListener) {
            extensions.push(EditorView.updateListener.of((viewUpdate) => {
                if (viewUpdate.docChanged) {
                    this._config.changesListener();
                }
            }));
        }

        return EditorState.create({
            doc: html ?? '',
            extensions
        });
    }

    _createKeyMap() {
        return [
            {
                key: "Shift-Alt-m",
                preventDefault: true,
                stopPropagation: true,
                run: this._config.commands.minimap
            },
            {
                key: "Shift-Alt-p",
                preventDefault: true,
                stopPropagation: true,
                run: this._config.commands.prettify
            },
            {
                key: "Shift-Alt-w",
                preventDefault: true,
                stopPropagation: true,
                run: this._config.commands.linewrapping
            },
            {
                key: "Shift-Alt-t",
                preventDefault: true,
                stopPropagation: true,
                run: this._config.commands.theme
            },
            {
                key: "Shift-Alt-a",
                preventDefault: true,
                stopPropagation: true,
                run: this._config.commands.accept
            },
            {
                key: "Shift-Alt-d",
                preventDefault: true,
                stopPropagation: true,
                run: () => {
                    // Stores the preferences from this editor
                    this._config.commands.savePrefs();
                    return true;
                }
            },
            {
                key: "Shift-Alt-c",
                preventDefault: true,
                stopPropagation: true,
                run: this._config.commands.cancel
            },
        ];
    }

    /**
     * @returns {*}
     */
    _createMinimap() {
        if (!this._config.minimap) {
            return [];
        }

        const create = () => {
            const dom = document.createElement('div');
            return { dom };
        };
        return showMinimap.compute(['doc'], () => {
            return ({
                create,
                displayText: 'blocks',
                showOverlay: 'always',
                gutters: [],
            });
        });
    }

    /**
     * Destroys the editor
     */
    destroy() {
        this._editorView.destroy();
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }

    /**
     * Scrolls to the caret position defined by NULL ut8 char
     */
    scrollToCaretPosition() {
        // Search the position of the NULL caret
        const state = this._editorView.state;
        const searchCursor = new SearchCursor(state.doc, CodeProEditor.Marker);
        searchCursor.next();
        const value = searchCursor.value;
        if (value) {
            // Update the view by removing this marker and scrolling to its position
            this._editorView.dispatch({
                changes: { from: value.from, to: value.to, insert: '' },
                selection: { anchor: value.from },
                scrollIntoView: true,
                annotations: [Transaction.addToHistory.of(false)]
            });
        } else {
            // Simply ensure that the cursor position is into view
            this._editorView.dispatch({
                scrollIntoView: true
            });
        }
    }

    /**
     * Sets the html source code
     * @param {string} source
     */
    setValue(source) {
        this._source = source;
        const view = this._editorView;
        view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: source || '' },
            annotations: [Transaction.addToHistory.of(false)]
        });
        this.scrollToCaretPosition();
    }

    /**
     * Gets the html source code
     * @param {number} [marker]
     * @returns {string}
     */
    getValue(marker) {
        if (marker === CodeProEditor.MarkerType.atElement) {
            return this._getValueWithMarkerAtElement();
        } else if (marker === CodeProEditor.MarkerType.atCursor) {
            return this._getValueWithMarkerAtCursor();
        }
        return this._editorView.state.doc.toString();
    }

    /**
     * 
     * @returns The node type name at the cursor head
     */
    _getCurrentNodeType() {
        const state = this._editorView.state;
        const head = state.selection.main.head;
        const tree = syntaxTree(state);
        const currentNode = tree.resolve(head, -1);
        return currentNode?.type?.name;
    }


_getTagNameFromCursor(node, doc) {
  const cursor = node.cursor();

  // Recursive function to search any subtree
  function findTagName(c) {
    if (c.name === "TagName") {
      return doc.sliceString(c.from, c.to);
    }
    if (c.firstChild()) {
      do {
        const result = findTagName(c);
        if (result) return result;
      } while (c.nextSibling());
      c.parent(); // go back up
    }
    return null;
  }

  return findTagName(cursor);
}

    /**
      * Traverses the syntax tree upward from the given node to ensure it is not within
      * any disallowed HTML tag context.
      *
      * - If no disallowed tags are found from the node up to the root, null is returned.
      * - If any disallowed tag is found in the ancestor chain, the function returns the
      *   nearest ancestor node whose entire path to the root is free of disallowed tags.
      * - If no such safe ancestor exists (i.e., all are nested inside disallowed tags), returns null.
      *
      * This is useful for determining a safe insertion point for elements like <span>.
      *
      * @param {TreeCursor} node - The syntax tree node to evaluate.
      * @returns {TreeCursor|null} - The nearest safe container node, or null if none exists.
      */
    _getSafeRootedContainer(node) {
        const doc = this._editorView.state.doc;

        const cursor = node.cursor();
        let safeContainer = null;
        let anyDisallowedFound = false;

        do {
            if (cursor.name === "Element") {
                const tagName = this._getTagNameFromCursor(cursor.node, doc);
                console.log(tagName);
                if (tagName) {
                    const name = tagName.toLowerCase();
                    if (disallowedTags.has(name)) {
                        safeContainer = cursor.node;
                        anyDisallowedFound = true;
                    }
                }
            }
        } while (cursor.parent());


        // If no disallowed tag found all the way to root
        return { anyDisallowedFound, safeContainer }
    }

    /**
     * Gets the html source code,
     * including a NULL marker at the closest Element to the
     * cursor position
     * @returns {string}
     */
    _getValueWithMarkerAtElement() {

        // Insert the NULL marker at the begining of the closest TAG
        const head = this._editorView.state.selection.main.head;
        const tree = syntaxTree(this._editorView.state);
        let currentNode = tree.resolve(head, -1);
        const doc = this._editorView.state.doc;
        printTreePathToRoot(currentNode, doc);
        //printFullSyntaxTree(this._editorView.state);

        // Node types where we should NOT insert the marker
        const disallowedContexts = new Set([
            "ScriptText", "StyleText", "Comment", "CommentText", "CommentBlock", "Attribute", "TagName",
            "StartTag", "EndTag", "MismatchedCloseTag", "ObjectElement", "SvgElement"
        ]);

        const cursor = currentNode.cursor();
        let nodeFound = null;
        let pos = null;
        let firstRun = true;
        do {
            const nodeName = cursor.name;
            console.log(cursor.name, cursor.from, cursor.to);
            if (nodeName === "Text") {
                pos = firstRun ? head : cursor.from;
                nodeFound = cursor.node;
                break;
            }

            if (nodeName === "EndTag" || nodeName === "SelfClosingTag") {
                pos = cursor.to;
                nodeFound = cursor.node;
                break;
            }

            if (nodeName === "StartTag" || nodeName === "StartCloseTag" || nodeName === "Comment") {
                pos = cursor.from;
                nodeFound = cursor.node;
                break;
            }

            if (nodeName === "Element" && !disallowedContexts.has(nodeName)) {
                pos = cursor.from;
                nodeFound = cursor.node;
                break;
            }

            // TODO Why this????? Try to check next sibling
            if (cursor.nextSibling()) {
                if (cursor.name === "Element") {
                    pos = cursor.from;
                    nodeFound = cursor.node;
                    break;
                }
                cursor.prevSibling(); // go back to where we were
            }
            firstRun = false;
        } while (cursor.parent());

        if (pos === null && pos === undefined) {
            return this._editorView.state.doc.toString(); // fallback — no suitable place found
        }

        // Check if the selected currentNode is safe to place a span
        const { anyDisallowedFound, safeContainer } = this._getSafeRootedContainer(currentNode);
      
        if (anyDisallowedFound) {
            if (safeContainer) {
                // Set cursor just before the disallowed tag
                pos = safeContainer.from;
            } else {
                // Give up
                return this._editorView.state.doc.toString(); // fallback — no suitable place found
            }
        }

        console.log(pos, anyDisallowedFound, safeContainer);
        this._editorView.dispatch({
            changes: { from: pos, to: pos, insert: CodeProEditor.Marker },
            annotations: [Transaction.addToHistory.of(false)]
        });

        const html = this._editorView.state.doc.toString();

        this._editorView.dispatch({
            changes: { from: pos, to: pos + 1, insert: '' },
            annotations: [Transaction.addToHistory.of(false)]
        });

        return html;
    }

    /**
     * Gets the html source code,
     * including a NULL marker at the cursor position
     * @returns {string}
     */
    _getValueWithMarkerAtCursor() {
        const cursor = this._editorView.state.selection.main.head;
        this._editorView.dispatch({
            changes: { from: cursor, insert: CodeProEditor.Marker },
            annotations: [Transaction.addToHistory.of(false)]
        });

        const html = this._editorView.state.doc.toString();
        if (cursor !== null) {
            this._editorView.dispatch({
                changes: { from: cursor, to: cursor + 1, insert: '' },
                annotations: [Transaction.addToHistory.of(false)]
            });
        }
        return html;
    }

    /**
     * Sets the selection
     * @param {*} selection
     */
    setSelection(selection) {
        // Restore selection
        this._editorView.dispatch({
            selection,
            scrollIntoView: true
        });
    }

    /**
     * Gets the current editor's view state properties
     * @returns {*}
     */
    getState() {
        const state = this._editorView.state;
        const range = state.selection.ranges[0] || { from: 0, to: 0 };
        return {
            html: state.doc.toString(),
            selection: { anchor: range.from, head: range.to }
        };
    }

    /**
     * Creates light or dark themes dynamically for an specific fontSize
     * @param {string} [themeName]
     * @returns {*[] | null} - The theme effects
     */
    _createTheme(themeName) {
        themeName = themeName ?? this._config.themeName ?? 'light';
        const baseTheme = themes[themeName];
        if (!baseTheme) {
            return null;
        }
        this._config.themeName = themeName;

        const fontTheme = EditorView.theme({
            ".cm-content": {
                fontSize: this._config.fontSize + "pt",
            },
            ".cm-gutters": {
                fontSize: this._config.fontSize + "pt",
            },
        });
        return [baseTheme, fontTheme];
    }

    /**
     * Sets light or dark themes dynamically for an specific fontSize
     * @param {string} [themeName]
     */
    setTheme(themeName) {
        const theme = this._createTheme(themeName);
        if (!theme) {
            // eslint-disable-next-line no-console
            console.error("Unknown theme", themeName);
        }
        this._editorView.dispatch({
            effects: this.themeConfig.reconfigure(theme)
        });
    }

    /**
     * Toogles light or dark themes dynamically for an specific fontSize
     */
    toggleTheme() {
        const themeName = this._config.themeName === 'light' ? 'dark' : 'light';
        this.setTheme(themeName);
        return themeName;
    }

    /**
     * Sets an specific font size
     * @param {number} size
     */
    setFontsize(size) {
        this._config.fontSize = size;
        this.setTheme();
    }

    /**
     * Gets the current font size
     * @returns {number}
     */
    getFontsize() {
        return this._config.fontSize;
    }

    /**
     * Increases the font size up to a MAX_FONTSIZE
     */
    increaseFontsize() {
        if (this._config.fontSize > MAX_FONTSIZE) {
            return;
        }
        this._config.fontSize += 1;
        this.setTheme();
    }

    /**
     * Decreases the font size down to a MIN_FONTSIZE
     */
    decreaseFontsize() {
        if (this._config.fontSize < MIN_FONTSIZE) {
            return;
        }
        this._config.fontSize -= 1;
        this.setTheme();
    }

    /**
     * Enable/disable linewrapping dynamically
     */
    toggleLineWrapping() {
        this._config.lineWrapping = !this._config.lineWrapping;
        this._editorView.dispatch({
            effects: this.linewrapConfig.reconfigure(this._config.lineWrapping ? [EditorView.lineWrapping] : [])
        });
        return this._config.lineWrapping;
    }

    /**
     * Show/hide minimap dynamically
     */
    toggleMinimap() {
        this._config.minimap = !this._config.minimap;
        this._editorView.dispatch({
            effects: this.minimapConfig.reconfigure(this._createMinimap())
        });
        this._editorView.focus();
        // Issue:: Need to scroll to ensure minimap is rerendered
        this._editorView.dispatch({
            scrollIntoView: true
        });
        return this._config.minimap;
    }

    /**
     * Focus onto the editor
     */
    focus() {
        if (!this._editorView.hasFocus) {
            this._editorView.focus();
        }
    }
}

