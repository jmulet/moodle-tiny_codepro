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
    constructor(editorView, marker, markerClass) {
        this.editorView = editorView;
        this.marker = marker;
        this.markerClass = markerClass;
    }

    /**
    * Scrolls the editor view to the position of the marker.
    * If the marker is not found, scrolls the current view into focus.
    * @param {number} [head] - If the head position is passed it will not look for any markers.
    */
    scrollToCaretPosition(head) {
        const changes = [];
        if (!head) {
            // Look for the marker.
            const state = this.editorView.state;
            const cursor = new SearchCursor(state.doc, this.marker, 0, state.doc.length);            
            while (!cursor.next().done) {
                const value = cursor.value;
                if (!cursor.value) {
                    continue;
                }
                if (!head) {
                    // Stores the position of the first marker found
                    head = value.from;
                }
                // To deletes all markers
                changes.push({ from: value.from, to: value.to, insert: '' });
            }
        }
        if (head) {
            this.editorView.dispatch({
                changes,
                selection: { anchor: head },
                effects: EditorView.scrollIntoView(head, { y: "center" }),
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
        const doc = this.editorView.state.doc.toString();
        return doc.slice(0, cursor) + this.marker + doc.slice(cursor);
    }

    /**
     * Finds a safe insertion offset using a reliable linear tree traversal.
     *
     * This method traverses the tree from the beginning up to the cursor position,
     * keeping track of the end position of the last "Text" node it encounters.
     *
     * This approach has proven to be the most robust and reliable, avoiding
     * edge navigation issues that previously caused failures.
     *
     * @param {EditorState} state - The current state of CodeMirror.
     * @param {number} head - The cursor position.
     * @returns {number} A numeric offset guaranteed to be safe for text marker to be placed.
     */
    findSafeInsertionOffset(state, head) {
        const tree = syntaxTree(state);

        // 1. Fast Path: If the cursor is already inside a Text node, the position is perfect.
        const currentNode = tree.resolve(head, -1);
        if (currentNode.name === 'Text') {
            return head;
        }

        // 2. Backward Search: Look for the last text node *before* the cursor.
        let lastSeenTextEnd = -1; // Use -1 to indicate "not found"
        tree.iterate({
            from: 0,
            to: head,
            enter: (node) => {
                if (node.name === 'Text') {
                    lastSeenTextEnd = node.to;
                }
            }
        });

        // If we found a text node behind the cursor, that's our safe spot.
        if (lastSeenTextEnd !== -1) {
            return lastSeenTextEnd;
        }

        // 3. Forward Search: If no text was found behind the cursor, search forward.
        // This handles your exact case: <t@d>Cell 1...
        let firstSeenTextStart = -1;
        tree.iterate({
            from: head,
            enter: (node) => {
                if (node.name === 'Text') {
                    if (firstSeenTextStart === -1) { // We only care about the *first* one we find
                        firstSeenTextStart = node.from;
                    }
                }
            }
        });

        if (firstSeenTextStart !== -1) {
            return firstSeenTextStart;
        }

        // Final fallback: If there is no text anywhere in the document, return 0.
        return 0;
    }


    /**
     * Inserta un marcador HTML final utilizando un marcador de texto provisional
     * y validando la estructura a través de la API del DOM.
     */
    getHtmlWithHybridMarker(html, initialOffset) {
        const DISALLOWED_PARENTS = new Set(["script", "style", "textarea", "title", "noscript",
        "option", "optgroup", "select",
        "svg", "math", "object", "iframe",
        "head", "meta", "link", "base", "source", "track", "param",
        "img", "input", "br", "hr", "col", "embed", "area", "wbr"]);

        // 1. Insert a text marker at the best position found so far
        const htmlWithTextMarker = html.slice(0, initialOffset) + this.marker + html.slice(initialOffset);

        // 2. Parse the DOM
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlWithTextMarker, 'text/html');
        const body = doc.body;

        // 3. Find where the text marker is placed
        const walker = doc.createTreeWalker(body, NodeFilter.SHOW_TEXT);
        let textNodeWithMarker = null;
        while (walker.nextNode()) {
            if (walker.currentNode.nodeValue.includes(this.marker)) {
                textNodeWithMarker = walker.currentNode;
                break;
            }
        }

        if (!textNodeWithMarker) {
            return html; // No marker found, so return the initial html.
        }

        // Divide the TextNode with the marker (to remove the textMarker)
        const [nodeBefore, nodeAfter] = textNodeWithMarker.nodeValue.split(this.marker);
        textNodeWithMarker.nodeValue = nodeBefore;
        const newNodeAfter = document.createTextNode(nodeAfter);
        textNodeWithMarker.parentElement.insertBefore(newNodeAfter, textNodeWithMarker.nextSibling);

        // 4. Validate the context and find the final insertion point for the SPAN marker.
        let insertionPoint = newNodeAfter;
        let parent = insertionPoint.parentElement;

        while (parent && parent !== body) {
            if (DISALLOWED_PARENTS.has(parent.tagName?.toLowerCase())) {
                insertionPoint = parent; // Move the insertion point before the forbidden element.
                break;
            }
            parent = parent.parentElement;
        }

        // 5. Create and insert the final HTML marker that TinyMCE will be able to understand.
        const finalMarker = doc.createElement('span');
        finalMarker.classList.add(this.markerClass);
        finalMarker.innerHTML = '&nbsp;';

        insertionPoint.parentElement.insertBefore(finalMarker, insertionPoint);

        // 6. Serialize back to HTML.
        return body.innerHTML;
    }

    /**
     * Attempts to insert the marker near a valid HTML element based on the
     * current cursor position. Avoids disallowed contexts and falls back to
     * safe parent containers if necessary.
     *
     * @returns {string} The document content with the marker temporarily inserted.
    */
    getValueWithMarkerAtElement() {
        const state = this.editorView.state;
        const head = state.selection.main.head;
        const safeInitialOffset = this.findSafeInsertionOffset(state, head);
        const html = state.doc.toString();

        const finalHtml = this.getHtmlWithHybridMarker(html, safeInitialOffset);

        return finalHtml;
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
