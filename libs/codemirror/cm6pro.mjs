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

// 3rd party extensions.
import { indentationMarkers } from '@replit/codemirror-indentation-markers';
import { showMinimap } from "@replit/codemirror-minimap";

import { colorPicker } from './cm6pro-css-colorpicker';
import { CursorSync } from "./cursorsync.mjs";

// Hardcoded fontsize limits.
const MIN_FONTSIZE = 8;
const MAX_FONTSIZE = 22;

// Supported themes.
const themes = {
    'light': EditorView.baseTheme(),
    'dark': cm6proDark
};

// The wrapper class
export default class CodeProEditor {
    static getThemes() {
        return ['light', 'dark'];
    }
    // The marker used to enable cursor synchronization.
    static TINY_MARKER_CLASS = 'tiny_codepro-marker';
    static MARKER = '\u200B';
    static MarkerType = {
        none: 0,
        atElement: 1,
        atCursor: 2
    };
    /**
     * @member {HTMLElement} parentElement
     * @member {CodeMirrorView} editorView
     * @member {Record<string,*>} config
     * @member {CursorSync} cursorSync
     */
    parentElement;
    editorView;
    config;
    cursorSync;
    /**
     * @param {HTMLElement} parentElement
     * @param {Record<string, any>} [options]
     */
    constructor(parentElement, options) {
        // Default configuration.
        this.config = {
            themeName: options?.theme ?? 'light',
            fontSize: options?.fontSize ?? 11,
            lineWrapping: options?.lineWrapping ?? false,
            minimap: options?.minimap ?? true,
            changesListener: options?.changesListener,
            commands: options.commands,
            onblur: options.onblur
        };

        this.parentElement = parentElement;
        this.editorView = new EditorView({
            state: this._createState(options.doc),
            parent: this.parentElement
        });
        this.cursorSync = new CursorSync(this.editorView, CodeProEditor.MARKER, CodeProEditor.TINY_MARKER_CLASS);
        if (options.doc) {
            this.cursorSync.scrollToCaretPosition(options?.head);
        }

        // Make sure that any changes on the parent dimensions, will triger a view requestMeasure.
        this.resizeObserver = new ResizeObserver(() => {
            // No need to check entries here, as we only observe one element.
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
     * @param {string} [html] - The initial html.
     * @returns {*} a new State.
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
        if (typeof (this.config.onblur) === 'function') {
            extensions.push(EditorView.domEventHandlers({
                blur: (event) => {
                    this.config.onblur(event);
                    return false;
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
                    // Stores the preferences from this editor.
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
        const view = this.editorView;
        view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: source || '' },
            annotations: [Transaction.addToHistory.of(false)]
        });
        this.cursorSync.scrollToCaretPosition();
        view.focus();
    }

    /**
     * Gets the html source code
     * @param {number} [marker]
     * @returns {string}
     */
    getValue(marker) {
        if (marker === CodeProEditor.MarkerType.atCursor) {
            return this.cursorSync.getValueWithMarkerAtCursor();
        } else if (marker === CodeProEditor.MarkerType.atElement) {
            return this.cursorSync.getValueWithMarkerAtElement();
        }
        return this.editorView.state.doc.toString();
    }

    /**
     * Sets the selection.
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
     * Gets the current editor's view state properties.
     * @returns {{html: string, head: number, selection: {anchor: number, head: number}}}
     */
    getState() {
        const state = this.editorView.state;
        const range = state.selection.ranges[0] || { from: 0, to: 0 };
        return {
            html: state.doc.toString(),
            head: range.to,
            selection: { anchor: range.from, head: range.to }
        };
    }

    /**
     * Creates light or dark themes dynamically for an specific fontSize.
     * @param {string} [themeName]
     * @returns {*[] | null} - The theme effects.
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
     * Sets light or dark themes dynamically for an specific fontSize.
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
     * Toogles light or dark themes dynamically for an specific fontSize.
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
     * Gets the current font size.
     * @returns {number}
     */
    getFontsize() {
        return this.config.fontSize;
    }

    /**
     * Increases the font size up to a MAX_FONTSIZE.
     */
    increaseFontsize() {
        if (this.config.fontSize > MAX_FONTSIZE) {
            return;
        }
        this.config.fontSize += 1;
        this.setTheme();
    }

    /**
     * Decreases the font size down to a MIN_FONTSIZE.
     */
    decreaseFontsize() {
        if (this.config.fontSize < MIN_FONTSIZE) {
            return;
        }
        this.config.fontSize -= 1;
        this.setTheme();
    }

    /**
     * Enable/disable linewrapping dynamically.
     */
    toggleLineWrapping() {
        this.config.lineWrapping = !this.config.lineWrapping;
        this.editorView.dispatch({
            effects: this.linewrapConfig.reconfigure(this.config.lineWrapping ? [EditorView.lineWrapping] : [])
        });
        return this.config.lineWrapping;
    }

    /**
     * Show/hide minimap dynamically.
     */
    toggleMinimap() {
        this.config.minimap = !this.config.minimap;
        this.editorView.dispatch({
            effects: this.minimapConfig.reconfigure(this._createMinimap())
        });
        this.editorView.focus();
        // Issue:: Need to scroll to ensure minimap is rerendered.
        this.editorView.dispatch({
            scrollIntoView: true
        });
        return this.config.minimap;
    }

    /**
     * Focus onto the editor.
     */
    focus() {
        if (!this.editorView.hasFocus) {
            this.editorView.focus();
        }
    }
}

