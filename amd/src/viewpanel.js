/* eslint-disable max-len */
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

/**
 * Tiny CodePro plugin.
 *
 * @module      tiny_codepro/plugin
 * @copyright   2023-2025 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {setPref} from "./preferences";
import {getDefaultUI, isFullscreen} from "./options";
import {ViewManager} from "./viewmanager";


export class ViewDialogManager extends ViewManager {
    constructor(editor, opts) {
        super(editor, opts);
        this.translations = this.opts.translations ?? [];
    }

    _tShow() {
        this.editor.execCommand('ToggleView', false, 'codepro');
    }
    _tClose() {
        this.editor.execCommand('ToggleView', false, 'codepro');
    }

    _tCreate() {
        this.#registerIcons();
        const viewSpec = this.#createViewSpec();
        this.editor.ui.addView("codepro", viewSpec);
    }

    #createViewSpec() {
        const buttonsSpec = this.#createButtons();
        const viewSpec = {
            buttons: buttonsSpec,
            onShow: async(api) => {
                if (!this.codeEditorElement) {
                    this.codeEditorElement = document.createElement("DIV");
                    const container = api.getContainer();
                    container.classList.add('tiny_codepro-view__pane');
                    const shadowRoot = container.attachShadow({mode: "open"});
                    this.codeEditorElement.classList.add('tiny_codepro-container');
                    const shadowStyles = document.createElement('style');
                    shadowStyles.textContent = `
                    .tiny_codepro-container {
                        height: 100%;
                    }
                    .cm-editor.cm-focused {
                        outline: none!important;
                    }
                    .cm-editor {
                        height: 100%;
                    }`;
                    shadowRoot.appendChild(shadowStyles);
                    shadowRoot.appendChild(this.codeEditorElement);
                }
                // Add the codeEditor (CodeMirror) in the selected UI element
                this.attachCodeEditor(this.codeEditorElement);
                // Obtain the code from Tiny and set it to code editor
                this.setHTMLCodeOrState();
            },
            onHide: () => {}
        };
        return viewSpec;
    }

    #registerIcons() {
        Object.keys(ViewManager.icons).forEach(key => {
            this.editor.ui.registry.addIcon(`tiny_codepro-${key}`, ViewDialogManager.icons[key]);
        });
    }

    #createButtons() {
        const [opendialogStr, fullscreenStr, themesStr, linewrapStr, prettifyStr, decreaseFontsizeStr, increaseFontsizeStr] = this.translations;

        const buttons = [
            {
                type: 'button',
                text: ' ',
                icon: 'fullscreen',
                tooltip: fullscreenStr,
                onAction: () => {
                    setPref('fs', !isFullscreen(this.editor) + '', true);
                    this.editor.execCommand('mceFullScreen');
                }
            },
            {
                type: 'button',
                text: '',
                icon: 'text-size-decrease',
                tooltip: decreaseFontsizeStr,
                onAction: this.decreaseFontsize.bind(this)
            },
            {
                type: 'button',
                text: '',
                icon: 'text-size-increase',
                tooltip: increaseFontsizeStr,
                onAction: this.increaseFontsize.bind(this)
            },
            {
                type: 'button',
                text: ' ',
                icon: 'tiny_codepro-sun',
                tooltip: themesStr,
                onAction: this.toggleTheme.bind(this)
            },
            {
                type: 'button',
                text: ' ',
                icon: 'tiny_codepro-exchange',
                tooltip: linewrapStr,
                onAction: this.toggleLineWrapping.bind(this)
            },
            {
                type: 'button',
                text: ' ',
                icon: 'tiny_codepro-magic',
                tooltip: prettifyStr,
                onAction: this.prettify.bind(this)
            },
            {
                type: 'button',
                text: ' tinyMCE',
                icon: 'tiny_codepro-tinymce',
                buttonType: 'primary',
                onAction: this.accept.bind(this)
            },
        ];

        // If user is allowed to switch views, add the button
        const defaultUI = getDefaultUI(this.editor) ?? 'dialog';
        const canUserSwitchUI = defaultUI.startsWith('user:');
        if (canUserSwitchUI) {
            buttons.unshift({
                type: 'button',
                text: ' ',
                icon: 'tiny_codepro-eye',
                tooltip: opendialogStr,
                onAction: this.switchUI.bind(this)
            });
        }
        return buttons;
    }
}
