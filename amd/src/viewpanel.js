/* eslint-disable no-console */
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
import {getPref, setPref} from "./preferences";
import {getDefaultUI, isFullscreen} from "./options";
import {ViewManager} from "./viewmanager";

/**
 * Keep track of all active viewPanels in the page.
 * @type {Record<string, ViewManager>}
 **/
const activeViewPanels = new Map();
let submitListenerAction = null;

export class ViewPanelManager extends ViewManager {
    constructor(editor, opts) {
        super(editor, opts);
        this.translations = this.opts.translations ?? [];
        this.isViewCreated = false;
    }

    _tShow() {
        this.editor.execCommand('ToggleView', false, 'codepro');
    }
    _tClose() {
        this.editor.execCommand('ToggleView', false, 'codepro');
    }

    async _tCreate() {
        // Only one instance per editor has to be registered.
        if (this.isViewCreated) {
            return;
        }
        this.isViewCreated = true;
        this.#registerIcons();
        const viewSpec = this.#createViewSpec();
        this.editor.ui.registry.addView("codepro", viewSpec);
    }

    #createUI(api) {
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
            border-color: #86b7fe;
            outline: 0!important;
            box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
            border-radius: 4px;
        }
        .cm-editor {
            height: 100%;
        }`;
        shadowRoot.appendChild(shadowStyles);
        shadowRoot.appendChild(this.codeEditorElement);
    }

    #setButtonsState() {
        // eslint-disable-next-line no-unused-vars
        const [_, __, btnDescreaseFontsize, btnIncreaseFontsize, btnTheme, btnWrap, ___, btnAccept] = this.headerButtonElements;

        // Style issue
        btnDescreaseFontsize.style.marginRight = '0';
        btnIncreaseFontsize.style.marginLeft = '0';

        // Set the toggle state
        const isDark = getPref('theme', 'light') === 'dark';
        const isWrap = getPref('wrap', false);
        btnTheme.querySelector('span').innerHTML = isDark ? ViewManager.icons.moon : ViewManager.icons.sun;
        btnWrap.querySelector('span').innerHTML = isWrap ? ViewManager.icons.exchange : ViewManager.icons.rightarrow;
        if (isDark) {
            this.parentContainer.classList.add('tiny_codepro-dark');
        } else {
            this.parentContainer.classList.remove('tiny_codepro-dark');
        }

        // Style issue
        btnAccept.querySelector('svg').style.marginRight = '5px';

        // Sync fullscreen state
        const isFullscreen = getPref('fs', false);
        const hasClassFS = this.editor.container.classList.contains('tox-fullscreen');
        if ((hasClassFS && !isFullscreen) || (!hasClassFS && isFullscreen)) {
            this.editor.execCommand('mceFullScreen');
        }
    }

    #createViewSpec() {
        const buttonsSpec = this.#createButtons();
        const viewSpec = {
            buttons: buttonsSpec,
            onShow: async(api) => {
                if (!this.codeEditorElement) {
                    // Make sure the UI is created.
                    this.#createUI(api);
                    // Register this panel as active.
                    activeViewPanels.set(this.editor.id, this);
                    // Register a global listener to submit event.
                    // Autosave all editors before submitting the form.
                    const form = this.editor.container?.closest('form');
                    console.log("The form", form, this.editor);
                    if (form && !submitListenerAction) {
                        submitListenerAction = (evt) => {
                            console.log('Calling submit listener action', activeViewPanels);
                            const pendingViewPanels = Array.from(activeViewPanels.values())
                                .filter(vp => vp.pendingChanges);
                            if (pendingViewPanels.length) {
                                evt.preventDefault();
                                console.log('pending view panels', pendingViewPanels);
                                pendingViewPanels.forEach(vp => vp._saveAction());
                                if (form.requestSubmit) {
                                    // TODO: Problem; which of both submit buttons has been clicked????
                                    form.requestSubmit();
                                } else {
                                    form.submit();
                                }
                            }
                            return true;
                        };
                        console.log("Attach submit listener");
                        form.addEventListener('submit', submitListenerAction.bind(this));
                    }
                }

                // Store references to the header buttons to have access from the button actions.
                const container = api.getContainer();
                this.parentContainer = container.parentElement;
                this.headerButtonElements = this.parentContainer.querySelectorAll('.tox-view__header button');

                // Hack to turn regular buttons into toggle ones.
                this.#setButtonsState();
                // Add the codeEditor (CodeMirror) in the selected UI element.
                await this.attachCodeEditor(this.codeEditorElement);
                // Obtain the code from Tiny and set it to code editor.
                this.setHTMLCodeOrState();
                this.pendingChanges = false;
            },
            onHide: () => {}
        };
        return viewSpec;
    }

    #registerIcons() {
        Object.keys(ViewManager.icons).forEach(key => {
            this.editor.ui.registry.addIcon(`tiny_codepro-${key}`, ViewManager.icons[key]);
        });
    }

    #createButtons() {
        const [opendialogStr, fullscreenStr, themesStr, linewrapStr, prettifyStr, decreaseFontsizeStr, increaseFontsizeStr] = this.translations;

        const buttons = [
            {
                type: 'button',
                text: ' ',
                icon: 'tiny_codepro-fullscreen',
                tooltip: fullscreenStr,
                onAction: () => {
                    setPref('fs', !isFullscreen(this.editor), true);
                    this.editor.execCommand('mceFullScreen');
                }
            },
            {
                type: 'button',
                text: '',
                icon: 'tiny_codepro-decreasefontsize',
                tooltip: decreaseFontsizeStr,
                onAction: this.decreaseFontsize.bind(this)
            },
            {
                type: 'button',
                text: '',
                icon: 'tiny_codepro-increasefontsize',
                tooltip: increaseFontsizeStr,
                onAction: this.increaseFontsize.bind(this)
            },
            {
                type: 'button',
                text: ' ',
                icon: 'tiny_codepro-sun',
                tooltip: themesStr,
                onAction: () => {
                    const btnTheme = this.headerButtonElements[4];
                    this.toggleTheme(btnTheme, this.parentContainer);
                }
            },
            {
                type: 'button',
                text: ' ',
                icon: 'tiny_codepro-exchange',
                tooltip: linewrapStr,
                onAction: () => {
                    const btnWrap = this.headerButtonElements[5];
                    this.toggleLineWrapping(btnWrap);
                }
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
                onAction: this.switchViews.bind(this)
            });
        }
        return buttons;
    }
}
