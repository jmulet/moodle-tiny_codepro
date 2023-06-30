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

/**
 * Tiny CodePro plugin.
 *
 * @module      tiny_codepro/plugin
 * @copyright   2023 Josep Mulet Pol <pmulet@iedib.net>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Handle action
 * @param {TinyMCE} editor
 */
export const handleAction = (editor) => {
    // TODO: Load components here
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
        console.log("The root of modal", modal, modal.getRoot());
        modal.getRoot().find('div.modal-dialog').css({
            maxWidth: '100%',
            margin: 0
        });
        // modal.getRoot().find('div.modal-footer').removeClass("hidden");
        modal.footer.show();

    // Need to load extension of Monaco
    if (!window.MonacoEditorEx) {
        const monacoexScript = document.createElement("script");
        monacoexScript.src = baseUrl + '/assets/monaco-editor-ex.js';
        monacoexScript.onload = () => onLazyLoadMonaco(editor, modal);
        document.querySelector("head").appendChild(monacoexScript);
    } else {
        onLazyLoadMonaco(editor, modal);
    }
};

const onLazyLoadMonaco = function(editor, modal) {

    // initialize the editor
    require.config({paths: {
        vs: baseUrl + '/assets/monaco-editor/min/vs'
        }
    });
    require(['vs/editor/editor.main'], function() {
        MonacoEditorEx.useMonacoEx(monaco);
        modal.show();
        setTimeout(() => {
                console.log("creant l'editor ara");
                const vseditor = monaco.editor.create(document.getElementById("codepro_" + editor.id), {
                    value: editor.getContent(),
                    language: 'html',
                    automaticLayout: true,
                    theme: "vs-light",
                });
            modal.onresize = function() {
                vseditor.layout();
            };
            modal.getRoot().find("button.btn").on("click", (evt)=>{
                if (evt.target.classList.contains("btn-primary")) {
                    const newContent = vseditor.getValue();
                    console.log(newContent);
                    editor.setContent(newContent, {format: 'html'});
                }
                modal.hide();
                vseditor.getModel().dispose();
                modal.destroy();
            });
            modal.getRoot().on(ModalEvents.hidden, () => {
                vseditor.getModel().dispose();
                modal.destroy();
            });
        }, 500);

    });

};
