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
 * @copyright   2023 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {EditorView, basicSetup} from "codemirror"
import {Compartment} from '@codemirror/state'
import {html as htmlLang} from "@codemirror/lang-html"
import {cm6proDark} from './cm6pro-dark-theme'
import {prettify} from 'htmlfy'

const themes = {
    'light': EditorView.baseTheme(),
    'dark': cm6proDark
};

export default class CodeProEditor {
    static getThemes() {
        return ['light', 'dark']
    }
    /**
     * @member {HTMLElement} parentElement
     * @member {string} source
     * @member {CodeMirrorView} editorView;
     */
    #parentElement;
    #source;
    #editorView;
    
    /**
     * @param {HTMLElement} parentElement 
     */
    constructor(parentElement) { 
        this.#parentElement = parentElement;
        this.#init();
    }

    #init() {
        this.themeConfig = new Compartment();
        this.linewrapConfig = new Compartment();
        this.#editorView = new EditorView({
            extensions: [
                basicSetup, 
                htmlLang(),
                this.linewrapConfig.of([EditorView.lineWrapping]),
                this.themeConfig.of([themes['light']])
            ],
            parent: this.#parentElement
        });
    }
    /**
     * Sets the html source code
     * @param {string} source 
     */
    setValue(source) {
        this.#source = source;
        const view = this.#editorView;
        view.dispatch({changes: {from: 0, to: view.state.doc.length, insert: source || ''}});
    }
    /**
     * Gets the html source code
     * @returns {string}
     */
    getValue() {
        return this.#editorView.state.doc.toString();
    }
    
    /**
     * 
     * @param {string} theme 
     */
    setTheme(themeName) {
        if (themes[themeName]) { 
            this.#editorView.dispatch({
                effects: this.themeConfig.reconfigure([themes[themeName]])
            });
        } else {
            console.error("Unknown theme", themeName);
        }
    }

    /**
     * 
     * @param {boolean} bool 
     */
    setLineWrapping(bool) {
        this.#editorView.dispatch({
            effects: this.linewrapConfig.reconfigure(bool ? [EditorView.lineWrapping] : [])
        });
    }

    /**
     * Prettify the html source
     * @returns {string}
     */
    prettify() {
        const source = this.getValue();
        const beautified = prettify(source);
        this.setValue(beautified);
    }
}

