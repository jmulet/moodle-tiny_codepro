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

import {basicSetup} from "codemirror";
import {EditorView, keymap} from "@codemirror/view";
import {EditorState, Compartment, Prec} from '@codemirror/state';
import {syntaxTree} from '@codemirror/language';
import {SearchCursor} from '@codemirror/search';
import {html as htmlLang} from "@codemirror/lang-html";
import {cm6proDark} from './cm6pro-dark-theme';

// 3rd party extensions.
import {indentationMarkers} from '@replit/codemirror-indentation-markers';
import {colorPicker} from '@replit/codemirror-css-color-picker';
import {showMinimap} from "@replit/codemirror-minimap";

const MARKER = String.fromCharCode(0);
const MIN_FONTSIZE = 8;
const MAX_FONTSIZE = 22;

const themes = {
    'light': EditorView.baseTheme(),
    'dark': cm6proDark
};

// The wrapper class
export default class CodeProEditor {
    static getThemes() {
        return ['light', 'dark'];
    }
    static Marker = {
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
            EditorView.editorAttributes.of({'class': "tiny_codepro-editorview"})
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
            return {dom};
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
        const searchCursor = new SearchCursor(state.doc, MARKER);
        searchCursor.next();
        const value = searchCursor.value;
        if (value) {
            // Update the view by removing this marker and scrolling to its position
            this._editorView.dispatch({
                changes: {from: value.from, to: value.to, insert: ''},
                selection: {anchor: value.from},
                scrollIntoView: true
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
        view.dispatch({changes: {from: 0, to: view.state.doc.length, insert: source || ''}});
        this.scrollToCaretPosition();
    }

    /**
     * Gets the html source code
     * @param {number} [marker]
     * @returns {string}
     */
    getValue(marker) {
        if (marker === CodeProEditor.Marker.atElement) {
            return this._getValueWithMarkerAtElement();
        } else if (marker === CodeProEditor.Marker.atCursor) {
            return this._getValueWithMarkerAtCursor();
        }
        return this._editorView.state.doc.toString();
    }

    /**
     * Gets the html source code,
     * including a NULL marker at the closest Element to the
     * cursor position
     * @returns {string}
     */
    _getValueWithMarkerAtElement() {
        let pos = null;
        // Insert the NULL marker at the begining of the closest TAG
        const state = this._editorView.state;
        const anchor = state.selection.main.from;
        const tree = syntaxTree(state);
        let currentNode = tree.resolve(anchor, -1);

        let nodeFound = null;
        while (!nodeFound && currentNode) {
            if (currentNode.type.name === 'Element') {
                nodeFound = currentNode;
            } else if (currentNode.prevSibling) {
                currentNode = currentNode.prevSibling;
            } else {
                currentNode = currentNode.parent;
            }
        }
        if (nodeFound) {
            pos = nodeFound.from;
            this._editorView.dispatch({
                changes: {from: pos, to: pos, insert: MARKER}
            });
        }

        const html = this._editorView.state.doc.toString();
        if (pos !== null) {
            this._editorView.dispatch({
                changes: {from: pos, to: pos + 1, insert: ''}
            });
        }
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
            changes: {from: cursor, insert: MARKER},
        });

        const html = this._editorView.state.doc.toString();
        if (cursor !== null) {
            this._editorView.dispatch({
                changes: {from: cursor, to: cursor + 1, insert: ''}
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
        const range = state.selection.ranges[0] || {from: 0, to: 0};
        return {
            html: state.doc.toString(),
            selection: {anchor: range.from, head: range.to}
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

