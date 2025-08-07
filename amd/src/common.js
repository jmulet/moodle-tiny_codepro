/* eslint-disable max-len */
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

import * as Config from 'core/config';

const baseUrl = `${Config.wwwroot}/lib/editor/tiny/plugins/codepro`;
const component = 'tiny_codepro';

// --- Helper function to parse version string into comparable numbers ---
// This handles strings like "6", "6.0", "6.2", "6.2.1" and returns [major, minor, patch...]
// It also handles null, undefined, and blank strings by returning null.
/**
 * @param {string | undefined | null} version
 * @returns {number[] | null}
 */
function parseMinorVersion(version) {
        if (version === null || version === undefined || (typeof version === 'string' && version.trim() === '')) {
            return null;
        }
        // Convert to string to ensure split works
        const versionStr = String(version);
        return versionStr.split('.').map(Number);
}

/**
 * @param {string | number | null | undefined} majorVersion - Expected to be a whole integer (e.g., "6" or 6). Can be null, undefined, or blank.
 * @param {string | number | null | undefined} minorVersion - Expected format "6.2" or 6.2 (can be decimal like "6.2.1"). Can also be null, undefined, or blank.
 * @returns {boolean} - Whether the version passed is at least 6 / 6.2. Returns false for invalid, null, undefined, or blank inputs.
 */
function isPanelCapable(majorVersion, minorVersion) {
    const REQUIRED_MAJOR = 6;
    const REQUIRED_MINOR_WHOLE = 6; // Refers to the "6" in "6.2"
    const REQUIRED_MINOR_DECIMAL = 2; // Refers to the ".2" in "6.2"

    // --- Parse majorVersion ---
    // Since majorVersion is assumed to be a whole integer, we can use parseInt directly.
    let panelMajor;
    if (majorVersion === null || majorVersion === undefined || (typeof majorVersion === 'string' && majorVersion.trim() === '')) {
        panelMajor = null; // Treat as invalid if null, undefined, or blank
    } else {
        panelMajor = parseInt(String(majorVersion), 10);
        // If parseInt results in NaN (e.g., input was "abc"), treat as invalid
        if (isNaN(panelMajor)) {
            panelMajor = null;
        }
    }

    // --- Parse minorVersion ---
    const parsedMinorVersion = parseMinorVersion(minorVersion);

    // If either version is invalid/unparseable, consider it capable.
    if (panelMajor === null || parsedMinorVersion === null || parsedMinorVersion.length !== 2) {
        return true;
    }

    // --- Compare majorVersion against '6' ---
    if (panelMajor < REQUIRED_MAJOR) {
        return false; // E.g., majorVersion is 5.
    } else if (panelMajor > REQUIRED_MAJOR) {
        return true; // E.g., majorVersion is 7.
    }

    // --- If majorVersion is exactly '6', then compare minorVersion against '6.2' ---
    // (This block only executes if panelMajor === REQUIRED_MAJOR)

    const panelMinorMajorPart = parsedMinorVersion[0] || 0;   // E.g., 6 from "6.2"
    const panelMinorDecimalPart = parsedMinorVersion[1] || 0; // E.g., 2 from "6.2", default to 0 if no minor part (e.g., "6")

    // First, compare the main part of the minorVersion string (e.g., the '6' in "6.2")
    if (panelMinorMajorPart < REQUIRED_MINOR_WHOLE) {
        return false; // E.g., minorVersion "5.x" when required is "6.2"
    } else if (panelMinorMajorPart > REQUIRED_MINOR_WHOLE) {
        return true; // E.g., minorVersion "7.x" when required is "6.2"
    }

    // If the main part of the minorVersion string is exactly '6', then compare the decimal part (e.g., the '.2')
    // (This block only executes if panelMinorMajorPart === REQUIRED_MINOR_WHOLE)
    return panelMinorDecimalPart >= REQUIRED_MINOR_DECIMAL;
}

export default {
    baseUrl,
    component,
    pluginName: `${component}/plugin`,
    icon: `${component}`,
    MARKER: '\u200B',
    TINY_MARKER_CLASS: 'tiny_codepro-marker',
    isPanelCapable
};
