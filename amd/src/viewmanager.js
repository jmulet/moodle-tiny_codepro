/* eslint-disable no-console */
/* eslint-disable camelcase */
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

import { getPreferencesSrv } from "./preferences";
import { getSyncCaret, isAutoFormatHTML } from "./options";
import { MARKER, TINY_MARKER_CLASS } from "./common";

/**
 * Share the state among editor Views
 * @type {*}
 **/
export const blackboard = {
    scrolls: {}
};

let _CodeProEditor = null;
/**
 * Loads cm6 on demand (The first load will be delayed a little bit)
 * @returns {Promise<CodeProEditor>}
 */
const requireCm6Pro = () => {
    if (_CodeProEditor) {
        return Promise.resolve(_CodeProEditor);
    }
    return new Promise((resolve) => {
        window.require(['tiny_codepro/cm6pro-lazy'], (CodeProEditor) => {
            _CodeProEditor = CodeProEditor;
            resolve(CodeProEditor);
        });
    });
};

/**
 * @type {((str: string) => string) | null}
 */
let _htmlFormatter = null;
/**
 * Loads HTML formatter on demand  (The first load will be delayed a little bit).
 * To avoid loading multiple formatters, take advantge of that shipped with tiny_html plugin.
 * If this plugin is not available, fallback on htmlfy.
 * @returns {Promise<(str: string) => string> | Promise<null>}
 */
const requireHTMLFormatter = () => {
    if (_htmlFormatter) {
        return Promise.resolve(_htmlFormatter);
    }
    return new Promise((resolve) => {
        const fallback = () => {
            window.require(['tiny_codepro/htmlfy-lazy'], (prettify) => {
                _htmlFormatter = (src) => prettify(src, {
                    ignore: ['style', 'script', 'pre', 'code'],
                    strict: false,
                    tab_size: 2
                });
                resolve(_htmlFormatter);
            }, () => resolve(null));
        };
        window.require(['tiny_html/beautify/beautify-html'], (beautify) => {
            if (typeof beautify?.html_beautify !== 'function') {
                fallback();
                return;
            }
            _htmlFormatter = (src) => beautify.html_beautify(src, {
                indent_size: 2,
                wrap_line_length: 0,
                unformatted: [],
                preserve_newlines: false,
            });
            resolve(_htmlFormatter);
        }, fallback);
    });
};


/**
 * This is an abstract template class that is extended
 * by the actual view managers dialog and panel.
 * Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.
 */
