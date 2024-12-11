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
import {Compartment} from '@codemirror/state';
import {SearchCursor} from '@codemirror/search';
import {html as htmlLang} from "@codemirror/lang-html";
import {cm6proDark} from './cm6pro-dark-theme';
import {prettify} from 'htmlfy';
import {indentationMarkers} from '@replit/codemirror-indentation-markers';

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
     * @member {(code: string) => void} _changesListener
     */
    _parentElement;
    _source;
    _editorView;
    _pendingChanges;
    _changesListener;
    /**
     * @param {HTMLElement} parentElement
     * @param {(code: string) => void} [changesListener]
     */
    constructor(parentElement, changesListener) {
        this._parentElement = parentElement;
        this._changesListener = changesListener;
        this._init();
    }

    _init() {
        this.themeConfig = new Compartment();
        this.linewrapConfig = new Compartment();
        const extensions = [
            basicSetup,
            indentationMarkers(),
            htmlLang(),
            this.linewrapConfig.of([EditorView.lineWrapping]),
            this.themeConfig.of([themes.light])
        ];
        if (this._changesListener) {
            extensions.push(
                EditorView.updateListener.of((viewUpdate) => {
                    this._pendingChanges ||= viewUpdate.docChanged;
                    if (this._pendingChanges && viewUpdate.focusChanged) {
                        // Do save changes into Tiny editor.
                        this._changesListener(this.getValue());
                        this._pendingChanges = false;
                    }
                })
            );
        }
        this._editorView = new EditorView({
            extensions,
            parent: this._parentElement
        });
    }

    /**
     * Destroys the editor
     */
    destroy() {
        this._editorView.destroy(this._parentElement);
    }

    /**
     * Scrolls to the caret position defined by NULL ut8 char
     */
    scrollToCaretPosition() {
       // Search the position of the NULL caret
       const state = this._editorView.state;
       const searchCursor = new SearchCursor(state.doc, String.fromCharCode(0));
       searchCursor.next();
       const value = searchCursor.value;
       if (value) {
           // Update the view by removing this marker and scrolling to its position
           this._editorView.dispatch({
               changes: {from: value.from, to: value.to, insert: ''},
               selection: {anchor: value.from},
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
        return this._editorView.state.doc.toString();
    }

    /**
     *
     * @param {string} theme
     */
    setTheme(themeName) {
        if (themes[themeName]) {
            this._editorView.dispatch({
                effects: this.themeConfig.reconfigure([themes[themeName]])
            });
        } else {
            // eslint-disable-next-line no-console
            console.error("Unknown theme", themeName);
        }
    }

    /**
     *
     * @param {boolean} bool
     */
    setLineWrapping(bool) {
        this._editorView.dispatch({
            effects: this.linewrapConfig.reconfigure(bool ? [EditorView.lineWrapping] : [])
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
                    changes: {from: cursor, insert: String.fromCharCode(0)},
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

