/* eslint-disable camelcase */
/* eslint-disable max-len */
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

/**
 * Tiny CodePro plugin.
 *
 * @module      tiny_codepro/plugin
 * @copyright   2023-2025 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {getPref, setPref} from "./preferences";
import {isAutoFormatHTML, getDefaultUI, isSyncCaret} from "./options";
import {blackboard, requireCm6Pro} from "./commands";
import {MARKER} from "./common";

/**
 * @param {*} editor
 * @param {string[]} translations
 * @returns
 */
export function createView(editor, translations) {
    const [opendialogStr, fullscreenStr, themesStr, linewrapStr, prettifyStr] = translations;

    editor.ui.registry.addIcon('tiny_codepro-tinymce', '<svg xmlns="http://www.w3.org/2000/svg" height="21" width="21" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 940.6 959.5"><path d="M621.6 0c159.9.9 317.9 133.8 317.9 327.5 0 0 1 49.2 1.1 108.8v24.9c0 11.2-.1 22.5-.2 33.8l-.2 16.9c-.7 47.6-2.4 91.9-5.8 114.9-22.2 148-132.7 250.2-285 276.2-137.3 26.8-218.7 42.3-245 47.5-11.3 2.4-61.1 9-82.7 9C154.3 959.5 2.4 834.1 0 632v-33.3l.1-5.7v-12.4c0-21.8.1-48.5.2-76l.1-16.5c.2-52.5.7-104.9 1.5-129C7.6 211.6 109.6 92.4 303.8 54.2L551.1 6.1C573.7 1.9 598.6 0 621.6 0z" fill="#0c132c"/><path d="M733.5 538.7l-150.4 29.2v147l-376.2 73V421.2l150.4-29.1v219.6l225.8-43.8V348.3l-225.8 43.8V245l376.2-73z" fill="#fff" fill-rule="evenodd"/></svg>');
    editor.ui.registry.addIcon('tiny_codepro-sun', '<svg xmlns="http://www.w3.org/2000/svg" height="21" width="21" viewBox="0 0 512 512"><path d="M256 160c-52.9 0-96 43.1-96 96s43.1 96 96 96 96-43.1 96-96-43.1-96-96-96zm246.4 80.5l-94.7-47.3 33.5-100.4c4.5-13.6-8.4-26.5-21.9-21.9l-100.4 33.5-47.4-94.8c-6.4-12.8-24.6-12.8-31 0l-47.3 94.7L92.7 70.8c-13.6-4.5-26.5 8.4-21.9 21.9l33.5 100.4-94.7 47.4c-12.8 6.4-12.8 24.6 0 31l94.7 47.3-33.5 100.5c-4.5 13.6 8.4 26.5 21.9 21.9l100.4-33.5 47.3 94.7c6.4 12.8 24.6 12.8 31 0l47.3-94.7 100.4 33.5c13.6 4.5 26.5-8.4 21.9-21.9l-33.5-100.4 94.7-47.3c13-6.5 13-24.7 .2-31.1zm-155.9 106c-49.9 49.9-131.1 49.9-181 0-49.9-49.9-49.9-131.1 0-181 49.9-49.9 131.1-49.9 181 0 49.9 49.9 49.9 131.1 0 181z"/></svg>');
    editor.ui.registry.addIcon('tiny_codepro-moon', '<svg xmlns="http://www.w3.org/2000/svg" height="21" width="21" viewBox="0 0 512 512"><path d="M283.2 512c79 0 151.1-35.9 198.9-94.8 7.1-8.7-.6-21.4-11.6-19.4-124.2 23.7-238.3-71.6-238.3-197 0-72.2 38.7-138.6 101.5-174.4 9.7-5.5 7.3-20.2-3.8-22.2A258.2 258.2 0 0 0 283.2 0c-141.3 0-256 114.5-256 256 0 141.3 114.5 256 256 256z"/></svg></svg>');
    editor.ui.registry.addIcon('tiny_codepro-magic', '<svg xmlns="http://www.w3.org/2000/svg" height="21" width="21" viewBox="0 0 512 512"><path d="M224 96l16-32 32-16-32-16-16-32-16 32-32 16 32 16 16 32zM80 160l26.7-53.3L160 80l-53.3-26.7L80 0 53.3 53.3 0 80l53.3 26.7L80 160zm352 128l-26.7 53.3L352 368l53.3 26.7L432 448l26.7-53.3L512 368l-53.3-26.7L432 288zm70.6-193.8L417.8 9.4C411.5 3.1 403.3 0 395.2 0c-8.2 0-16.4 3.1-22.6 9.4L9.4 372.5c-12.5 12.5-12.5 32.8 0 45.3l84.9 84.9c6.3 6.3 14.4 9.4 22.6 9.4 8.2 0 16.4-3.1 22.6-9.4l363.1-363.2c12.5-12.5 12.5-32.8 0-45.2zM359.5 203.5l-50.9-50.9 86.6-86.6 50.9 50.9-86.6 86.6z"/></svg>');
    editor.ui.registry.addIcon('tiny_codepro-exchange', '<svg xmlns="http://www.w3.org/2000/svg" height="21" width="21" viewBox="0 0 512 512"><path d="M0 168v-16c0-13.3 10.7-24 24-24h360V80c0-21.4 25.9-32 41-17l80 80c9.4 9.4 9.4 24.6 0 33.9l-80 80C410 272 384 261.5 384 240v-48H24c-13.3 0-24-10.7-24-24zm488 152H128v-48c0-21.3-25.9-32.1-41-17l-80 80c-9.4 9.4-9.4 24.6 0 33.9l80 80C102.1 464 128 453.4 128 432v-48h360c13.3 0 24-10.7 24-24v-16c0-13.3-10.7-24-24-24z"/></svg>');
    editor.ui.registry.addIcon('tiny_codepro-arrowright', '<svg xmlns="http://www.w3.org/2000/svg" height="21" width="21" viewBox="0 0 512 512"><path d="M313.9 216H12c-6.6 0-12 5.4-12 12v56c0 6.6 5.4 12 12 12h301.9v46.1c0 21.4 25.9 32.1 41 17l86.1-86.1c9.4-9.4 9.4-24.6 0-33.9l-86.1-86.1c-15.1-15.1-41-4.4-41 17V216z"/></svg>');
    editor.ui.registry.addIcon('tiny_codepro-eye', '<svg xmlns="http://www.w3.org/2000/svg" height="21" width="21" viewBox="0 0 560 512"><path d="M572.5 241.4C518.3 135.6 410.9 64 288 64S57.7 135.6 3.5 241.4a32.4 32.4 0 0 0 0 29.2C57.7 376.4 165.1 448 288 448s230.3-71.6 284.5-177.4a32.4 32.4 0 0 0 0-29.2zM288 400a144 144 0 1 1 144-144 143.9 143.9 0 0 1 -144 144zm0-240a95.3 95.3 0 0 0 -25.3 3.8 47.9 47.9 0 0 1 -66.9 66.9A95.8 95.8 0 1 0 288 160z"/></svg>');

    let codeEditorElement;
    let codeEditorInstance;

    /**
     * @param {string} codeContent - HTML code
     * @returns
     */
    const autoSaveAction = (codeContent) => {
        if (!codeEditorInstance) {
            return;
        }
        console.log("Autosave");
        // Do it in a transaction
        editor.focus();
        editor.undoManager.transact(() => {
            editor.setContent(codeContent);
        });
    };

    const buttons = [
        {
            type: 'button',
            text: ' ',
            icon: 'fullscreen',
            tooltip: fullscreenStr,
            onAction: () => {
                editor.execCommand('mceFullScreen');
            }
        },
        {
            type: 'togglebutton',
            text: ' ',
            icon: 'tiny_codepro-sun',
            tooltip: themesStr,
            onAction: (api) => {
                if (!codeEditorInstance) {
                    return;
                }
                const isDark = api.isActive();
                api.setActive(!isDark);
                api.setIcon(isDark ? 'tiny_codepro-sun' : 'tiny_codepro-moon');
                const theme = isDark ? 'light' : 'dark';
                codeEditorInstance.setTheme(theme);
                setPref("theme", theme, true);
            },
            onSetup: (api) => {
                // According to user preferences set the correct theme on startup
                const currentTheme = getPref("theme", "light");
                const isDark = currentTheme === "dark";
                api.setActive(isDark);
                api.setIcon(isDark ? 'tiny_codepro-sun' : 'tiny_codepro-moon');
            }
        },
        // Disabling line wrapping is problematic in view mode
        {
            type: 'togglebutton',
            text: ' ',
            icon: 'tiny_codepro-exchange',
            tooltip: linewrapStr,
            onAction: (api) => {
                if (!codeEditorInstance) {
                    return;
                }
                const isWrap = api.isActive();
                api.setActive(isWrap);
                api.setIcon(isWrap ? 'tiny_codepro-exchange' : 'tiny_codepro-arrowright');
                codeEditorInstance.setLineWrapping(isWrap);
                setPref("wrap", isWrap + '', true);
            },
            onSetup: (api) => {
                // According to user preferences set the correct wrap setting
                const isWrap = getPref("wrap", "true") === "true";
                api.setActive(isWrap);
                api.setIcon(isWrap ? 'tiny_codepro-arrowright' : 'tiny_codepro-exchange');
            }
        },
        {
            type: 'button',
            text: ' ',
            icon: 'tiny_codepro-magic',
            tooltip: prettifyStr,
            onAction: () => {
                codeEditorInstance?.prettify();
            }
        },
        {
            type: 'button',
            text: ' tinyMCE',
            icon: 'tiny_codepro-tinymce',
            buttonType: 'primary',
            onAction: () => {
                console.log("onAction");
                const shouldSyncCaret = isSyncCaret(editor);
                const htmlWithMarker = codeEditorInstance.getValue(shouldSyncCaret)
                    .replace(MARKER, '<span class="CmCaReT">&nbsp;</span>');
                autoSaveAction(htmlWithMarker);

                editor.execCommand('ToggleView', false, 'codepro');
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
        },
    ];

    // If user is allowed to switch views
    const defaultUI = getDefaultUI(editor) ?? 'dialog';
    const canUserSwitchUI = defaultUI.startsWith('user:');
    if (canUserSwitchUI) {
        buttons.unshift({
            type: 'button',
            text: ' ',
            icon: 'tiny_codepro-eye',
            tooltip: opendialogStr,
            onAction: () => {
                blackboard.state = codeEditorInstance.getState();
                // Hide the view panel
                editor.execCommand('ToggleView', false, 'codepro');
                // Set user preference
                setPref('view', 'dialog', true);
                // Call the action again
                editor.execCommand('mceCodeProEditor', false);
            }
        });
    }

    return {
        buttons,
        onShow: async(api) => {
            if (!codeEditorElement) {
                const container = api.getContainer();
                container.classList.add('tiny_codepro-view__pane');
                const shadowRoot = container.attachShadow({mode: "open"});
                codeEditorElement = document.createElement("DIV");
                codeEditorElement.classList.add('tiny_codepro-container');

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
                shadowRoot.appendChild(codeEditorElement);
            }

            const CodeProEditor = await requireCm6Pro();
            const opts = {
                changesListener: () => {
                    const html = codeEditorInstance.getValue();
                    autoSaveAction(html);
                }
            };
            codeEditorInstance = new CodeProEditor(codeEditorElement, opts);

            if (blackboard.state) {
                // Restore state from the another view
                codeEditorInstance.setState(blackboard.state);
                blackboard.state = null;
            } else {
                const syncCaret = isSyncCaret(editor);
                let markerNode;
                if (syncCaret) {
                    // Insert caret marker and retrieve html code to pass to CodeMirror
                    markerNode = document.createElement("SPAN");
                    markerNode.innerHTML = '&nbsp;';
                    markerNode.classList.add('CmCaReT');
                    const currentNode = editor.selection.getStart();
                    currentNode.append(markerNode);
                }
                let html = editor.getContent({source_view: true});
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
        },
        onHide: () => {
            codeEditorInstance?.destroy();
        }
    };
}