export class ViewManager {
    static icons = {
        'tinymce': '<svg xmlns="http://www.w3.org/2000/svg" height="21" width="21" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 940.6 959.5"><path d="M621.6 0c159.9.9 317.9 133.8 317.9 327.5 0 0 1 49.2 1.1 108.8v24.9c0 11.2-.1 22.5-.2 33.8l-.2 16.9c-.7 47.6-2.4 91.9-5.8 114.9-22.2 148-132.7 250.2-285 276.2-137.3 26.8-218.7 42.3-245 47.5-11.3 2.4-61.1 9-82.7 9C154.3 959.5 2.4 834.1 0 632v-33.3l.1-5.7v-12.4c0-21.8.1-48.5.2-76l.1-16.5c.2-52.5.7-104.9 1.5-129C7.6 211.6 109.6 92.4 303.8 54.2L551.1 6.1C573.7 1.9 598.6 0 621.6 0z" fill="#0c132c"/><path d="M733.5 538.7l-150.4 29.2v147l-376.2 73V421.2l150.4-29.1v219.6l225.8-43.8V348.3l-225.8 43.8V245l376.2-73z" fill="#fff" fill-rule="evenodd"/></svg>',
        'sun': '<svg xmlns="http://www.w3.org/2000/svg" height="21" width="21" viewBox="0 0 512 512"><path d="M256 160c-52.9 0-96 43.1-96 96s43.1 96 96 96 96-43.1 96-96-43.1-96-96-96zm246.4 80.5l-94.7-47.3 33.5-100.4c4.5-13.6-8.4-26.5-21.9-21.9l-100.4 33.5-47.4-94.8c-6.4-12.8-24.6-12.8-31 0l-47.3 94.7L92.7 70.8c-13.6-4.5-26.5 8.4-21.9 21.9l33.5 100.4-94.7 47.4c-12.8 6.4-12.8 24.6 0 31l94.7 47.3-33.5 100.5c-4.5 13.6 8.4 26.5 21.9 21.9l100.4-33.5 47.3 94.7c6.4 12.8 24.6 12.8 31 0l47.3-94.7 100.4 33.5c13.6 4.5 26.5-8.4 21.9-21.9l-33.5-100.4 94.7-47.3c13-6.5 13-24.7 .2-31.1zm-155.9 106c-49.9 49.9-131.1 49.9-181 0-49.9-49.9-49.9-131.1 0-181 49.9-49.9 131.1-49.9 181 0 49.9 49.9 49.9 131.1 0 181z"/></svg>',
        'moon': '<svg xmlns="http://www.w3.org/2000/svg" height="21" width="21" viewBox="0 0 384 512"><path d="M144.7 98.7c-21 34.1-33.1 74.3-33.1 117.3c0 98 62.8 181.4 150.4 211.7c-12.4 2.8-25.3 4.3-38.6 4.3C126.6 432 48 353.3 48 256c0-68.9 39.4-128.4 96.8-157.3zm62.1-66C91.1 41.2 0 137.9 0 256C0 379.7 100 480 223.5 480c47.8 0 92-15 128.4-40.6c1.9-1.3 3.7-2.7 5.5-4c4.8-3.6 9.4-7.4 13.9-11.4c2.7-2.4 5.3-4.8 7.9-7.3c5-4.9 6.3-12.5 3.1-18.7s-10.1-9.7-17-8.5c-3.7 .6-7.4 1.2-11.1 1.6c-5 .5-10.1 .9-15.3 1c-1.2 0-2.5 0-3.7 0l-.3 0c-96.8-.2-175.2-78.9-175.2-176c0-54.8 24.9-103.7 64.1-136c1-.9 2.1-1.7 3.2-2.6c4-3.2 8.2-6.2 12.5-9c3.1-2 6.3-4 9.6-5.8c6.1-3.5 9.2-10.5 7.7-17.3s-7.3-11.9-14.3-12.5c-3.6-.3-7.1-.5-10.7-.6c-2.7-.1-5.5-.1-8.2-.1c-3.3 0-6.5 .1-9.8 .2c-2.3 .1-4.6 .2-6.9 .4z"/></svg>',
        'magic': '<svg xmlns="http://www.w3.org/2000/svg" height="21" width="21" viewBox="0 0 512 512"><path d="M224 96l16-32 32-16-32-16-16-32-16 32-32 16 32 16 16 32zM80 160l26.7-53.3L160 80l-53.3-26.7L80 0 53.3 53.3 0 80l53.3 26.7L80 160zm352 128l-26.7 53.3L352 368l53.3 26.7L432 448l26.7-53.3L512 368l-53.3-26.7L432 288zm70.6-193.8L417.8 9.4C411.5 3.1 403.3 0 395.2 0c-8.2 0-16.4 3.1-22.6 9.4L9.4 372.5c-12.5 12.5-12.5 32.8 0 45.3l84.9 84.9c6.3 6.3 14.4 9.4 22.6 9.4 8.2 0 16.4-3.1 22.6-9.4l363.1-363.2c12.5-12.5 12.5-32.8 0-45.2zM359.5 203.5l-50.9-50.9 86.6-86.6 50.9 50.9-86.6 86.6z"/></svg>',
        'exchange': '<svg xmlns="http://www.w3.org/2000/svg" height="21" width="21" viewBox="0 0 512 512"><path d="M0 168v-16c0-13.3 10.7-24 24-24h360V80c0-21.4 25.9-32 41-17l80 80c9.4 9.4 9.4 24.6 0 33.9l-80 80C410 272 384 261.5 384 240v-48H24c-13.3 0-24-10.7-24-24zm488 152H128v-48c0-21.3-25.9-32.1-41-17l-80 80c-9.4 9.4-9.4 24.6 0 33.9l80 80C102.1 464 128 453.4 128 432v-48h360c13.3 0 24-10.7 24-24v-16c0-13.3-10.7-24-24-24z"/></svg>',
        'rightarrow': '<svg xmlns="http://www.w3.org/2000/svg" height="21" width="21" viewBox="0 0 512 512"><path d="M334.5 414c8.8 3.8 19 2 26-4.6l144-136c4.8-4.5 7.5-10.8 7.5-17.4s-2.7-12.9-7.5-17.4l-144-136c-7-6.6-17.2-8.4-26-4.6s-14.5 12.5-14.5 22l0 72L32 192c-17.7 0-32 14.3-32 32l0 64c0 17.7 14.3 32 32 32l288 0 0 72c0 9.6 5.7 18.2 14.5 22z"/></svg>',
        'eye': '<svg xmlns="http://www.w3.org/2000/svg" height="21" width="21" viewBox="0 0 560 512"><path d="M572.5 241.4C518.3 135.6 410.9 64 288 64S57.7 135.6 3.5 241.4a32.4 32.4 0 0 0 0 29.2C57.7 376.4 165.1 448 288 448s230.3-71.6 284.5-177.4a32.4 32.4 0 0 0 0-29.2zM288 400a144 144 0 1 1 144-144 143.9 143.9 0 0 1 -144 144zm0-240a95.3 95.3 0 0 0 -25.3 3.8 47.9 47.9 0 0 1 -66.9 66.9A95.8 95.8 0 1 0 288 160z"/></svg>',
        'fullscreen': '<svg height="21" width="21" viewBox="0 0 24 24" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><defs></defs><g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><path d="M15.3203862,9.93650271 L14.0634973,8.67961382 L16.9653333,5.77777778 L14.6666667,5.77777778 C14.1757469,5.77777778 13.7777778,5.37980867 13.7777778,4.88888889 C13.7777778,4.39796911 14.1757469,4 14.6666667,4 L19.1111111,4 C19.6020309,4 20,4.39796911 20,4.88888889 L20,9.33333333 C20,9.82425311 19.6020309,10.2222222 19.1111111,10.2222222 C18.6201913,10.2222222 18.2222222,9.82425311 18.2222222,9.33333333 L18.2222222,7.03466667 L15.3203862,9.93650271 Z M15.3203862,14.0634973 L18.2222222,16.9653333 L18.2222222,14.6666667 C18.2222222,14.1757469 18.6201913,13.7777778 19.1111111,13.7777778 C19.6020309,13.7777778 20,14.1757469 20,14.6666667 L20,19.1111111 C20,19.6020309 19.6020309,20 19.1111111,20 L14.6666667,20 C14.1757469,20 13.7777778,19.6020309 13.7777778,19.1111111 C13.7777778,18.6201913 14.1757469,18.2222222 14.6666667,18.2222222 L16.9653333,18.2222222 L14.0634973,15.3203862 L15.3203862,14.0634973 Z M9.93650271,15.3203862 L7.03466667,18.2222222 L9.33333333,18.2222222 C9.82425311,18.2222222 10.2222222,18.6201913 10.2222222,19.1111111 C10.2222222,19.6020309 9.82425311,20 9.33333333,20 L4.88888889,20 C4.39796911,20 4,19.6020309 4,19.1111111 L4,14.6666667 C4,14.1757469 4.39796911,13.7777778 4.88888889,13.7777778 C5.37980867,13.7777778 5.77777778,14.1757469 5.77777778,14.6666667 L5.77777778,16.9653333 L8.67961382,14.0634973 L9.93650271,15.3203862 Z M8.67961382,9.93650271 L5.77777778,7.03466667 L5.77777778,9.33333333 C5.77777778,9.82425311 5.37980867,10.2222222 4.88888889,10.2222222 C4.39796911,10.2222222 4,9.82425311 4,9.33333333 L4,4.88888889 C4,4.39796911 4.39796911,4 4.88888889,4 L9.33333333,4 C9.82425311,4 10.2222222,4.39796911 10.2222222,4.88888889 C10.2222222,5.37980867 9.82425311,5.77777778 9.33333333,5.77777778 L7.03466667,5.77777778 L9.93650271,8.67961382 L8.67961382,9.93650271 Z" fill="#000000" fill-rule="nonzero"></path></g></svg>',
        'decreasefontsize': '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M14 5C14.5523 5 15 5.44772 15 6C15 6.55228 14.5523 7 14 7H10V18C10 18.5523 9.55228 19 9 19C8.44772 19 8 18.5523 8 18V7H4C3.44772 7 3 6.55228 3 6C3 5.44772 3.44772 5 4 5H14Z" fill="black"/><path fill-rule="evenodd" clip-rule="evenodd" d="M14 12C13.4477 12 13 12.4477 13 13C13 13.5523 13.4477 14 14 14C17.5468 14 16.4532 14 20 14C20.5523 14 21 13.5523 21 13C21 12.4477 20.5523 12 20 12C16.0094 12 17.8022 12 14 12Z" fill="black"/></svg>',
        'increasefontsize': '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M14 5C14.5523 5 15 5.44772 15 6C15 6.55228 14.5523 7 14 7H10V18C10 18.5523 9.55228 19 9 19C8.44772 19 8 18.5523 8 18V7H4C3.44772 7 3 6.55228 3 6C3 5.44772 3.44772 5 4 5H14Z" fill="black"/><path fill-rule="evenodd" clip-rule="evenodd" d="M17 9C16.4477 9 16 9.44772 16 10V12H14C13.4477 12 13 12.4477 13 13C13 13.5523 13.4477 14 14 14H16V16C16 16.5523 16.4477 17 17 17C17.5523 17 18 16.5523 18 16V14H20C20.5523 14 21 13.5523 21 13C21 12.4477 20.5523 12 20 12H18V10C18 9.44772 17.5523 9 17 9Z" fill="black"/></svg>',
    };

