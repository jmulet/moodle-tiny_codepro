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
 * @copyright   2023-2026 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Modal from 'core/modal';

class CodeProModal extends Modal {
    static TYPE = 'tiny_codepro/modal';
    static TEMPLATE = 'tiny_codepro/modal';

    registerEventListeners() {
        // Call the parent registration.
        super.registerEventListeners();
    }
}

// For Moodle < 4.3, Modal.create() did not exist yet so ModalFactory is used instead.
// ModalFactory resolves the class by type string via ModalRegistry, so both must be loaded.
// In Moodle 4.3+, cls.create() is called directly on the subclass — no registry needed.
/** @type {Promise<object|null>} */
const _modalFactoryPromise = (async () => {
    if (typeof Modal.create === 'function') {
        // Moodle 4.3+: direct subclass create(), neither ModalFactory nor ModalRegistry needed.
        return null;
    }
    // Moodle < 4.3: register modals so ModalFactory can look them up by type string.
    await import('core/modal_registry')
        .then(m => {
            const ModalRegistry = m.default ?? m;
            ModalRegistry.register(CodeProModal.TYPE, CodeProModal, CodeProModal.TEMPLATE);
        })
        .catch(() => { });
    const m = await import('core/modal_factory').catch(() => null);
    return m ? (m.default ?? m) : null;
})();

/**
 * @param {*} opts
 * @returns {Promise<*>}
 */
export async function createModal(opts) {
    const options = {
        large: true,
        type: CodeProModal.TYPE,
        ...opts
    };
    let modal;
    if (CodeProModal.create) {
        // Moodle 4.3+: static create() handles template rendering and instantiation
        modal = await CodeProModal.create(options);
    } else {
        // Moodle < 4.3: legacy ModalFactory fallback
        const ModalFactory = await _modalFactoryPromise;
        modal = await ModalFactory.create(options);
    }
    return modal;
}
