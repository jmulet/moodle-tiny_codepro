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
const HARDCODED_HEIGHT = '350px';
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
        this._registerIcons();
        const viewSpec = this._createViewSpec();
        this.editor.ui.registry.addView("codepro", viewSpec);
    }

    _createUI(api) {
        const container = api.getContainer();
        container.classList.add('tiny_codepro-view__pane');
        const shadowRoot = container.attachShadow({mode: "open"});
        const shadowStyles = document.createElement('style');
        shadowStyles.textContent = `
        .cm-editor.cm-focused {
            border-color: #86b7fe;
            outline: 0!important;
            box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
            border-radius: 4px;
        }
        .cm-editor {
            height: 100%;
            width: 100%;
        }
        .cm-scroller {
            overscroll-behavior: contain;
        }
        .tiny_codepro-loader {
            position: absolute;
            z-index: 100;
            top: 50%;
            left: 50%;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background-color: #999;
            box-shadow: 32px 0 #999, -32px 0 #999;
            animation: tiny_codepro-flash 0.5s ease-out infinite alternate;
        }
        @keyframes tiny_codepro-flash {
            0% {
            background-color: #FFF2;
            box-shadow: 32px 0 #FFF2, -32px 0 #999;
            }
            50% {
            background-color: #999;
            box-shadow: 32px 0 #FFF2, -32px 0 #FFF2;
            }
            100% {
            background-color: #FFF2;
            box-shadow: 32px 0 #999, -32px 0 #FFF2;
            }
        }`;
        shadowRoot.appendChild(shadowStyles);
        this.codeEditorElement = shadowRoot;
    }

    _setButtonsState() {
        // eslint-disable-next-line no-unused-vars
        const {btnDescreaseFontsize, btnIncreaseFontsize, btnTheme, btnAccept} = this.domElements;

        // Style issue
        btnDescreaseFontsize.style.marginRight = '0';
        btnIncreaseFontsize.style.marginLeft = '0';

        // Set the toggle state
        const isDark = getPref('theme', 'light') === 'dark';
        ViewManager.safeInnerHTML(btnTheme, 'span', isDark ? ViewManager.icons.moon : ViewManager.icons.sun);

        if (isDark) {
            this.parentContainer.classList.add('tiny_codepro-dark');
        } else {
            this.parentContainer.classList.remove('tiny_codepro-dark');
        }

        // Style issue
        const btnAcceptSvg = btnAccept?.querySelector('svg');
        if (btnAcceptSvg) {
            btnAcceptSvg.style.marginRight = '5px';
        }

        // Sync fullscreen state
        const isFS = getPref('fs', false);
        if (isFS) {
            this.domElements.btnWrap.style.display = 'initial';
            if (this.parentContainer) {
                this.parentContainer.style.height = '';
            }
        } else {
            // Unable linewrapping if not in fullscreen
            this.domElements.btnWrap.style.display = 'none';
            // Set a hardcoded height
            if (this.parentContainer) {
                this.parentContainer.style.height = HARDCODED_HEIGHT;
            }
        }
        const hasClassFS = this.editor.container.classList.contains('tox-fullscreen');
        if ((hasClassFS && !isFS) || (!hasClassFS && isFS)) {
            this.editor.execCommand('mceFullScreen');
        }
    }

    _createViewSpec() {
        const buttonsSpec = this._createButtons();
        const viewSpec = {
            buttons: buttonsSpec,
            onShow: async(api) => {
                if (!this.codeEditorElement) {
                    // Make sure the UI is created.
                    this._createUI(api);
                    // Register this panel as active.
                    activeViewPanels.set(this.editor.id, this);
                    // Register a global listener to submit event.
                    // Autosave all editors before submitting the form.
                    const form = this.editor.container?.closest('form');
                    if (form && !submitListenerAction) {
                        submitListenerAction = (evt) => {
                            const pendingViewPanels = Array.from(activeViewPanels.values())
                                .filter(vp => vp.pendingChanges);
                            if (pendingViewPanels.length) {
                                evt.preventDefault();
                                pendingViewPanels.forEach(viewPanel => viewPanel._saveAction());
                                setTimeout(() => {
                                    if (form.requestSubmit) {
                                        form.requestSubmit(evt.submitter);
                                    } else {
                                        evt.submitter?.click();
                                    }
                                }, 0);
                            }
                        };
                        form.addEventListener('submit', submitListenerAction);
                    }
                }

                // Store references to the header buttons to have access from the button actions.
                const container = api.getContainer();
                this.parentContainer = container.parentElement;

                const headerButtonElements = this.parentContainer?.querySelectorAll('.tox-view__header button') ?? [];
                // Convert NodeList to an array for easier reverse access
                const buttonsArray = Array.from(headerButtonElements);
                const bLen = buttonsArray.length;

                this.domElements = {
                    root: this.parentContainer,
                    btnDescreaseFontsize: buttonsArray[bLen - 6],
                    btnIncreaseFontsize: buttonsArray[bLen - 5],
                    btnTheme: buttonsArray[bLen - 4],
                    btnWrap: buttonsArray[bLen - 3],
                    btnAccept: buttonsArray[bLen - 1],
                };

                // Hack to turn regular buttons into toggle ones.
                this._setButtonsState();
                this._showSpinner(this.codeEditorElement);
                // Add the codeEditor (CodeMirror) in the selected UI element.
                await this.attachCodeEditor(this.codeEditorElement);
                this._hideSpinner(this.codeEditorElement);
            },
            onHide: () => {
                // Remove hardcoded height
                if (this.parentContainer) {
                    this.parentContainer.style.height = '';
                }
            }
        };
        return viewSpec;
    }

    _registerIcons() {
        Object.keys(ViewManager.icons).forEach(key => {
            this.editor.ui.registry.addIcon(`tiny_codepro-${key}`, ViewManager.icons[key]);
        });
    }

    _createButtons() {
        // eslint-disable-next-line no-unused-vars
        const [opendialogStr, fullscreenStr, themesStr, linewrapStr, prettifyStr, decreaseFontsizeStr, increaseFontsizeStr] = this.translations;

        const buttons = [
            {
                type: 'button',
                text: ' ',
                icon: 'tiny_codepro-fullscreen',
                tooltip: fullscreenStr,
                onAction: () => {
                    const isFS = !isFullscreen(this.editor);
                    if (isFS) {
                        this.domElements.btnWrap.style.display = 'initial';
                        if (this.parentContainer) {
                            this.parentContainer.style.height = '';
                        }
                    } else {
                        // Unable linewrapping if not in fullscreen.
                        this.domElements.btnWrap.style.display = 'none';
                        // Set a hardcoded height.
                        if (this.parentContainer) {
                            this.parentContainer.style.height = HARDCODED_HEIGHT;
                        }
                        // Always show with linewrapping on
                        if (!this.codeEditor._config.lineWrapping) {
                            this.toggleLineWrapping();
                        }
                    }
                    setPref('fs', isFS);
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
                onAction: this.toggleTheme.bind(this)
            },
            // Linewrapping causes problems in panel view
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
        const canuserswitchui = defaultUI.startsWith('user:');
        if (canuserswitchui) {
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