    /**
     * @param {HTMLElement | null | undefined} element
     * @param {string} query
     * @param {string | undefined} html
     */
    static safeInnerHTML(element, query, html) {
        if (!element) {
            return;
        }
        const find = element.querySelector(query);
        if (find) {
            find.innerHTML = html || '';
        }
    }

    /**
     * @param {TinyMCE} editor - The TinyMCE editor
     * @param {{autosave?: boolean, translations?: Record<string, string>}} [opts] - Options
     */
    constructor(editor, opts) {
        this.editor = editor;
        this.opts = { autosave: false, translations: [], ...(opts ?? {}) };
        this.isLoading = false;
        this.preferencesSrv = getPreferencesSrv(editor);
    }

    /**
     * Call this method to make the view visible
     * @returns {Promise<void>}
     */
    async show() {
        if (this.isLoading) {
            return;
        }
        this.isLoading = true;
        // Always store the previous scroll of the editor in case it is lost
        blackboard.scrolls[this.editor.id] = this.editor.contentWindow.scrollY;
        await this._tCreate();
        // Call the template method to show the UI
        this._tShow();
        this.isLoading = false;
        setTimeout(() => this.codeEditor?.focus(), 250);
    }

    /**
     * Template method that has to be implemented by the actual view manager.
     * Logic associated with the creation of the view.
     * @returns {Promise<void>}
     */
    async _tCreate() {
        throw new Error('Method not implemented');
    }

