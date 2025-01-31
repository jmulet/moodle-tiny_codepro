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

import Modal from 'core/modal';
import ModalFactory from 'core/modal_factory';
import ModalRegistry from 'core/modal_registry';

class CodeProModal extends Modal {
    static TYPE = 'tiny_codepro/modal';
    static TEMPLATE = 'tiny_codepro/modal';

    registerEventListeners() {
        // Call the parent registration.
        super.registerEventListeners();
    }
}

ModalRegistry.register(CodeProModal.TYPE, CodeProModal, CodeProModal.TEMPLATE);

/**
 * @param {*} opts
 * @returns {Promise<*>}
 */
export function createModal(opts) {
    let modalPromise;
    if (CodeProModal.create) {
        // On newer versions, create directly from modal class.
        modalPromise = CodeProModal.create({
            large: true,
            ...opts
        });
    } else {
        // On old versions of Moodle, use ModalFactory
        modalPromise = ModalFactory.create({
            type: CodeProModal.TYPE,
            large: true,
            ...opts
        });
    }
    return modalPromise;
}
