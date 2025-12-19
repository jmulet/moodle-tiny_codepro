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

import { getUserPrefs } from "./options";
import { getRemoteService } from "./remotesrv";

/**
 * Default preferences
 */
const defaultPrefs = {
    theme: "light",
    wrap: true,
    fs: false,
    fontsize: 11,
    minimap: true,
    view: undefined,
};

/**
 * Preferences service (stateful)
 */
class PreferencesService {
    static SAVE_DELAY = 1000; // ms
    /**
     * @param {TinyMCEEditor} editor
     */
    constructor(editor) {
        this.editor = editor;
        this.preferences = this._loadPrefs();
        // Never force saving default prefs.
        this._lastSavedJson = JSON.stringify(this.preferences);
        this._saveTimeout = null;
        this._dirty = false;
    }

    /**
     * Load preferences from remote / local storage
     * @returns {object}
     */
    _loadPrefs() {
        const remotePrefsJson = getUserPrefs(this.editor);
        const localPrefsJson = localStorage.getItem("tiny-codepro");

        let storedParsed = {};

        try {
            if (remotePrefsJson) {
                storedParsed = JSON.parse(remotePrefsJson);
            } else if (localPrefsJson) {
                const localPrefs = JSON.parse(localPrefsJson);
                // Migrate old local prefs to remote
                getRemoteService().saveUserPref(localPrefsJson);
                storedParsed = localPrefs;
            }
        } catch (ex) {
            // eslint-disable-next-line no-console
            console.error("Cannot parse JSON user preferences", ex);
        }

        return { ...defaultPrefs, ...storedParsed };
    }

    /**
     * Get a preference value
     * @param {string} key
     * @param {*} [def]
     * @returns {*}
     */
    get(key, def) {
        return this.preferences[key] ?? def;
    }

    /**
     * Set a preference value
     * @param {string} key
     * @param {*} value
     * @param {boolean} [save=true]
     */
    set(key, value, save = true) {
        this._dirty = this._dirty || this.preferences[key] !== value;
        this.preferences[key] = value;
        if (save && this._dirty) {
            this._scheduleSave();
        }
    }

    _scheduleSave() {
        if (this._saveTimeout) {
            clearTimeout(this._saveTimeout);
        }
        this._saveTimeout = setTimeout(() => this._save(), PreferencesService.SAVE_DELAY);
    }

    /**
     * Save preferences (remote + local)
     * @param {object} [prefs]
     */
    _save(prefs = this.preferences) {
        if (this._saveTimeout) {
            clearTimeout(this._saveTimeout);
        }
        const json = JSON.stringify(prefs);
        if (json === this._lastSavedJson) {
            return;
        }
        this._lastSavedJson = json;
        // Keep local copy for backward compatibility
        localStorage.setItem("tiny-codepro", json);
        this._dirty = false;
        // Beware this call is async!
        getRemoteService().saveUserPref(json);
    }

    /**
     * Force save preferences (remote + local)
     */
    flush() {
        if (!this._dirty) {
            return;
        }
        this._save();
        this._dirty = false;
    }

    /**
     * Get all preferences
     * @returns {object}
     */
    all() {
        return { ...this.preferences };
    }
}

/**
 * Preferences service instances per editor
 * @type {Map<string, PreferencesService>}
 */
const instances = new Map();

/**
 * Get PreferencesService for an editor
 *
 * @param {TinyMCEEditor} editor
 * @returns {PreferencesService}
 */
const getPreferencesSrv = (editor) => {
    if (!editor) {
        throw new Error("PreferencesService requires an editor instance");
    }

    if (!instances.has(editor.id)) {
        instances.set(editor.id, new PreferencesService(editor));
    }

    return instances.get(editor.id);
};

export { PreferencesService, getPreferencesSrv };