    /**
     * Template method that has to be implemented by the actual view manager.
     * Code required to make the actual view visible.
     */
    _tShow() {
        throw new Error('Method not implemented');
    }

    /**
     * Template method that has to be implemented by the actual view manager.
     * Logic associated when the view is hidden or closed.
     */
    _tClose() {
        throw new Error("Method not implemented");
    }

    /**
     * Template method that has to be implemented by the actual view manager.
     * Logic associated with the destruction of the view.
     */
    _tDestroy() {
        throw new Error("Method not implemented");
    }

    /**
     * Template method that can be overridden by the actual view manager.
     * Adjusts the options for the CodeMirror editor.
     */
    _tAdjustOptions() {
    }

    /**
     * Gets the first element that is visible in the viewport of the editor
     * @param {HTMElement} container
     * @returns {HTMLElement | null}
     */
    _getFirstVisibleElement(container) {
        const children = container.children;
        for (let i = 0; i < children.length; i++) {
            const rect = children[i].getBoundingClientRect();
            // Container visible rect (viewport inside editor)
            const containerRect = container.getBoundingClientRect();
            if (rect.bottom > containerRect.top) {
                return children[i];
            }
        }
        return null;
    }

    /**
     * Restores the previous scroll of the TinyMCE editor.
     * @param {boolean} [activateCursor]
     */
    _restoreScroll(activateCursor) {
        // No marker found. Restore previous scroll.
        const previousScroll = blackboard.scrolls[this.editor.id];
        this.editor.getWin().scrollTo(0, previousScroll);
        blackboard.scrolls[this.editor.id] = undefined;

        if (activateCursor) {
            const firstVisible = this._getFirstVisibleElement(this.editor.getBody());
            if (firstVisible) {
                const rng = this.editor.dom.createRng();
                rng.selectNodeContents(firstVisible);
                rng.collapse(true);
                this.editor.selection.setRng(rng);
            }
        }
    }

