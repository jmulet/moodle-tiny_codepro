<?php
// This file is part of Moodle - https://moodle.org/
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
// along with Moodle.  If not, see <https://www.gnu.org/licenses/>.

/**
 * Tiny WidgetHub plugin version details.
 *
 * @package     tiny_codepro
 * @copyright   2023-2025 Josep Mulet <pep.mulet@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

if ($hassiteconfig) {
    $pluginname = 'tiny_codepro';
    $settingspage = new admin_settingpage('tiny_codepro_pluginsettings', get_string('manage', $pluginname));

    if ($ADMIN->fulltree) {
        $settingspage->add(new admin_setting_configcheckbox(
            'tiny_codepro/autoprettify',
            get_string('autoprettify', $pluginname),
            get_string('autoprettify', $pluginname),
            1
        ));

        $settingspage->add(new admin_setting_configcheckbox(
            'tiny_codepro/synccaret',
            get_string('synccaret', $pluginname),
            get_string('synccaret', $pluginname),
            1
        ));

        $choices1 = [
            'dialog' => 'Open as dialog',
            'panel' => 'Open as view panel',
            'user:dialog' => 'User configurable; defaults to dialog',
            'user:panel' => 'User configurable; defaults to panel',
        ];

        $settingspage->add(new admin_setting_configselect(
            'tiny_codepro/uimode',
            get_string('uimode', $pluginname),
            get_string('uimode', $pluginname),
            'user:dialog',
            $choices1
        ));
    }

    $ADMIN->add('editortiny', $settingspage);
}
