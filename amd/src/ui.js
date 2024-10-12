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
import {getPref, setPref} from "./preferences";

/**
 * Tiny CodePro plugin.
 *
 * @module      tiny_codepro/plugin
 * @copyright   2023 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
const dialogQuery = '[role="document"], [data-region="modal"]';
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
export const handleAction = async(editor) => {
    if (modal === null) {
       await createDialogue();
    }

    // Issue, editor var does not get updated
    // Bind save action to the correct editor
    const $btn = modal.footer.find("button.btn[data-action]");
    $btn.off("click.codepro").on("click.codepro", (evt) => {
        if (evt.target.classList.contains("btn-primary")) {
            // eslint-disable-next-line camelcase
            const updatedCode = codeEditorInstance.getValue({source_view: true});
            editor.setContent(updatedCode);
        }
        modal.hide();
        // Delete content
        codeEditorInstance.setValue();
    });

    // eslint-disable-next-line camelcase
    codeEditorInstance.setValue(editor.getContent({source_view: true}));
    modal.show();
    setTimeout(() => codeEditorInstance.focus(), 500);
};

const createDialogue = async() => {
    const data = {
        elementid: Math.random().toString(32).substring(2)
    };

    // Show modal with buttons.
    modal = await ModalFactory.create({
        type: CodeProModal.TYPE,
        templateContext: data,
        large: true
    });
    modal.getRoot().find(".modal-dialog.modal-lg").addClass("tiny_codepro-dlg");
    // Disable keyboard events (ESC key) on this modal
    modal.getRoot().off('keydown');
    // Prevent modal from closing on outside clicks
    modal.getRoot().on(ModalEvents.outsideClick, (evt) => {
        evt.preventDefault();
    });
    modal.body.css("overflow-y", "overlay");
    // Override styles imposed by body.tox-fullscreen on modals
    modal.header.css('height', '61.46px');
    modal.header.css('padding', '1rem 1rem');

    return new Promise((resolve) => {
        // Load cm6 on demand
        require(['tiny_codepro/cm6pro-lazy'], (CodeProEditor) => {
            const targetElem = modal.body.find('.tiny_codepro-editor-area')[0];
            codeEditorInstance = new CodeProEditor(targetElem);

            modal.footer.find("button.btn.btn-light").on("click", (evt) => {
                evt.preventDefault();
                const ds = evt.currentTarget.dataset;
                const icon = evt.currentTarget.querySelector("i.fa");
                const $dlgElem = modal.getRoot().find(dialogQuery);
                if (ds.fs) {
                    if (ds.fs === "false") {
                        // Set fullscreen mode
                        ds.fs = "true";
                        modal.header.hide();
                        $dlgElem.removeClass("modal-dialog modal-lg modal-dialog-scrollable");
                        $dlgElem.addClass("tiny_codepro-fullscreen");
                    } else {
                        // Set to modal-lg
                        ds.fs = "false";
                        modal.header.show();
                        $dlgElem.removeClass("tiny_codepro-fullscreen");
                        $dlgElem.addClass("modal-dialog modal-lg modal-dialog-scrollable");
                    }
                    setPref("fs", ds.fs, true);
                } else if (ds.theme) {
                    if (ds.theme === "light") {
                        ds.theme = "dark";
                        codeEditorInstance.setTheme("dark");
                        $dlgElem.addClass("tiny_codepro-dark");
                    } else {
                        ds.theme = "light";
                        codeEditorInstance.setTheme("light");
                        $dlgElem.removeClass("tiny_codepro-dark");
                    }
                    toggleClasses(icon, ["fa-sun-o", "fa-moon-o"]);
                    setPref("theme", ds.theme, true);
                } else if (ds.wrap) {
                    if (ds.wrap === "true") {
                        ds.wrap = false;
                        codeEditorInstance.setLineWrapping(false);
                    } else {
                        ds.wrap = true;
                        codeEditorInstance.setLineWrapping(true);
                    }
                    setPref("wrap", ds.wrap, true);
                    toggleClasses(icon, ["fa-exchange", "fa-long-arrow-right"]);
                } else if (ds.prettify) {
                    codeEditorInstance.prettify();
                }
            });
            modal.getRoot().on(ModalEvents.hidden, () => {
                codeEditorInstance.setValue();
            });

            // Setting stored preferences
            const currentTheme = getPref("theme", "light");
            const currentWrap = getPref("wrap", "false");
            const currentFs = getPref("fs", "false");
            if (currentTheme !== "light") {
                modal.footer.find("button.btn.btn-light[data-theme]").click();
            }
            if (currentWrap === "true") {
                modal.footer.find("button.btn.btn-light[data-wrap]").click();
            }
            if (currentFs === "true") {
                modal.footer.find("button.btn.btn-light[data-fs]").click();
            }
            resolve(modal);
        });
    });
};