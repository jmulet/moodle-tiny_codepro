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

import { createModal } from "./modal";
import ModalEvents from 'core/modal_events';
import { getDefaultUI } from "./options";
import { ViewManager } from "./viewmanager";

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
        // Before Tiny loses focus, get its contents and head position
        const docHead = await this.loadDocInfo();
        // Make the modal visible
        this.modal.show();
        this._showSpinner(this.modal.body[0]);
        // Add the codeEditor (CodeMirror) in the selected UI element
        await this.attachCodeEditor(this.modal.body[0], docHead);
        this._hideSpinner(this.modal.body[0]);

        // Update the two-state icons
        if (!this.codeEditor.config.lineWrapping) {
            this.domElements.btnWrap.querySelector('span').innerHTML = ViewManager.icons.rightarrow;
        }
        if (this.codeEditor.config.themeName === 'dark') {
            this.domElements.btnTheme.querySelector('span').innerHTML = ViewManager.icons.moon;
        }
    }

    async _tCreate() {
        const defaultUI = getDefaultUI(this.editor) ?? 'dialog';
        const canuserswitchui = defaultUI.startsWith('user:');

        const data = {
            elementid: Math.random().toString(32).substring(2),
            canuserswitchui,
            icons: ViewManager.icons
        };

        // Show modal with buttons.
        const modal = await createModal({
            templateContext: data,
        });
        this.modal = modal;

        this.codeEditorElement = modal.body[0];

        modal.getRoot().find(".modal-dialog.modal-lg").addClass("tiny_codepro-dlg");
        // Disable keyboard events (ESC key) on this modal
        modal.getRoot().off('keydown');
        // Prevent modal from closing on outside clicks
        modal.getRoot().on(ModalEvents.outsideClick, (evt) => {
            evt.preventDefault();
        });
        modal.body.css({
            'display': 'flex',
            'height': 'calc(90vh - 200px)',
            'flex-grow': '1',
            'overflow': 'hidden',
        });
        // Override styles imposed by body.tox-fullscreen on modals
        modal.header.css({
            'height': '61.46px',
            'padding': '1rem 1rem',
        });

        const modalContent = this.modal.getRoot().find('.modal-content');
        const isDark = this.preferencesSrv.get('theme') === 'dark';
        if (isDark) {
            modalContent.addClass('tiny_codepro-dark');
        } else {
            modalContent.removeClass('tiny_codepro-dark');
        }

        this._bindActions();

        if (this.preferencesSrv.get('fs')) {
            // Set fullscreen mode
            this.modal.header.hide();
            const $dlgElem = this.modal.getRoot().find(dialogQuery);
            $dlgElem.removeClass("modal-dialog modal-lg modal-dialog-scrollable");
            $dlgElem.addClass("tiny_codepro-fullscreen");
        }
    }

    _bindActions() {
        const modalContent = this.modal.getRoot().find('.modal-content')[0];
        // Setting references to Dom elements
        this.domElements = {
            root: modalContent,
            btnTheme: this.modal.footer.find("button.btn[data-action='theme']")[0],
            btnWrap: this.modal.footer.find("button.btn[data-action='wrap']")[0],
        };

        this.modal.footer.find("button.btn[data-action]").on("click", (evt) => {
            const btnElem = evt.currentTarget;
            const actionName = btnElem.dataset.action;
            switch (actionName) {
                case ("view"):
                    this.switchViews();
                    break;
                case ("fs"):
                    this._toggleFullscreen();
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
                    this.prettify(btnElem);
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

    _toggleFullscreen() {
        const $dlgElem = this.modal.getRoot().find(dialogQuery);
        const isFullscreen = this.preferencesSrv.get('fs', false);
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
        this.preferencesSrv.set('fs', !isFullscreen);
    }

    _unbindActions() {
        this.modal.footer.find("button.btn[data-action]").off("click");
    }

    _tClose() {
        this._unbindActions();
        this.modal.destroy();
    }
    _tDestroy() { }
}