    /**
     * Simplify updates the HTML code to TinyMCE without closing the CodeMirror editor.
     */
    _quickSave() {
        const html = this.codeEditor.getValue();
        this.editor.setContent(html, { format: 'html' });
        this.pendingChanges = false;
    }

    /**
     * Action called to update the code in the Tiny editor.
     * Changes are performed in a transaction to take advantage of undo manager.
     * @param {string} [html] - HTML code
     * @returns {Promise<string>} - Resolves to the code that is actually set to the tinyMCE editor.
     */
    _saveAction(html) {
        if (!html) {
            // Get code without any marker.
            html = this.codeEditor.getValue();
        }
        this._tClose();
        // Do it in a transaction
        return new Promise((resolve) => {
            // Wait for closing
            setTimeout(() => {
                // Restore cursor and scroll position
                this.editor.focus();
                this.editor.undoManager.transact(() => {
                    this.editor.setContent(html, { format: 'html' });
                    resolve(html);
                    const syncCaret = getSyncCaret(this.editor);
                    if (syncCaret === 'both') {
                        // Select markers using TinyMCE api
                        const markerNodes = this.editor.dom.select(`span.${TINY_MARKER_CLASS}`);
                        const markerNode = markerNodes.length ? markerNodes[0] : null;

                        if (markerNode) {
                            const parentEl = markerNode.parentNode;
                            let elemForRemoval = markerNode;
                            let elemForSelection = markerNode;

                            if (parentEl) {
                                // Check if marker is wrapped alone inside p tag
                                const isMarkerAloneWrappedP =
                                    parentEl.nodeName === 'P' &&
                                    parentEl.childNodes.length === 1 &&
                                    parentEl.firstChild === markerNode;

                                if (isMarkerAloneWrappedP) {
                                    elemForRemoval = parentEl;

                                    const grandParent = parentEl.parentNode;
                                    const body = this.editor.getBody();

                                    // eslint-disable-next-line max-depth
                                    if (grandParent && grandParent !== body) {
                                        elemForSelection = grandParent;
                                    } else {
                                        elemForSelection =
                                            parentEl.previousSibling ||
                                            parentEl.nextSibling ||
                                            body;
                                    }
                                }
                            }

                            // Set the cursor at selection element
                            if (elemForSelection) {
                                this.editor.selection.setCursorLocation(elemForSelection, 1);
                            }

                            markerNode.style.display = 'inline';
                            const rect = markerNode.getBoundingClientRect();
                            markerNode.style.display = 'none';
                            const win = this.editor.getWin();
                            const scrollY = win.scrollY || win.pageYOffset || 0;

                            win.scrollTo({
                                top: rect.top + scrollY - 100,
                            });

                            // Remove all markers
                            if (elemForRemoval?.parentNode) {
                                elemForRemoval.parentNode.removeChild(elemForRemoval);
                            }

                            this.editor.dom.select(`span.${TINY_MARKER_CLASS}`).forEach(n => {
                                this.editor.dom.remove(n);
                            });
                        } else {
                            this._restoreScroll(true);
                        }
                    } else if (syncCaret !== 'none') {
                        this._restoreScroll(true);
                    }
                    this.editor.nodeChanged();
                });
                this.destroyCodeEditor();
            }, 250);
        });
    }

