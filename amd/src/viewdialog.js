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

import {createModal} from "./modal";
import ModalEvents from 'core/modal_events';
import {getPref, setPref} from "./preferences";
import {getDefaultUI, isAutoFormatHTML, isSyncCaret} from "./options";
import {blackboard, requireCm6Pro} from "./commands";
import {MARKER} from "./common";

/**
 * Tiny CodePro plugin.
 *
 * @module      tiny_codepro/plugin
 * @copyright   2023-2025 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
const dialogQuery = '[role="document"], [data-region="modal"]';

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
 * Shows the dialog
 * @param {TinyMCE} editor
 */
export const showDialog = async(editor) => {
    if (isLoading) {
        return;
    }
    isLoading = true;
    const {modal, codeEditorInstance} = await createDialog(editor);
    isLoading = false;

    if (blackboard.state) {
        codeEditorInstance?.setState(blackboard.state);
        blackboard.state = null;
    } else {
        let html;
        const syncCaret = isSyncCaret(editor);
        let markerNode;
        if (syncCaret) {
            markerNode = document.createElement("SPAN");
            markerNode.innerHTML = '&nbsp;';
            markerNode.classList.add('CmCaReT');
            const currentNode = editor.selection.getStart();
            currentNode.append(markerNode);
        }
        // eslint-disable-next-line camelcase
        html = editor.getContent({source_view: true});
        if (syncCaret) {
            html = html.replace(/<span\s+class="CmCaReT"([^>]*)>([^<]*)<\/span>/gm, MARKER);
            markerNode.remove();
        }

        // According to global preference prettify code when opening the editor
        if (isAutoFormatHTML(editor)) {
            html = codeEditorInstance?.prettifyCode(html);
        }

        codeEditorInstance?.setValue(html);
    }

    modal.show();
    setTimeout(() => codeEditorInstance?.focus(), 500);
};

/**
 * Returns the modal instance
 * @param {TinyMCE} editor
 * @returns {Promise<{modal: Modal, codeEditorInstance: *}>}
 */
const createDialog = async(editor) => {
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

    // TODO, it may take some time the first run. Show a spinner!!!
    const CodeProEditor = await requireCm6Pro();
    // Remove spinner

    const targetElem = modal.body.find('.tiny_codepro-editor-area')[0];
    const codeEditorInstance = new CodeProEditor(targetElem);

    // Issue, editor var does not get updated
    // Bind save action to the correct editor
    modal.footer.find("button.btn[data-action]").on("click", (evt) => {
        if (evt.target.classList.contains("btn-primary")) {
            const shouldSyncCaret = isSyncCaret(editor);
            const htmlWithMarker = codeEditorInstance.getValue(shouldSyncCaret)
                .replace(MARKER, '<span class="CmCaReT">&nbsp;</span>');
            // Do it in a transaction
            editor.focus();
            editor.undoManager.transact(() => {
                editor.setContent(htmlWithMarker ?? '');
            });

            // After showing the Tiny editor, the scroll position is lost
            // Restore scroll position
            console.log("Restore cursor");
            const currentNode = editor.dom.select('span.CmCaReT')[0];
            if (!currentNode) {
                // Simply set the previous scroll position if selected node is not found
                const previousScroll = blackboard.scrolls[editor.id];
                editor.contentWindow.scrollTo(0, previousScroll);
            } else {
                // Scroll the iframe's contentWindow until the currentNode is visible
                editor.selection.setCursorLocation(currentNode, 0);
                editor.selection.collapse();
                const iframeHeight = editor.container.querySelector('iframe').clientHeight;
                const scrollPos = Math.max(currentNode.offsetTop - 0.5 * iframeHeight, 0);
                editor.contentWindow.scrollTo(0, scrollPos);
                currentNode.remove();
            }
            editor.nodeChanged();
        }
        modal.hide();
    });

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
            blackboard.state = codeEditorInstance.getState();
            // Destroy modal
            modal.hide();
            // Set user preference
            setPref('view', 'panel', true);
            // Call the action again
            editor.execCommand('mceCodeProEditor', false);
        }
    });

    modal.getRoot().on(ModalEvents.hidden, () => {
        // Get rid of the codeEditor and the modal itself
        codeEditorInstance?.destroy();
        modal?.destroy();
    });

    // Setting stored preferences
    const currentTheme = getPref("theme", "light");
    const currentWrap = getPref("wrap", "true");
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
    return {modal, codeEditorInstance};
};