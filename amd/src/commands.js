/* eslint-disable camelcase */
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

import {getButtonImage} from 'editor_tiny/utils';
import {get_strings} from 'core/str';
import {displayDialogue} from './ui';
import {component, icon} from './common';
import {getDefaultUI, isPluginVisible} from './options';
import {createView} from './view';
import {getPref} from './preferences';

/**
 * Share the state among editor Views
 * @type {*}
 **/
export const blackboard = {};

export const getSetup = async() => {
    const [
        strs,
        buttonImage,
    ] = await Promise.all([
        get_strings([
            {key: 'pluginname', component},
            {key: 'opendialog', component},
            {key: 'fullscreen', component},
            {key: 'themes', component},
            {key: 'linewrap', component},
            {key: 'prettify', component},
        ]),
        getButtonImage('icon', component),
    ]);

    const [pluginName, translations] = strs;

    const handleClickAction = (editor) => {
        let defaultUI = getDefaultUI(editor) ?? 'dialog';
        let canUserSwitchUI = defaultUI.startsWith('user:');
        if (canUserSwitchUI) {
            defaultUI = getPref('view', defaultUI.substring(5));
        }
        if (defaultUI === 'dialog') {
            // Show editor in a modal dialogue
            displayDialogue(editor);
        } else {
            // Show editor as a view panel
            editor.execCommand('ToggleView', false, 'codepro');
        }
    };

    return async(editor) => {
        if (!isPluginVisible(editor)) {
            return;
        }
        // Register the Icon.
        editor.ui.registry.addIcon(icon, buttonImage.html);

        // Register the Toolbar Button.
        editor.ui.registry.addButton(component, {
            icon,
            tooltip: pluginName,
            onAction: () => handleClickAction(editor)
        });

        // Add the Menu Item.
        // This allows it to be added to a standard menu, or a context menu.
        editor.ui.registry.addMenuItem(component, {
            icon,
            text: pluginName,
            onAction: () => handleClickAction(editor)
        });

        // Creates a View for holding the code editor as panel
        // Only if it is going to be required
        const defaultUI = getDefaultUI(editor) ?? '';
        if (defaultUI === 'panel' || defaultUI.startsWith('user:')) {
            editor.ui.registry.addView('codepro', createView(editor, translations));
        }
    };
};