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
 * Tiny CodePro plugin. Thin wrapper around CodeMirror 6
 *
 * @module      tiny_codepro/plugin
 * @copyright   2024 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import { basicSetup } from "codemirror";
import { EditorView, keymap } from "@codemirror/view";
import { EditorState, Transaction, Compartment, Prec, EditorSelection } from '@codemirror/state';
import { html as htmlLang } from "@codemirror/lang-html";
import { cm6proDark } from './cm6pro-dark-theme';
import { SearchCursor } from '@codemirror/search';

// 3rd party extensions.
import { indentationMarkers } from '@replit/codemirror-indentation-markers';
import { colorPicker } from '@replit/codemirror-css-color-picker';
import { showMinimap } from "@replit/codemirror-minimap";

const MIN_FONTSIZE = 8;
const MAX_FONTSIZE = 22;

const themes = {
    'light': EditorView.baseTheme(),
    'dark': cm6proDark
};

// The wrapper class
export default class CodeProEditor {
    static getThemes() {
        return ['light', 'dark'];
    }
    static MARKER = String.fromCharCode(0);
    static MarkerType = {
        none: 0,
        atElement: 1,
        atCursor: 2
    };
    /**
     * @member {HTMLElement} parentElement
     * @member {string} source
     * @member {CodeMirrorView} editorView
     * @member {Record<string,*>} config
     */
    parentElement;
    source;
    editorView;
    config;
    /**
     * @param {HTMLElement} parentElement
     * @param {Record<string, any>} [options]
     */
    constructor(parentElement, options) {
        // Default configuration
        this.config = {
            themeName: options?.theme ?? 'light',
            fontSize: options?.fontSize ?? 11,
            lineWrapping: options?.lineWrapping ?? false,
            minimap: options?.minimap ?? true,
            changesListener: options?.changesListener,
            commands: options.commands
        };

        this.parentElement = parentElement;
        this.editorView = new EditorView({
            state: this._createState(options.doc),
            parent: this.parentElement
        });
        if (options.doc) {
            this.scrollToCaretPosition();
        }

        // Make sure that any changes on the parent dimensions, will triger a view requestMeasure
        this.resizeObserver = new ResizeObserver(() => {
            // No need to check entries here, as we only observe one element
            if (this.editorView) {
                this.editorView.requestMeasure();
            }
        });
        // Start observing the parent element
        let observeElement = parentElement;
        if (parentElement instanceof ShadowRoot) {
            observeElement = parentElement.host;
        }
        this.resizeObserver.observe(observeElement);
    }

    /**
     *
     * @param {string} [html] - The initial html
     * @returns {*} a new State
     */
    _createState(html) {
        this.themeConfig = new Compartment();
        this.linewrapConfig = new Compartment();
        this.minimapConfig = new Compartment();

        const extensions = [
            basicSetup,
            htmlLang(),
            indentationMarkers(),
            colorPicker,
            this.linewrapConfig.of(this.config.lineWrapping ? [EditorView.lineWrapping] : []),
            this.themeConfig.of(this._createTheme()),
            this.minimapConfig.of(this._createMinimap()),
            Prec.high(keymap.of(this._createKeyMap())),
            EditorView.editorAttributes.of({ 'class': "tiny_codepro-editorview" })
        ];
        if (this.config.changesListener) {
            extensions.push(EditorView.updateListener.of((viewUpdate) => {
                if (viewUpdate.docChanged) {
                    this.config.changesListener();
                }
            }));
        }

        return EditorState.create({
            doc: html ?? '',
            extensions
        });
    }

    _createKeyMap() {
        return [
            {
                key: "Shift-Alt-m",
                preventDefault: true,
                stopPropagation: true,
                run: this.config.commands.minimap
            },
            {
                key: "Shift-Alt-p",
                preventDefault: true,
                stopPropagation: true,
                run: this.config.commands.prettify
            },
            {
                key: "Shift-Alt-w",
                preventDefault: true,
                stopPropagation: true,
                run: this.config.commands.linewrapping
            },
            {
                key: "Shift-Alt-t",
                preventDefault: true,
                stopPropagation: true,
                run: this.config.commands.theme
            },
            {
                key: "Shift-Alt-a",
                preventDefault: true,
                stopPropagation: true,
                run: this.config.commands.accept
            },
            {
                key: "Shift-Alt-d",
                preventDefault: true,
                stopPropagation: true,
                run: () => {
                    // Stores the preferences from this editor
                    this.config.commands.savePrefs();
                    return true;
                }
            },
            {
                key: "Shift-Alt-c",
                preventDefault: true,
                stopPropagation: true,
                run: this.config.commands.cancel
            },
        ];
    }

    /**
     * @returns {*}
     */
    _createMinimap() {
        if (!this.config.minimap) {
            return [];
        }

        const create = () => {
            const dom = document.createElement('div');
            return { dom };
        };
        return showMinimap.compute(['doc'], () => {
            return ({
                create,
                displayText: 'blocks',
                showOverlay: 'always',
                gutters: [],
            });
        });
    }

    /**
     * Destroys the editor
     */
    destroy() {
        this.editorView.destroy();
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }

