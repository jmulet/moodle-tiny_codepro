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
import { EditorView } from "@codemirror/view";
import { Transaction } from '@codemirror/state';
import { SearchCursor } from '@codemirror/search';
import { syntaxTree } from '@codemirror/language';
import { getTagNameFromCursor } from './treeutils';

const disallowedTags = new Set([
    "script", "style", "textarea", "title", "noscript",
    "option", "optgroup", "select",
    "svg", "math", "object", "iframe",
    "head", "meta", "link", "base", "source", "track", "param",
    "img", "input", "br", "hr", "col", "embed", "area", "wbr"
]);

const disallowedContexts = new Set([
    "ScriptText", "StyleText", "Comment", "CommentText", "CommentBlock", "Attribute", "TagName",
    "StartTag", "EndTag", "MismatchedCloseTag", "ObjectElement", "SvgElement"
]);

/**
 * Class responsible for synchronizing cursor-based interactions
 * and inserting markers in a CodeMirror 6 editor.
 */
export class CursorSync {
    /**
   * Creates an instance of CursorSync.
   *
   * @param {EditorView} editorView - The CodeMirror editor view instance.
   * @param {string} marker - The marker string to insert at cursor/element positions.
   */
    constructor(editorView, marker) {
        this.editorView = editorView;
        this.marker = marker;
    }

    /**
    * Scrolls the editor view to the position of the marker.
    * If the marker is not found, scrolls the current view into focus.
    */
    scrollToCaretPosition() {
        const state = this.editorView.state;
        const searchCursor = new SearchCursor(state.doc, this.marker);
        searchCursor.next();
        const value = searchCursor.value;
        if (value) {
            this.editorView.dispatch({
                changes: { from: value.from, to: value.to, insert: '' },
                selection: { anchor: value.from },
                effects: EditorView.scrollIntoView(value.from, { y: "center" }),
                annotations: [Transaction.addToHistory.of(false)]
            });
        } else {
            this.editorView.dispatch({
                scrollIntoView: true
            });
        }
    }


    /**
     * Inserts the marker at the current cursor position and returns
     * the editor content as a string. The marker is removed immediately
     * after insertion. Does not affect undo history.
     *
     * @returns {string} The document content with the marker temporarily inserted.
     */
    getValueWithMarkerAtCursor() {
        const cursor = this.editorView.state.selection.main.head;
        this.editorView.dispatch({
            changes: { from: cursor, insert: this.marker },
            annotations: [Transaction.addToHistory.of(false)]
        });

        const html = this.editorView.state.doc.toString();
        if (cursor !== null) {
            this.editorView.dispatch({
                changes: { from: cursor, to: cursor + 1, insert: '' },
                annotations: [Transaction.addToHistory.of(false)]
            });
        }
        return html;
    }

    /**
    * Attempts to insert the marker near a valid HTML element based on the
    * current cursor position. Avoids disallowed contexts and falls back to
    * safe parent containers if necessary.
    *
    * @returns {string} The document content with the marker temporarily inserted.
    */
    getValueWithMarkerAtElement() {
        let state = this.editorView.state;
        const head = state.selection.main.head;
        const tree = syntaxTree(state);
        let currentNode = tree.resolve(head, -1);
        const doc = state.doc;

        const cursor = currentNode.cursor();
        let pos = null;
        let firstRun = true;
        do {
            const nodeName = cursor.name;
            if (nodeName === "Text") {
                pos = firstRun ? head : cursor.from;
                break;
            }

            if (["EndTag", "SelfClosingTag"].includes(nodeName)) {
                pos = cursor.to;
                break;
            }

            if (["StartTag", "StartCloseTag", "Comment"].includes(nodeName)) {
                pos = cursor.from;
                break;
            }

            if (nodeName === "Element" && !disallowedContexts.has(nodeName)) {
                pos = cursor.from;
                break;
            }

            if (cursor.nextSibling() && cursor.name === "Element") {
                pos = cursor.from;
                break;
            }
            cursor.prevSibling();
            firstRun = false;
        } while (cursor.parent());

        if (pos == null) {
            return doc.toString();
        }

        const { anyDisallowedFound, safeContainer } = this._getSafeRootedContainer(currentNode, doc);

        if (anyDisallowedFound && safeContainer) {
            pos = safeContainer.from;
        } else if (anyDisallowedFound) {
            return doc.toString();
        }

        this.editorView.dispatch({
            changes: { from: pos, to: pos, insert: this.marker },
            annotations: [Transaction.addToHistory.of(false)]
        });
        state = this.editorView.state;

        const html = state.doc.toString();

        this.editorView.dispatch({
            changes: { from: pos, to: pos + 1, insert: '' },
            annotations: [Transaction.addToHistory.of(false)]
        });
        state = this.editorView.state;

        return html;
    }

    /**
    * Traverses the syntax tree to find a parent node that is disallowed.
    *
    * @private
    * @param {SyntaxNode} node - The starting syntax tree node.
    * @param {Text} doc - The current document text.
    * @returns {{ anyDisallowedFound: boolean, safeContainer: SyntaxNode | null }} Object with disallowed status and container node.
    */
    _getSafeRootedContainer(node, doc) {
        const cursor = node.cursor();
        let safeContainer = null;
        let anyDisallowedFound = false;
        do {
            if (cursor.name === "Element") {
                const tagName = getTagNameFromCursor(cursor.node, doc);
                if (tagName) {
                    const name = tagName.toLowerCase();
                    if (disallowedTags.has(name)) {
                        safeContainer = cursor.node;
                        anyDisallowedFound = true;
                    }
                }
            }
        } while (cursor.parent());

        return { anyDisallowedFound, safeContainer };
    }

    /**
     * Gets the type name of the syntax node at the cursor's current position.
     *
     * @private
     * @returns {string | undefined} The type name of the node under the cursor, if any.
     */
    _getCurrentNodeType() {
        const state = this.editorView.state;
        const head = state.selection.main.head;
        const tree = syntaxTree(state);
        const currentNode = tree.resolve(head, -1);
        return currentNode?.type?.name;
    }

}

