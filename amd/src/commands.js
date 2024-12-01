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
import {get_string as getString} from 'core/str';
import {handleAction} from './ui';
import {component, icon} from './common';
import {isPluginVisible} from './options';

export const getSetup = async() => {
    const [
        pluginName,
        buttonImage,
    ] = await Promise.all([
        getString('pluginname', component),
        getButtonImage('icon', component),
    ]);

    return (editor) => {
        if (!isPluginVisible(editor)) {
            return;
        }
        // Register the Icon.
        editor.ui.registry.addIcon(icon, buttonImage.html);

        // Register the Toolbar Button.
        editor.ui.registry.addButton(component, {
            icon,
            tooltip: pluginName,
            onAction: () => handleAction(editor),
            enabled: false,
            onSetup: (api) => {
                const cb = () => api.setEnabled(true);
                editor.on('SetContent', cb);
                return () => editor.off('SetContent', cb);
            }
        });

        // Add the Menu Item.
        // This allows it to be added to a standard menu, or a context menu.
        editor.ui.registry.addMenuItem(component, {
            icon,
            text: pluginName,
            onAction: () => handleAction(editor)
        });
    };
};