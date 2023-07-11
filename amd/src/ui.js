/* eslint-disable no-undef */
/* eslint-disable no-console */
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

import CodeProModal from "./modal";
import ModalFactory from 'core/modal_factory';
import ModalEvents from 'core/modal_events';
import {baseUrl} from './common';

const useEditor = "codemirror6";

/**
 * Tiny CodePro plugin.
 *
 * @module      tiny_codepro/plugin
 * @copyright   2023 Josep Mulet Pol <pmulet@iedib.net>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

const addCssLink = (href, id) => {
    const linkElem = document.createElement("link");
    linkElem.id = id;
    linkElem.setAttribute("rel", "stylesheet");
    linkElem.setAttribute("href", href);
    document.head.appendChild(linkElem);
};

/**
 * Handle action
 * @param {TinyMCE} editor
 */
export const handleAction = (editor) => {
    displayDialogue(editor);
};

const displayDialogue = async(editor) => {
    const elementid = "codepro_" + editor.id;
    const data = {
        elementid: elementid
    };

    // Show modal with buttons.
    const modal = await ModalFactory.create({
            type: CodeProModal.TYPE,
            templateContext: data,
            large: true,
        });
        modal.header.hide();
        modal.footer.show();

        const targetElem = modal.body.find("#codepro_" + editor.id)[0];

        let codeEditor;
        switch (useEditor) {
            case ("codemirror6"):
                require.config({paths:
                    {
                        cm6: baseUrl + '/vendor/codemirror6/dist/editor.bundle'
                    }
                });
                // Load cm6 on demand
                require(['cm6'], function(CodeProEditor) {
                    codeEditor = new CodeProEditor(targetElem);
                    codeEditor.setValue(editor);
                });
                break;
            case ("codemirror5"):
                codeEditor = new CodeMirrorEditor(targetElem, editor);
            break;
            default:
                codeEditor = new MonacoEditor(targetElem, editor);
        }


        await modal.show();

        await codeEditor.create();

        modal.onresize = function() {
            codeEditor.layout();
        };
        modal.footer.find("button.btn").on("click", (evt)=>{
            if (evt.target.classList.contains("btn-primary")) {
               codeEditor.updateChanges();
            }
            modal.hide();
            codeEditor.dispose();
            modal.destroy();
        });
        modal.getRoot().on(ModalEvents.hidden, () => {
            codeEditor.dispose();
            modal.destroy();
        });
};

class CodeMirrorEditor {
    /**
     * @member {HTMLElement} element
     */
    #element;
    #codeEditor;
    #tinyEditor;
    constructor(element, tinyEditor) {
        this.#element = element;
        this.#tinyEditor = tinyEditor;
    }

    async create() {
        const CodeMirror = await this.#lazyLoad();
        this.#codeEditor = new CodeMirror(this.#element, {
            mode: "text/html",
            value: this.#tinyEditor.getContent(),
            lineNumbers: true,
            lineWrapping: true,
            foldGutter: true,
            gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
            extraKeys: {
                    "F6": function(cm) {
                      cm.setOption("fullScreen", !cm.getOption("fullScreen"));
                    },
                    "Esc": function(cm) {
                      if (cm.getOption("fullScreen")) {
                        cm.setOption("fullScreen", false);
                      }
                    },
                    "Ctrl-Q": function(cm){ cm.foldCode(cm.getCursor()); },
                    "Ctrl-Space": "autocomplete",
            }
        });
        this.#codeEditor.foldCode(CodeMirror.Pos(0, 0));
        this.#codeEditor.foldCode(CodeMirror.Pos(34, 0));
    }

    #lazyLoad() {
        // <link rel="stylesheet" href="lib/codemirror.css"></link>
        if (!document.head.querySelector("#codemirror_css")) {
            addCssLink(baseUrl + "/vendor/codemirror5/lib/codemirror.css", "codemirror_css");
            addCssLink(baseUrl + "/vendor/codemirror5/addon/display/fullscreen.css", "codemirror_fullscreen_css");
            addCssLink(baseUrl + "/vendor/codemirror5/addon/fold/foldgutter.css", "codemirror_foldgutter_css");
            addCssLink(baseUrl + "/vendor/codemirror5/addon/hint/show-hint.css", "codemirror_showhint_css");
        }

        return new Promise((resolve)=> {
            if (!window.cm) {
                    require.config({
                        packages: [{
                        name: "codemirror",
                        location: baseUrl + '/vendor/codemirror5',
                        main: "lib/codemirror"
                        }],
                        paths: {
                            codemirror:  baseUrl + '/vendor/codemirror5'
                        }
                    });
                    require(["codemirror/lib/codemirror",
                    "codemirror/mode/htmlmixed/htmlmixed",
                    "codemirror/addon/display/fullscreen",
                    "codemirror/addon/hint/show-hint",
                    "codemirror/addon/hint/html-hint",
                    "codemirror/addon/fold/foldcode",
                    "codemirror/addon/fold/foldgutter",
                    "codemirror/addon/fold/brace-fold"],
                     function(CodeMirror) {
                        console.log("requirejs resolves", CodeMirror);
                        resolve(CodeMirror);
                    });
                } else {
                    resolve(window.cm);
                }
            });

    }

    updateChanges() {
        this.#tinyEditor.setContent(this.#codeEditor.getValue(), {format: 'html'});
    }

    layout() {
        this.#tinyEditor.setSize("100%", "100%");
        this.#tinyEditor.refresh();
    }

    dispose() {
        // Dispose the editor
    }
}


class MonacoEditor {
    /**
     * @member {HTMLElement} element
     */
    #element;
    #codeEditor;
    #tinyEditor;
    constructor(element, tinyEditor) {
        this.#element = element;
        this.#tinyEditor = tinyEditor;
    }

    async create() {
        const monaco = await this.#lazyLoad();
        this.#codeEditor = monaco.editor.create(this.#element, {
            value: this.tinyEditor.getContent(),
            language: 'html',
            automaticLayout: true,
            theme: "vs-light",
        });
    }

    #lazyLoad() {
        return new Promise((resolve)=> {
            if (!window.monaco || !window.MonacoEditorEx) {
                require.config({paths:
                    {
                        vs: baseUrl + '/vendor/monaco-editor/min/vs',
                        tiny_codepro_vsex: baseUrl + '/vendor/monaco-editor-ex'
                    }
                });
                // Load monaco on demand
                require(['tiny_codepro_vsex', 'vs/editor/editor.main'], function(MonacoEditorEx) {
                    console.log("requirejs resolves", window.monaco, monaco, MonacoEditorEx);
                    // Apply extensions into monaco editor
                    MonacoEditorEx.useMonacoEx(window.monaco);
                    resolve(window.monaco);
                });
            } else {
                resolve(window.monaco);
            }
        });
    }

    updateChanges() {
        this.#tinyEditor.setContent(this.#codeEditor.getValue(), {format: 'html'});
    }

    layout() {
        this.#tinyEditor.layout();
    }

    dispose() {
        this.#tinyEditor.dispose();
    }
}

