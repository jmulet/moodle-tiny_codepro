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
 * Tiny WidgetHub plugin.
 * Include all calls to core/ajax here.
 *
 * @module      tiny_widgethub/plugin
 * @copyright   2025 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/** @ts-ignore */
import { call as fetchMany } from 'core/ajax';

export class RemoteService {
    static USER_PREFS_KEY = 'tiny_codepro_userprefs';
    /**
     *
     * @param {string} serviceName
     * @param {object} args
     * @returns Promise<any>
     */
    _fetch(serviceName, args) {
        /** @ts-ignore */
        return fetchMany([{
            methodname: serviceName,
            args: args,
        }])[0];
    }
    /**
     *
     * @param {string} userPrefs
     * @returns Promise<boolean>
     */
    async saveUserPref(userPrefs) {
        try {
            await this._fetch('core_user_update_user_preferences', {
                preferences: [
                    {
                        type: RemoteService.USER_PREFS_KEY,
                        value: userPrefs,
                    }
                ]
            });
            return true;
        } catch (e) {
            return false;
        }
    }
}


/**
 * @type {RemoteService | null}
 */
let instance = null;
/**
 * @returns {RemoteService}
 */
export function getRemoteService() {
    if (!instance) {
        instance = new RemoteService();
    }
    return instance;
}