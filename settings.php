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
    $ADMIN->add('editortiny', new admin_category('tiny_codepro', new lang_string('pluginname', $pluginname)));

    if ($ADMIN->fulltree) {
        $settings->add(new admin_setting_configcheckbox(
            'tiny_codepro/autoprettify',
            new lang_string('autoprettify', $pluginname),
            new lang_string('autoprettify_def', $pluginname),
            1
        ));

        $choices0 = [
            'none' => new lang_string('synccaretnone', $pluginname),
            'forward' => new lang_string('synccaretforward', $pluginname),
            'both' => new lang_string('synccaretboth', $pluginname),
        ];
        $settings->add(new admin_setting_configselect(
            'tiny_codepro/synccaret',
            new lang_string('synccaret', $pluginname),
            new lang_string('synccaret_def', $pluginname),
            'forward',
            $choices0
        ));

        $userconf = new lang_string('opt_confuser', $pluginname);
        $choices1 = [
            'dialog' => new lang_string('opendialog', $pluginname),
            'panel' => new lang_string('openpanel', $pluginname),
            'user:dialog' => new lang_string('opt_defdialog', $pluginname) . ' + ' . $userconf,
            'user:panel' => new lang_string('opt_defpanel', $pluginname) . ' + ' . $userconf,
        ];

        $settings->add(new admin_setting_configselect(
            'tiny_codepro/uimode',
            new lang_string('uimode', $pluginname),
            new lang_string('uimode_def', $pluginname),
            'user:dialog',
            $choices1
        ));

        // Disabling on certain pages.
        $settings->add(new admin_setting_configtext(
            'tiny_codepro/disableonpagesregex',
            new lang_string('disableonpagesregex', $pluginname),
            new lang_string('disableonpagesregex_def', $pluginname),
            '',
            PARAM_TEXT
        ));

        // Controlling TinyMCE content filtering options.

        $settings->add(new admin_setting_configtext(
            'tiny_codepro/extendedvalidelements',
            new lang_string('extendedvalidelements', $pluginname),
            new lang_string('extendedvalidelements_def', $pluginname),
            '*[*],svg[*],math[*],script[*],style[*]',
            PARAM_TEXT
        ));

        $settings->add(new admin_setting_configtext(
            'tiny_codepro/validchildren',
            new lang_string('validchildren', $pluginname),
            new lang_string('validchildren_def', $pluginname),
            '+body[script],+button[div|p|span|strong|em],+p[tiny-svg-block],+span[tiny-svg-block]',
            PARAM_TEXT
        ));

        $settings->add(new admin_setting_configtext(
            'tiny_codepro/customelements',
            new lang_string('customelements', $pluginname),
            new lang_string('customelements_def', $pluginname),
            'script,~svg,~tiny-svg-block',
            PARAM_TEXT
        ));
    }
}
