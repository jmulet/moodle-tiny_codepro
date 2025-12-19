<?php
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
 * Tiny CodePro plugin version details.
 *
 * @package     tiny_codepro
 * @copyright   2023-2025 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_codepro;

use context;
use editor_tiny\plugin;
use editor_tiny\plugin_with_buttons;
use editor_tiny\plugin_with_configuration;
use editor_tiny\plugin_with_menuitems;

/**
 * Gets the value of a configuration key with a default fallback.
 *
 * @param object $cfg       The configuration object.
 * @param string $key       The key to check in the configuration object.
 * @param mixed  $default   The default value to return if the key is not found.
 *
 * @return mixed The value of the key if it exists, or the default value.
 */
function tiny_codepro_cfgwithdefault(object $cfg, string $key, $default) {
    return property_exists($cfg, $key) ? $cfg->$key : $default;
}

/**
 * Summary of plugininfo
 */
class plugininfo extends plugin implements
    plugin_with_buttons,
    plugin_with_configuration,
    plugin_with_menuitems {
    /**
     * Get the editor buttons for this plugins
     *
     * @return array
     */
    public static function get_available_buttons(): array {
        return [
            'tiny_codepro/codepro',
        ];
    }
    /**
     * Get the dropdown menu items for this plugin
     *
     * @return array
     */
    public static function get_available_menuitems(): array {
        return [
            'tiny_codepro/codepro',
        ];
    }

    /**
     * Get the configuration for the plugin, capabilities and
     * config (from settings.php)
     *
     * @param context $context
     * @param array $options
     * @param array $fpoptions
     * @param \editor_tiny\editor|null $editor
     * @return void
     *
     * @return array
     */
    public static function get_plugin_configuration_for_context(
        context $context,
        array $options,
        array $fpoptions,
        ?\editor_tiny\editor $editor = null
    ): array {
        global $CFG;

        // Decide if to enable the plugin?
        $showplugin = has_capability('tiny/codepro:viewplugin', $context);

        $params = ['showplugin' => $showplugin];

        if ($showplugin) {
            $cfg = get_config('tiny_codepro');
            $params['disableonpagesregex'] = trim(tiny_codepro_cfgwithdefault($cfg, 'disableonpagesregex', ''));
            $params['autoprettify'] = tiny_codepro_cfgwithdefault($cfg, 'autoprettify', 1) == 1;
            $params['synccaret'] = tiny_codepro_cfgwithdefault($cfg, 'synccaret', 'forward');
            $params['uimode'] = tiny_codepro_cfgwithdefault($cfg, 'uimode', 'user:dialog');
            // Content filtering options.
            $params['customelements'] = trim(tiny_codepro_cfgwithdefault($cfg, 'customelements', ''));
            $params['extendedvalidelements'] = trim(tiny_codepro_cfgwithdefault($cfg, 'extendedvalidelements', ''));
            $params['validchildren'] = trim(tiny_codepro_cfgwithdefault($cfg, 'validchildren', ''));
            $params['userprefs'] = get_user_preferences('tiny_codepro_userprefs', '');
        }
        return $params;
    }
}
