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
 * @copyright   2023-2025 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {getButtonImage} from 'editor_tiny/utils';
import {get_strings} from 'core/str';
import {ViewDialogManager} from './viewdialog';
import {component, icon} from './common';
import {getDefaultUI, isPluginVisible} from './options';
import {ViewPanelManager} from './viewpanel';
import {getPref} from './preferences';

/**
 * Setups the TinyMCE editor
 * @returns {Promise<(editor: TinyMCE)=>void>}
 */
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
            {key: 'decreasefontsize', component},
            {key: 'increasefontsize', component}
        ]),
        getButtonImage('icon', component),
    ]);

    const [pluginName, ...translations] = strs;

    return async(editor) => {
        if (!isPluginVisible(editor)) {
            return;
        }
        // Register the Icon.
        editor.ui.registry.addIcon(icon, buttonImage.html);

        const viewManagers = {
            dialog: new ViewDialogManager(editor),
            panel: new ViewPanelManager(editor, {autosave: true, translations})
        };

        // Add command to show the code editor.
        editor.addCommand("mceCodeProEditor", () => {
            let uiMode = getDefaultUI(editor) ?? 'dialog';
            const canUserSwitchUI = uiMode.startsWith('user:');
            if (canUserSwitchUI) {
                uiMode = getPref('view', uiMode.substring(5));
            }
            const currentViewManager = viewManagers[uiMode] ?? viewManagers.dialog;
            currentViewManager.show();
        });

        // Register the Toolbar Button.
        editor.ui.registry.addButton(component, {
            icon,
            tooltip: pluginName,
            onAction: () => editor.execCommand("mceCodeProEditor", false)
        });

        // Add the Menu Item.
        // This allows it to be added to a standard menu, or a context menu.
        editor.ui.registry.addMenuItem(component, {
            icon,
            text: pluginName,
            onAction: () => editor.execCommand("mceCodeProEditor", false)
        });

        // Creates a View for holding the code editor as a panel
        // Only if it is going to be required
        const defaultUI = getDefaultUI(editor) ?? '';
        if (defaultUI === 'panel' || defaultUI.startsWith('user:')) {
            viewManagers.panel.create();
        }
    };
};