import {EditorView, basicSetup} from "codemirror"
import {Compartment} from '@codemirror/state'
import {html} from "@codemirror/lang-html"
import {solarizedDark} from 'cm6-theme-solarized-dark'

const themes = {
    'light': EditorView.baseTheme(),
    'dark': solarizedDark
};

export default class CodeProEditor {
    static getThemes() {
        return ['light', 'dark']
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
        this.linewrapConfig = new Compartment();
        this.#editorView = new EditorView({
            extensions: [
                basicSetup, 
                html(),
                this.linewrapConfig.of([EditorView.lineWrapping]),
                this.themeConfig.of([themes['light']])
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
        const view = this.#editorView;
        view.dispatch({changes: {from: 0, to: view.state.doc.length, insert: code}});
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

    /**
     * 
     * @param {boolean} bool 
     */
    setLineWrapping(bool) {
        this.#editorView.dispatch({
            effects: this.linewrapConfig.reconfigure(bool ? [EditorView.lineWrapping] : [])
        });
    }
}

