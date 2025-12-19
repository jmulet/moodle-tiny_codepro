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

import { getButtonImage } from 'editor_tiny/utils';
import { get_strings } from 'core/str';
import { ViewDialogManager } from './viewdialog';
import { component, icon } from './common';
import { getValidElements, getValidChildren, getCustomElements, getDefaultUI, isPluginVisible } from './options';
import { ViewPanelManager } from './viewpanel';
import { getPreferencesSrv } from './preferences';

/**
 * Setups the TinyMCE editor
 * @returns {Promise<(editor: TinyMCE)=>void>}
 */
export const getSetup = async () => {
    const [
        strs,
        buttonImage,
    ] = await Promise.all([
        get_strings([
            { key: 'pluginname', component },
            { key: 'opendialog', component },
            { key: 'fullscreen', component },
            { key: 'themes', component },
            { key: 'linewrap', component },
            { key: 'prettify', component },
            { key: 'decreasefontsize', component },
            { key: 'increasefontsize', component }
        ]),
        getButtonImage('icon', component),
    ]);

    const [pluginName, ...translations] = strs;

    return async (editor) => {
        const preferencesSrv = getPreferencesSrv(editor);

        if (!isPluginVisible(editor)) {
            // Must register the menu items with the basic code editor command.
            editor.ui.registry.addMenuItem(component, {
                icon: 'sourcecode',
                text: 'Source code',
                onAction: () => editor.execCommand("mceCodeEditor", false)
            });
            return;
        }

        editor.on('PreInit', () => {
            const schema = editor.parser?.schema;
            if (!schema) {
                return;
            }
            // Apply HTML filtering options to the editor parser instance.
            const customElements = (getCustomElements(editor) ?? '').trim();
            if (customElements) {
                schema.addCustomElements(customElements);
            }

            const validElements = (getValidElements(editor) ?? '').trim();
            if (validElements) {
                schema.addValidElements(validElements);
            }

            const validChildren = (getValidChildren(editor) ?? '').trim();
            if (validChildren) {
                schema.addValidChildren(validChildren);
            }
        });

        // Register the Icon.
        editor.ui.registry.addIcon(icon, buttonImage.html);

        /**
         * Lazy init viewManagers
         * @type {Record<string, import('./viewmanager').ViewManager>}
         */
        const _viewManagers = {};
        /**
         * @param {string} name
         * @returns {import('./viewmanager').ViewManager}
         **/
        const getViewManager = (name) => {
            let instance = _viewManagers[name];
            if (instance) {
                return instance;
            }
            if (name === 'panel') {
                instance = new ViewPanelManager(editor, { autosave: true, translations });
            } else {
                instance = new ViewDialogManager(editor);
            }
            _viewManagers[name] = instance;
            return instance;
        };

        // Add command to show the code editor.
        editor.addCommand("mceCodeProEditor", () => {
            let uiMode = getDefaultUI(editor) ?? 'dialog';
            if (uiMode.startsWith('user:')) {
                uiMode = preferencesSrv.get('view', uiMode.substring(5));
            }
            // Make sure preference is in sync
            preferencesSrv.set('view', uiMode);
            getViewManager(uiMode).show();
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
            getViewManager('panel')._tCreate();
        }
    };
};