    /**
     * Sets the html source code
     * @param {string} source
     */
    setValue(source) {
        this.source = source;
        const view = this.editorView;
        view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: source || '' },
            annotations: [Transaction.addToHistory.of(false)]
        });
        this.scrollToCaretPosition();
    }

    /**
     * Gets the html source code
     * @param {number} [marker]
     * @returns {string}
     */
    getValue(marker) {
        if (marker === CodeProEditor.MarkerType.atCursor) {
            return this.getValueWithMarkerAtCursor();
        }
        return this.editorView.state.doc.toString();
    }

    /**
     * Sets the selection
     * @param {{anchor: number}} pos
     */
    setSelection(pos) {
        const selection = EditorSelection.single(pos.anchor);
        // Restore selection
        this.editorView.dispatch({
            selection,
            effects: EditorView.scrollIntoView(selection.main.head, { y: "center" })
        });
    }

    /**
     * Gets the current editor's view state properties
     * @returns {*}
     */
    getState() {
        const state = this.editorView.state;
        const range = state.selection.ranges[0] || { from: 0, to: 0 };
        return {
            html: state.doc.toString(),
            selection: { anchor: range.from, head: range.to }
        };
    }

    /**
     * Creates light or dark themes dynamically for an specific fontSize
     * @param {string} [themeName]
     * @returns {*[] | null} - The theme effects
     */
    _createTheme(themeName) {
        themeName = themeName ?? this.config.themeName ?? 'light';
        const baseTheme = themes[themeName];
        if (!baseTheme) {
            return null;
        }
        this.config.themeName = themeName;

        const fontTheme = EditorView.theme({
            ".cm-content": {
                fontSize: this.config.fontSize + "pt",
            },
            ".cm-gutters": {
                fontSize: this.config.fontSize + "pt",
            },
        });
        return [baseTheme, fontTheme];
    }

    /**
     * Sets light or dark themes dynamically for an specific fontSize
     * @param {string} [themeName]
     */
    setTheme(themeName) {
        const theme = this._createTheme(themeName);
        if (!theme) {
            // eslint-disable-next-line no-console
            console.error("Unknown theme", themeName);
        }
        this.editorView.dispatch({
            effects: this.themeConfig.reconfigure(theme)
        });
    }

    /**
     * Toogles light or dark themes dynamically for an specific fontSize
     */
    toggleTheme() {
        const themeName = this.config.themeName === 'light' ? 'dark' : 'light';
        this.setTheme(themeName);
        return themeName;
    }

    /**
     * Sets an specific font size
     * @param {number} size
     */
    setFontsize(size) {
        this.config.fontSize = size;
        this.setTheme();
    }

    /**
     * Gets the current font size
     * @returns {number}
     */
    getFontsize() {
        return this.config.fontSize;
    }

    /**
     * Increases the font size up to a MAX_FONTSIZE
     */
    increaseFontsize() {
        if (this.config.fontSize > MAX_FONTSIZE) {
            return;
        }
        this.config.fontSize += 1;
        this.setTheme();
    }

    /**
     * Decreases the font size down to a MIN_FONTSIZE
     */
    decreaseFontsize() {
        if (this.config.fontSize < MIN_FONTSIZE) {
            return;
        }
        this.config.fontSize -= 1;
        this.setTheme();
    }

    /**
     * Enable/disable linewrapping dynamically
     */
    toggleLineWrapping() {
        this.config.lineWrapping = !this.config.lineWrapping;
        this.editorView.dispatch({
            effects: this.linewrapConfig.reconfigure(this.config.lineWrapping ? [EditorView.lineWrapping] : [])
        });
        return this.config.lineWrapping;
    }

    /**
     * Show/hide minimap dynamically
     */
    toggleMinimap() {
        this.config.minimap = !this.config.minimap;
        this.editorView.dispatch({
            effects: this.minimapConfig.reconfigure(this._createMinimap())
        });
        this.editorView.focus();
        // Issue:: Need to scroll to ensure minimap is rerendered
        this.editorView.dispatch({
            scrollIntoView: true
        });
        return this.config.minimap;
    }

    /**
     * Focus onto the editor
     */
    focus() {
        if (!this.editorView.hasFocus) {
            this.editorView.focus();
        }
    }

        /**
    * Scrolls the editor view to the position of the marker.
    * If the marker is not found, scrolls the current view into focus.
    */
    scrollToCaretPosition() {
        const state = this.editorView.state;
        const searchCursor = new SearchCursor(state.doc, CodeProEditor.MARKER);
        searchCursor.next();
        const value = searchCursor.value;
        if (value) {
            this.editorView.dispatch({
                changes: { from: value.from, to: value.to, insert: '' },
                selection: { anchor: value.from },
                effects: EditorView.scrollIntoView(value.from, { y: "center" }),
                annotations: [Transaction.addToHistory.of(false)]
            });
        } else {
            this.editorView.dispatch({
                scrollIntoView: true
            });
        }
    }


    /**
     * Inserts the marker at the current cursor position and returns
     * the editor content as a string. The marker is removed immediately
     * after insertion. Does not affect undo history.
     *
     * @returns {string} The document content with the marker temporarily inserted.
     */
    getValueWithMarkerAtCursor() {
        const cursor = this.editorView.state.selection.main.head;
        this.editorView.dispatch({
            changes: { from: cursor, insert: CodeProEditor.MARKER },
            annotations: [Transaction.addToHistory.of(false)]
        });

        const html = this.editorView.state.doc.toString();
        if (cursor !== null) {
            this.editorView.dispatch({
                changes: { from: cursor, to: cursor + 1, insert: '' },
                annotations: [Transaction.addToHistory.of(false)]
            });
        }
        return html;
    }
}

