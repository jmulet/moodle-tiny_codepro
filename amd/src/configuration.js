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
 * Tiny IBSnippet plugin.
 *
 * @module      tiny_ibsnippet/plugin
 * @copyright   2023 Josep Mulet Pol <pmulet@iedib.net>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {component as buttonName} from './common';

const configureMenu = (menu) => {
    // Replace original items with the new one
    menu.view.items = menu.view.items.replace(/code /g, buttonName + " ");
    menu.tools.items = menu.tools.items.replace(/code /g, buttonName + " ");
    return menu;
};

const configureToolbar = (toolbar) => {
    // The toolbar contains an array of named sections.
    // The Moodle integration ensures that there is a section called 'history'.
    return toolbar.map((section) => {
        if (section.name === 'history') {
            // Insert the button at the start of it.
            section.items.unshift(buttonName);
        }
        return section;
    });
};

export const configure = (instanceConfig) => {
    return {
        menu: configureMenu(instanceConfig.menu),
        toolbar: configureToolbar(instanceConfig.toolbar),
    };
};