    /**
     * Action called when the user accepts the changes in the CodePro View.
     * It basically calls _saveAction in addition to handling cursor synchronization.
     */
    accept() {
        // Add marker if cursor synchronization is enabled.
        const isSynEnabled = getSyncCaret(this.editor) === 'both';
        const htmlNoMarker = this.codeEditor.getValue(isSynEnabled ? 1 : 0);
        this._saveAction(htmlNoMarker);
        return true;
    }

    /**
     * This method destroys the CodeMirror instance and executes the logic to close
     * the current view. It also restores the cursor and scroll positions in the TinyMCE
     * editor.
     *
     */
    close() {
        this._tClose();
        this.destroyCodeEditor();
        // Save any pending preferences.
        this.preferencesSrv.flush();
        // Restore cursor and scroll position
        this.pendingChanges = false;
        return true;
    }

    /**
     * Loads the html and head position from the Tiny editor
     * @returns {Promise<{html: string, head: number}>}
     */
    async loadDocInfo() {
        return blackboard.state ? blackboard.state : await this._retrieveHtml();
    }

    /**
     * Creates a new instance of the CodeEditor and attaches to the DOM element.
     * @param {HTMLElement} codeEditorElement
     * @param {{html: string, head: number}} docHead
     */
    async attachCodeEditor(codeEditorElement, docHead) {
        const CodeProEditor = await requireCm6Pro();
        const commands = {
            minimap: this.toggleMinimap.bind(this),
            prettify: this.prettify.bind(this),
            linewrapping: this.toggleLineWrapping.bind(this),
            theme: this.toggleTheme.bind(this),
            accept: this.accept.bind(this),
            cancel: this.close.bind(this),
            savePrefs: () => {
                this.preferencesSrv.save();
            }
        };

        const options = {
            doc: docHead.html ?? '',
            head: docHead.head,
            theme: this.preferencesSrv.get("theme", "light"),
            fontSize: this.preferencesSrv.get("fontsize", 11),
            lineWrapping: this.preferencesSrv.get("wrap", false),
            minimap: !this.opts.autosave && this.preferencesSrv.get("minimap", true),
            commands
        };
        this._tAdjustOptions(options);
        this.codeEditor = new CodeProEditor(codeEditorElement, options);
        this.codeEditor.focus();
        this.pendingChanges = false;
        if (blackboard.state) {
            // Restore state from the another view
            this.codeEditor.setSelection(blackboard.state.selection);
            this.pendingChanges = true;
        }
        blackboard.state = null;
    }

