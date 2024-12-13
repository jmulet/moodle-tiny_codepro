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

import {createModal} from "./modal";
import ModalEvents from 'core/modal_events';
import {getPref, setPref} from "./preferences";
import {getDefaultUI} from "./options";
import {blackboard} from "./commands";

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

let isLoading = false;
/**
 * Handle action
 * @param {TinyMCE} editor
 * @param {string} [initialHTML]
 */
export const displayDialogue = async(editor, initialHTML) => {
    if (isLoading) {
        return;
    }
    if (modal === null) {
        isLoading = true;
        modal = await createDialogue(editor);
        isLoading = false;
    }

    // Issue, editor var does not get updated
    // Bind save action to the correct editor
    const $btn = modal.footer.find("button.btn[data-action]");
    $btn.off("click.codepro").on("click.codepro", (evt) => {
        if (evt.target.classList.contains("btn-primary")) {
            // eslint-disable-next-line camelcase
            const updatedCode = codeEditorInstance?.getValue({source_view: true});
            editor.setContent(updatedCode ?? '');
        }
        modal.hide();
        // Delete content
        codeEditorInstance?.setValue();
    });

    if (blackboard.state) {
        codeEditorInstance?.setState(blackboard.state);
        blackboard.state = null;
    } else {
        // Insert caret marker and retrieve html code to pass to CodeMirror
        let html;
        if (initialHTML) {
            html = initialHTML;
        } else {
            const markerNode = document.createElement("SPAN");
            markerNode.innerHTML = '&nbsp;';
            markerNode.classList.add('CmCaReT');
            const currentNode = editor.selection.getStart();
            currentNode.append(markerNode);
            // eslint-disable-next-line camelcase
            html = editor.getContent({source_view: true});
            html = html.replace(/<span\s+class="CmCaReT"([^>]*)>([^<]*)<\/span>/gm, String.fromCharCode(0));
            markerNode.remove();

            if (getPref("prettify")) {
                html = codeEditorInstance?.prettifyCode(html);
            }
        }
        codeEditorInstance?.setValue(html);
    }

    modal.show();
    setTimeout(() => codeEditorInstance?.focus(), 500);
};

/**
 * Loads cm6 on demand (The first load will be delayed a little bit)
 * @returns {Promise<CodeProEditor>}
 */
export const requireCm6Pro = () => {
    return new Promise((resolve) => {
        require(['tiny_codepro/cm6pro-lazy'], (CodeProEditor) => {
            resolve(CodeProEditor);
        });
    });
};

/**
 * Returns the modal instance
 * @param {TinyMCE} editor
 * @returns {Promise<Modal>}
 */
const createDialogue = async(editor) => {

    const defaultUI = getDefaultUI(editor) ?? 'dialog';
    const canUserSwitchUI = defaultUI.startsWith('user:');

    const data = {
        elementid: Math.random().toString(32).substring(2),
        canUserSwitchUI
    };

    // Show modal with buttons.
    const modal = await createModal({
        templateContext: data
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

    const CodeProEditor = await requireCm6Pro();
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
                codeEditorInstance?.setLineWrapping(false);
            } else {
                ds.wrap = true;
                codeEditorInstance?.setLineWrapping(true);
            }
            setPref("wrap", ds.wrap, true);
            toggleClasses(icon, ["fa-exchange", "fa-long-arrow-right"]);
        } else if (ds.prettify !== undefined) {
            codeEditorInstance?.prettify();
        } else if (ds.view !== undefined) {
            // Toggle UI to View panel
            blackboard.state = codeEditorInstance.getState();
            modal.hide();
            editor.execCommand('ToggleView', false, 'codepro');
            setPref("view", 'panel', true);
        }
    });

    modal.getRoot().on(ModalEvents.hidden, () => {
        codeEditorInstance?.setValue();
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
    return modal;
};