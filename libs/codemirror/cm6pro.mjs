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

import {EditorView, basicSetup} from "codemirror";
import {EditorState, Compartment} from '@codemirror/state';
import {syntaxTree} from '@codemirror/language';
import {SearchCursor} from '@codemirror/search';
import {html as htmlLang} from "@codemirror/lang-html";
import {cm6proDark} from './cm6pro-dark-theme';
import {prettify} from 'htmlfy';
import {indentationMarkers} from '@replit/codemirror-indentation-markers';

const MARKER = String.fromCharCode(0);

const themes = {
    'light': EditorView.baseTheme(),
    'dark': cm6proDark
};

export default class CodeProEditor {
    static getThemes() {
        return ['light', 'dark'];
    }
    /**
     * @member {HTMLElement} _parentElement
     * @member {string} _source
     * @member {CodeMirrorView} _editorView
     * @member {boolean} _pendingChanges
     * @member {Record<string,*>} _config
     */
    _parentElement;
    _source;
    _editorView;
    _pendingChanges;
    _config;
    /**
     * @param {HTMLElement} parentElement
     * @param {Record<string, any>} [options]
     */
    constructor(parentElement, options) {
        // Default configuration
        const themeName = options?.theme ?? 'light';
        this._config = {
            theme: [themes[themeName]],
            lineWrapping: options?.lineWrapping === false ? [] : [EditorView.lineWrapping],
            changesListener: options?.changesListener
        };

        this._parentElement = parentElement;
        this._editorView = new EditorView({
            state: this._createState(),
            parent: this._parentElement
        });
    }

    /**
     *
     * @param {string} [html] - The initial html
     * @returns {*} a new State
     */
    _createState(html) {
        this.themeConfig = new Compartment();
        this.linewrapConfig = new Compartment();
        const extensions = [
            basicSetup,
            indentationMarkers(),
            htmlLang(),
            this.linewrapConfig.of(this._config.lineWrapping),
            this.themeConfig.of(this._config.theme)
        ];
        if (this._config.changesListener) {
            extensions.push(
                EditorView.updateListener.of((viewUpdate) => {
                    this._pendingChanges ||= viewUpdate.docChanged;
                    if (this._pendingChanges && viewUpdate.focusChanged) {
                        // E.g. do save changes into Tiny editor.
                        this._config.changesListener(this.getValue());
                        this._pendingChanges = false;
                    }
                })
            );
        }
        return EditorState.create({
            doc: html ?? '',
            extensions
        });
    }

    /**
     * Destroys the editor
     */
    destroy() {
        this._editorView.destroy();
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
        this._pendingChanges = false;
    }

    /**
     * Gets the html source code
     * @returns {string}
     */
    getValue() {
        // Insert the NULL marker at the begining of the closest TAG
        const state = this._editorView.state;
        const anchor = state.selection.main.from;
        const tree = syntaxTree(state);
        let currentNode = tree.resolve(anchor, 1);
        // eslint-disable-next-line no-console
        console.log(state.selection.main, currentNode);

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
        let pos = null;
        if (nodeFound) {
            // eslint-disable-next-line no-console
            console.log(nodeFound);
            pos = nodeFound.from;
            this._editorView.dispatch({
                changes: {from: pos, to: pos, insert: MARKER}
            });
        }
        const html = this._editorView.state.doc.toString();
        if (pos !== null) {
            // eslint-disable-next-line no-console
            console.log("dispatching ", pos, pos + 1);
            this._editorView.dispatch({
                changes: {from: pos, to: pos + 1, insert: ''}
            });
        }
        return html;
    }

    /**
     * Sets the state properties. Not directly the whole state
     * to prevent plugins from being restarted
     * @param {*} stateProps
     */
    setState(stateProps) {
        const {html, selection} = stateProps;
        const view = this._editorView;
        const newState = this._createState(html, selection);
        view.setState(newState);

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
     * Sets light or dark themes dynamically
     * @param {string} theme
     */
    setTheme(themeName) {
        if (themes[themeName]) {
            this._config.theme = [themes[themeName]];
            this._editorView.dispatch({
                effects: this.themeConfig.reconfigure(this._config.theme)
            });
        } else {
            // eslint-disable-next-line no-console
            console.error("Unknown theme", themeName);
        }
    }

    /**
     * Enable/disable linewrapping dynamically
     * @param {boolean} bool
     */
    setLineWrapping(bool) {
        this._config.lineWrapping = bool ? [EditorView.lineWrapping] : [];
        this._editorView.dispatch({
            effects: this.linewrapConfig.reconfigure(this._config.lineWrapping)
        });
    }

    /**
     * Returns the prettified code as a string
     * @param {string} [text]
     * @param {boolean} [addMarker]
     * @returns {string}
     */
    prettifyCode(text, addMarker) {
        if (!text) {
            if (addMarker) {
                // Must add the marker to the current selection position in order to restore scroll
                // after the code has been formatted.
                const cursor = this._editorView.state.selection.main.head;
                this._editorView.dispatch({
                    changes: {from: cursor, insert: MARKER},
                });
            }
            text = this.getValue();
        }
        return prettify(text);
    }
    /**
     * Dispatch the prettified html into the view
     */
    prettify() {
        this.setValue(this.prettifyCode(null, true));
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