    /**
     * Obtains the HTML code/state from Tiny to CodeMirror editor taking care
     * of cursor synchronization between both editors.
     * @returns {Promise<{html: string, head: number}>}
     */
    async _retrieveHtml() {
        let head = 0;
        let html;
        let markerNode;
        const MARKER_COMMENT_TEXT = `__${TINY_MARKER_CLASS}_${Date.now()}__`;
        const reg = new RegExp(`<\\s?!--\\s*${MARKER_COMMENT_TEXT}\\s*-->`, 'g');

        // A more comprehensive list of tags to avoid inserting into.
        const forbiddenTagSelector = 'script,style,textarea,title,pre,code,canvas,svg,iframe';

        this.editor.undoManager.ignore(() => {
            const syncCaret = getSyncCaret(this.editor) !== 'none';
            if (syncCaret) {
                this.editor.focus();

                // Use a comment node as the marker
                try {
                    markerNode = this.editor.getDoc().createComment(MARKER_COMMENT_TEXT);
                    const selection = this.editor.selection;
                    let rng = selection.getRng();

                    if (!rng.collapsed) {
                        rng = rng.cloneRange();
                        rng.collapse(true);
                    }

                    // Get the most precise location of the cursor
                    const container = rng.startContainer;

                    // --- DECISION TREE FOR SAFE INSERTION ---

                    // Case 1: The cursor is directly inside a comment node.
                    if (container.nodeType === Node.COMMENT_NODE) {
                        // ACTION: Insert the marker *after* the existing comment to avoid the HierarchyRequestError.
                        const parent = container.parentNode;
                        if (parent) {
                            parent.insertBefore(markerNode, container.nextSibling);
                        } else {
                            // This is an edge case, but we should handle it.
                            console.error("Cannot insert marker, comment node has no parent.");
                        }

                    } else {
                        // Case 2 & 3: The cursor is NOT in a comment. Now we can check for forbidden parent *elements*.
                        const currentNode = selection.getNode();
                        let boundaryParent = this.editor.dom.getParent(currentNode, forbiddenTagSelector);

                        if (!boundaryParent) {
                            boundaryParent = this.editor.dom.getParent(currentNode, '*[contenteditable=false]');
                        }

                        if (boundaryParent) {
                            // Case 2: The cursor is inside a forbidden or non-editable element.
                            // ACTION: Move the range to be immediately BEFORE this boundary element and insert there.
                            rng.setStartBefore(boundaryParent);
                            rng.collapse(true);
                            rng.insertNode(markerNode);
                        } else {
                            // Case 3: This is a normal, safe location (e.g., a text node in a <p> tag).
                            // ACTION: Insert the marker at the original cursor position.
                            rng.insertNode(markerNode);
                        }
                    }

                } catch (ex) {
                    // If any part of the insertion logic fails, we'll end up here.
                    console.error("Failed to insert cursor marker:", ex);
                    // Crucially, ensure markerNode is nullified so the replacement logic doesn't run.
                    // (You would need to declare markerNode outside the try block for this to work)
                }
            }

            /** @type {string} */
            html = this.editor.getContent({ source_view: true });
            html = html.replace(reg, MARKER);
        });

        // According to global preference prettify code when opening the editor
        if (isAutoFormatHTML(this.editor)) {
            const prettifier = await requireHTMLFormatter();
            if (prettifier) {
                html = prettifier(html);
            } else {
                console.error('No HTML formatter available');
            }
        }

        // Remove the marker comment node
        if (markerNode) {
            html = html.replace(new RegExp(MARKER, 'g'), (str, pos) => {
                head = pos;
                return '';
            });
            markerNode.remove();
        }


        // For security get rid of any possible span markers that couldn't eventually
        // be removed by backwards synchronization.
        const reg2 = new RegExp(`<span\\s+class=["']${TINY_MARKER_CLASS}["']([^>]*)>([^<]*)<\\/span>`, 'gm');
        html = html.replace(reg2, '');

        return { html, head };
    }

