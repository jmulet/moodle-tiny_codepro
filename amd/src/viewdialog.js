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
import {ViewManager} from "./viewmanager";

/**
 * Tiny CodePro plugin.
 *
 * @module      tiny_codepro/plugin
 * @copyright   2023-2025 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
const dialogQuery = '[role="document"], [data-region="modal"]';

export class ViewDialogManager extends ViewManager {
    constructor(editor, opts) {
        super(editor, opts);
    }
    async _tShow() {
        this.modal.show();
    }

    async _tCreate() {
        const defaultUI = getDefaultUI(this.editor) ?? 'dialog';
        const canUserSwitchUI = defaultUI.startsWith('user:');

        const data = {
            elementid: Math.random().toString(32).substring(2),
            canUserSwitchUI
        };

        // Show modal with buttons.
        const modal = await createModal({
            templateContext: data,
            icons: ViewManager.icons
        });
        this.modal = modal;

        this.codeEditorElement = modal.body.find('.tiny_codepro-editor-area')[0];

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

        this.#bindActions();
    }

    #bindActions() {
        this.modal.footer.find("button.btn[data-action]").on("click", (evt) => {
            const actionName = evt.target.dataset.action;
            switch (actionName) {
                case ("view"):
                    this.switchView();
                    break;
                case ("fs"):
                    this.#toggleFullscreen();
                    break;
                case ("font-"):
                    this.decreaseFontsize();
                    break;
                case ("font+"):
                    this.increaseFontsize();
                    break;
                case ("theme"):
                    this.toggleTheme();
                    break;
                case ("wrap"):
                    this.toggleLineWrapping();
                    break;
                case ("prettify"):
                    this.prettify();
                    break;
                case ("cancel"):
                    this.close();
                    break;
                case ("save"):
                    this.accept();
                    break;
            }
        });
    }

    #toggleFullscreen() {
        const $dlgElem = this.modal.getRoot().find(dialogQuery);
        const isFullscreen = getPref("fs", "false") === "true";
        if (!isFullscreen) {
            // Set fullscreen mode
            this.modal.header.hide();
            $dlgElem.removeClass("modal-dialog modal-lg modal-dialog-scrollable");
            $dlgElem.addClass("tiny_codepro-fullscreen");
        } else {
            // Set to modal-lg
            this.modal.header.show();
            $dlgElem.removeClass("tiny_codepro-fullscreen");
            $dlgElem.addClass("modal-dialog modal-lg modal-dialog-scrollable");
        }
        setPref("fs", !isFullscreen, true);
    }

    #unbindActions() {
        this.modal.footer.find("button.btn[data-action]").off("click");
    }

    _tClose() {
        this.#unbindActions();
        this.modal.destroy();
    }
}