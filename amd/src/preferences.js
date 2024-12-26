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

const preferences = {
    theme: "light", /** Light vs dark themes */
    wrap: false, /** Wrap long lines */
    fs: false, /** Fullscreen mode */
    fontsize: 11, /** Editor fontsize */
    view: undefined, /** Which UI is used to display the HTML editor */
};

const storedPreferences = localStorage.getItem("tiny-codepro");
if (storedPreferences) {
    let storedParsed = {};
    try {
        storedParsed = JSON.parse(storedPreferences);
    } catch (ex) {
        // eslint-disable-next-line no-console
        console.error("Cannot parse JSON", storedPreferences);
    }
    Object.assign(preferences, storedParsed);
}

/**
 * @param {string} key The preference key
 * @param {*} [def] The default value (optional)
 * @returns the preference value
 */
const getPref = (key, def) => {
    return preferences[key] ?? def;
};

/**
 * Saves the preferences
 */
const savePrefs = () => {
    localStorage.setItem("tiny-codepro", JSON.stringify(preferences));
};

/**
 * @param {*} key The preference key
 * @param {*} value The preference value
 * @param {*} save Whether to save the preference or not (optional)
 */
const setPref = (key, value, save) => {
    preferences[key] = value;
    if (save) {
        savePrefs();
    }
};

export {getPref, setPref, savePrefs};
