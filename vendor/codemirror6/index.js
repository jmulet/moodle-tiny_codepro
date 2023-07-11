import {EditorView, basicSetup} from "codemirror"
import {Compartment} from '@codemirror/state'
import {html} from "@codemirror/lang-html"
import {basicLight} from 'cm6-theme-basic-light'
import {basicDark} from 'cm6-theme-basic-dark'
import {solarizedDark} from 'cm6-theme-solarized-dark'

const themes = {
    'base-theme': EditorView.baseTheme(),
    'basic-light': basicLight,
    'basic-dark': basicDark,
    'solarized-dark': solarizedDark,
};

export default class CodeProEditor {
    static getThemes() {
        return ['basic-light', 'basic-dark', 'solarized-dark']
    }
    /**
     * @member {HTMLElement} parentElement
     * @member {string | TinyMCE} source
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
        this.#editorView = new EditorView({
            extensions: [
                basicSetup, 
                html(),
                EditorView.lineWrapping,
                this.themeConfig.of([themes['base-theme']])
            ],
            parent: this.#parentElement
        });
    }
    /**
     * 
     * @param {string | TinyMCE} source 
     */
    setValue(source) {
        this.#source = source;
        let code = source || '';
        if(typeof source?.getContent === "function") {
            code = source.getContent();
        }
        this.#editorView.dispatch({
            changes: {from: 0, insert: code}
        });
    }
    /**
     * @returns {string}
     */
    getValue() {
        return this.#editorView.state.doc.toString();
    }

    updateContent() {
        if(typeof this.#source?.setContent === "function") {
            this.#source.setContent(this.getValue(), {format: 'html'});
        } else {
            console.log(this.getValue());
        }
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
}