    /**
     * This method destroys the CodeMirror instance.
     */
    destroyCodeEditor() {
        this.codeEditor?.destroy();
        this._tDestroy();
    }

    /**
     * Action to format or prettify HTML code.
     * @param {HTMLElement} [btn] Button element to disable while prettifying.
     */
    async prettify(btn) {
        if (btn) {
            btn.disabled = true;
        }
        const prettifier = await requireHTMLFormatter();
        if (prettifier) {
            const html = this.codeEditor.getValue(2);
            const pretty = prettifier(html);
            this.codeEditor.setValue(pretty);
        } else {
            console.error('No HTML formatter available');
        }
        if (btn) {
            btn.disabled = false;
        }
        return true;
    }

    /**
     * Action to toggle line wrapping in the codeMirror editor.
     * @param {boolean} mustSave Save the state.
     */
    toggleLineWrapping(mustSave = true) {
        if (!this.codeEditor || (!this.preferencesSrv.get('fs', false) && this.opts.autosave)) {
            // Panel mode which is not in fullscreen, should always be wrapping on
            return true;
        }
        const isWrap = this.codeEditor.toggleLineWrapping();
        if (mustSave) {
            this.preferencesSrv.set('wrap', isWrap);
        }

        ViewManager.safeInnerHTML(this.domElements.btnWrap, 'span',
            isWrap ? ViewManager.icons.exchange : ViewManager.icons.rightarrow);

        return true;
    }

    toggleMinimap() {
        if (!this.codeEditor) {
            return true;
        }
        const isMinimap = this.codeEditor.toggleMinimap();
        this.preferencesSrv.set('minimap', isMinimap);
        return true;
    }

    /**
     * Action to toggle theme (light/dark)
     *
     */
    toggleTheme() {
        if (!this.codeEditor) {
            return true;
        }
        const theme = this.codeEditor.toggleTheme();
        this.preferencesSrv.set('theme', theme);
        const isDark = theme === 'dark';
        ViewManager.safeInnerHTML(this.domElements.btnTheme, 'span',
            isDark ? ViewManager.icons.moon : ViewManager.icons.sun);

        if (isDark) {
            this.domElements.root.classList.add('tiny_codepro-dark');
        } else {
            this.domElements.root.classList.remove('tiny_codepro-dark');
        }
        return true;
    }

    /**
     * Action to decrease fontsize.
     */
    decreaseFontsize() {
        this.codeEditor?.decreaseFontsize();
        this.preferencesSrv.set('fontsize', this.codeEditor?.getFontsize());
    }

    /**
     * Action to increase fontsize.
     */
    increaseFontsize() {
        this.codeEditor?.increaseFontsize();
        this.preferencesSrv.set('fontsize', this.codeEditor?.getFontsize());
    }

    /**
     * Action that allows to switch between dialog and panel views.
     */
    switchViews() {
        if (!this.codeEditor) {
            return;
        }
        blackboard.state = this.codeEditor.getState();
        // Destroy code editor and close the current view.
        this._tClose();
        this.destroyCodeEditor();
        // Toggle user preference
        const uiMode = this.preferencesSrv.get('view', 'dialog');
        this.preferencesSrv.set('view', uiMode === 'dialog' ? 'panel' : 'dialog');
        // Call the action again
        this.editor.execCommand('mceCodeProEditor', false);
    }

    /**
     * Shows a loading spinner in the container
     * @param {HTMLElement} container
     */
    _showSpinner(container) {
        const loader = document.createElement('SPAN');
        loader.classList.add('tiny_codepro-loader');
        container.append(loader);
    }

    /**
     * Removes the loading spinner from the container
     * @param {HTMLElement} container
     */
    _hideSpinner(container) {
        const loader = container.querySelector('span.tiny_codepro-loader');
        loader?.remove();
    }
}

