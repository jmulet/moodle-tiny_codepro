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
 * @copyright   2023 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

let modal = null;
let codeEditorInstance = null;

/**
 * Utility to toggle a class in an HTML element
 * @param {HTMLElement} el - The Element
 * @param {string[]} classList
 */
const toggleClasses = function(el, classList) {
    const cl = el.classList;
    classList.forEach(className => {
        cl.toggle(className);
    });
};

/**
 * Handle action
 * @param {TinyMCE} editor
 */
export const handleAction = (editor) => {
    if (modal === null) {
        createDialogue(editor);
    } else {
        modal.show();
        codeEditorInstance.setValue(editor.getContent());
    }
};

const createDialogue = async (editor) => {
    const elementid = "codepro_editorroot";
    const data = {
        elementid: elementid
    };

    // Show modal with buttons.
    modal = await ModalFactory.create({
        type: CodeProModal.TYPE,
        templateContext: data,
        large: true,
    });
    modal.getRoot().find(".modal-dialog.modal-lg").css("max-width", "85%");
    // Disable ESC key on this modal
    modal.getRoot().off('keydown');
    modal.body.css("overflow-y", "overlay");

    // Load cm6 on demand
    require.config({
        paths: {
            cm6pro: baseUrl + '/libs/codemirror/dist/cm6pro.min'
        }
    });
    require(['cm6pro'], (CodeProEditor) => {
        // Setting themes
        const themeSelector = modal.footer.find("select");
        const targetElem = modal.body.find('#' + elementid)[0];

        codeEditorInstance = new CodeProEditor(targetElem);
        themeSelector.on("change", (evt) => {
            codeEditorInstance.setTheme(evt.target.value);
        });
        modal.footer.find("button.btn[data-action]").on("click", (evt) => {
            if (evt.target.classList.contains("btn-primary")) {
                const updatedCode = codeEditorInstance.getValue();
                editor.setContent(updatedCode);
            }
            modal.hide();
            // Delete content
            codeEditorInstance.setValue();
        });
        modal.footer.find("button.btn.btn-light").on("click", (evt) => {
            evt.preventDefault();
            const ds = evt.currentTarget.dataset;
            const icon = evt.currentTarget.querySelector("i.fa");
            if (ds.fs) {
                if (ds.fs === "false") {
                    // Set fullscreen mode
                    ds.fs = "true";
                    modal.header.hide();
                    modal.getRoot().find('[role="document"]').removeClass("modal-dialog modal-lg modal-dialog-scrollable");
                    modal.getRoot().find('[role="document"]').addClass("tiny_codepro-fullscreen");
                } else {
                    // Set to modal-lg
                    ds.fs = "false";
                    modal.header.show();
                    modal.getRoot().find('[role="document"]').removeClass("tiny_codepro-fullscreen");
                    modal.getRoot().find('[role="document"]').addClass("modal-dialog modal-lg modal-dialog-scrollable");
                }
            } else if (ds.theme) {
                if (ds.theme === "light") {
                    ds.theme = "dark";
                    codeEditorInstance.setTheme("dark");
                    modal.getRoot().find('[role="document"]').addClass("tiny_codepro-dark");
                } else {
                    ds.theme = "light";
                    codeEditorInstance.setTheme("light");
                    modal.getRoot().find('[role="document"]').removeClass("tiny_codepro-dark");
                }
                toggleClasses(icon, ["fa-sun-o", "fa-moon-o"]);
            } else if (ds.wrap) {
                if (ds.wrap === "true") {
                    ds.wrap = false;
                    codeEditorInstance.setLineWrapping(false);
                } else {
                    ds.wrap = true;
                    codeEditorInstance.setLineWrapping(true);
                }
                toggleClasses(icon, ["fa-exchange", "fa-long-arrow-right"]);
            }
        });
        modal.getRoot().on(ModalEvents.hidden, () => {
            codeEditorInstance.setValue();
        });

        modal.show();
        codeEditorInstance.setValue(editor.getContent());
    });
};