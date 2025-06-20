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

import {getPluginOptionName} from 'editor_tiny/options';
import {pluginName, isPanelCapable} from './common';

const showPlugin = getPluginOptionName(pluginName, 'showplugin');
const autoPrettify = getPluginOptionName(pluginName, 'autoprettify');
const uiMode = getPluginOptionName(pluginName, 'uimode');
const syncCaret = getPluginOptionName(pluginName, 'synccaret');
const validElements = getPluginOptionName(pluginName, 'extendedvalidelements');
const validChildren = getPluginOptionName(pluginName, 'validchildren');
const customElements = getPluginOptionName(pluginName, 'customelements');
const panelCapable = getPluginOptionName(pluginName, 'panelcapable');
const disableOnPages = getPluginOptionName(pluginName, 'disableonpagesregex');

/**
 * @param {TinyMCE} editor
 * @param {string} majorVersion
 * @param {string} minorVersion
 */
export const register = (editor, majorVersion, minorVersion) => {
    const registerOption = editor.options.register;

    registerOption(showPlugin, {
        processor: 'boolean',
        "default": true,
    });

    registerOption(autoPrettify, {
        processor: 'boolean',
        "default": true,
    });

    registerOption(syncCaret, {
        processor: 'string',
        "default": 'forward',
    });

    registerOption(uiMode, {
        processor: 'string',
        "default": 'user:dialog',
    });

    registerOption(validElements, {
        processor: 'string',
        "default": '',
    });

    registerOption(validChildren, {
        processor: 'string',
        "default": '',
    });

    registerOption(customElements, {
        processor: 'string',
        "default": '',
    });

    registerOption(panelCapable, {
        processor: 'boolean',
        "default": isPanelCapable(majorVersion, minorVersion),
    });

    registerOption(disableOnPages, {
        processor: 'string',
        "default": '',
    });

};


/**
 * Get the permissions configuration for the Tiny plugin.
 *
 * @param {TinyMCE} editor
 * @returns {boolean}
 */
export const isPluginVisible = (editor) => {
    // A regular expression used to match the body.id of HTML pages on which the plugin should be disabled.
    const expr = editor.options.get(disableOnPages)?.trim() ?? '';
    let isEnabled = true;
    if (expr) {
        try {
            isEnabled = !RegExp(expr).test(document.body.id ?? '');
        } catch (ex) {
            console.error(ex);
        }
    }
    return isEnabled && editor.options.get(showPlugin);
};

/**
 * Should prettify the HTML code when the CodeMirror editor opens?
 *
 * @param {TinyMCE} editor
 * @returns {boolean}
 */
export const isAutoFormatHTML = (editor) => editor.options.get(autoPrettify);

/**
 * Should the cursor position be synchronized between TinyMCE and CodeMirror?
 * @param {TinyMCE} editor
 * @returns {string}
 */
export const getSyncCaret = (editor) => editor.options.get(syncCaret);

/**
 * How to render the HTML editor?
 * dialog - It opens always as a dialog
 * panel - It opens always as a panel
 * user:dialog - The user is allowed to change the setting; defaults to dialog
 * user:panel - The user is allowed to change the setting; defaults to panel
 * @param {TinyMCE} editor
 * @returns {string}
 */
export const getDefaultUI = (editor) => {
    // Version Moodle 4.1 uses Tiny 6.2.0.
    // View API is available only since Tiny 6.6.2
    if (typeof editor.ui.registry.addView !== 'function' || !editor.options.get(panelCapable)) {
        return 'dialog';
    }
    return editor.options.get(uiMode);
};

/**
 * Determines whether the editor is in fullscreen or not
 * @param {TinyMCE} editor
 * @returns {boolean}
 */
export const isFullscreen = (editor) => editor.container.classList.contains('tox-fullscreen');

/**
 * The valid HTML elements
 * @param {TinyMCE} editor
 * @returns {string}
 */
export const getValidElements = (editor) => editor.options.get(validElements);

/**
 * The valid HTML children definition
 * @param {TinyMCE} editor
 * @returns {string}
 */
export const getValidChildren = (editor) => editor.options.get(validChildren);

/**
 * The custom non-HTML standard elements
 * @param {TinyMCE} editor
 * @returns {string}
 */
export const getCustomElements = (editor) => editor.options.get(customElements);
