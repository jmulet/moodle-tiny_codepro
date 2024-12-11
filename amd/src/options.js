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
 * @copyright   2023 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {getPluginOptionName} from 'editor_tiny/options';
import {pluginName} from './common';

const showPlugin = getPluginOptionName(pluginName, 'showplugin');
const autoFormatHTML = getPluginOptionName(pluginName, 'autoFormatHTML');
const defaultUI = getPluginOptionName(pluginName, 'defaultUI');


export const register = (editor) => {
    const registerOption = editor.options.register;

    registerOption(showPlugin, {
        processor: 'boolean',
        "default": true,
    });

    registerOption(autoFormatHTML, {
        processor: 'boolean',
        "default": true,
    });

    registerOption(defaultUI, {
        processor: 'string',
        "default": 'dialogue',
    });
};


/**
 * Get the permissions configuration for the Tiny plugin.
 *
 * @param {TinyMCE} editor
 * @returns {boolean}
 */
export const isPluginVisible = (editor) => editor.options.get(showPlugin);

/**
 * Should prettify the HTML code when the CodeMirror editor opens?
 *
 * @param {TinyMCE} editor
 * @returns {boolean}
 */
export const isAutoFormatHTML = (editor) => editor.options.get(autoFormatHTML);

/**
 * How to render the HTML editor?
 *
 * @param {TinyMCE} editor
 * @returns {string}
 */
export const getDefaultUI = (editor) => editor.options.get(defaultUI);