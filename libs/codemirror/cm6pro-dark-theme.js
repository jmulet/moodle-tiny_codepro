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
 * @copyright   2023 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
*/
import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

const base00 = '#1f1f1f', 
    base01 = '#1a1a1a', 
    base02 = '#2e2e2e', 
    base03 = '#3d3d3d', 
    base04 = '#4d4d4d', 
    base05 = '#cccccc', // Text
    base06 = '#eee8d5', 
    base07 = '#fdf6e3', 
    base_red = '#dc322f', 
    base_orange = '#cb4b16', 
    base_yellow = '#d1a008', 
    base_green = '#a7bf06', 
    base_cyan = '#569cd6', 
    base_blue = '#268bd2', 
    base_violet = '#7e83e6', 
    base_magenta = '#d33682';

const invalid = '#d30102', 
    stone = base05, 
    darkBackground = '#1f1f1f', 
    highlightBackground = '#2e2e2e', 
    background = base00, 
    tooltipBackground = base01, 
    selection = '#3d3d3d',
    angle = '#808080',
    comment = '#638e50',
    cursor = base04;
/**
The editor theme styles for CodePro Dark theme.
*/
const cm6proDarkTheme = EditorView.theme({
    '&': {
        color: base05,
        backgroundColor: background
    },
    '.cm-content': {
        caretColor: cursor
    },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: cursor },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': { backgroundColor: selection },
    '.cm-panels': { backgroundColor: darkBackground, color: base04 },
    '.cm-panels.cm-panels-top': { borderBottom: '2px solid black' },
    '.cm-panels.cm-panels-bottom': { borderTop: '2px solid black' },
    '.cm-searchMatch': {
        backgroundColor: '#72a1ff59',
        outline: '1px solid #457dff'
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
        backgroundColor: '#6199ff2f'
    },
    '.cm-activeLine': { backgroundColor: highlightBackground },
    '.cm-selectionMatch': { backgroundColor: '#aafe661a' },
    '&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': {
        outline: `1px solid ${base06}`
    },
    '.cm-gutters': {
        backgroundColor: darkBackground,
        color: angle,
        border: 'none'
    },
    '.cm-activeLineGutter': {
        backgroundColor: highlightBackground
    },
    '.cm-foldPlaceholder': {
        backgroundColor: 'transparent',
        border: 'none',
        color: '#ddd'
    },
    '.cm-tooltip': {
        border: 'none',
        backgroundColor: tooltipBackground
    },
    '.cm-tooltip .cm-tooltip-arrow:before': {
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent'
    },
    '.cm-tooltip .cm-tooltip-arrow:after': {
        borderTopColor: tooltipBackground,
        borderBottomColor: tooltipBackground
    },
    '.cm-tooltip-autocomplete': {
        '& > ul > li[aria-selected]': {
            backgroundColor: highlightBackground,
            color: base04
        }
    }
}, { dark: true });
/**
The highlighting style for code in the CodePro Dark theme.
*/
// Workaround issue requirejs Moodle4.1.2
const HighlightStyleDef = HighlightStyle.define;
const cm6proDarkHighlightStyle = HighlightStyleDef([
    { tag: tags.keyword, color: base_green },
    {
        tag: [tags.name, tags.deleted, tags.character, tags.propertyName, tags.macroName],
        color: base_cyan
    },
    { tag: [tags.variableName], color: base05 },
    { tag: [tags.function(tags.variableName)], color: base_blue },
    { tag: [tags.labelName], color: base_magenta },
    {
        tag: [tags.color, tags.constant(tags.name), tags.standard(tags.name)],
        color: base_yellow
    },
    { tag: [tags.definition(tags.name), tags.separator], color: base_cyan },
    { tag: [tags.brace], color: base_magenta },
    {
        tag: [tags.annotation],
        color: invalid
    },
    {
        tag: [tags.number, tags.changed, tags.annotation, tags.modifier, tags.self, tags.namespace],
        color: base_magenta
    },
    {
        tag: [tags.typeName, tags.className],
        color: base_orange
    },
    {
        tag: [tags.operator, tags.operatorKeyword],
        color: base_violet
    },
    {
        tag: [tags.tagName],
        color: base_blue
    },
    {
        tag: [tags.squareBracket],
        color: base_red
    },
    {
        tag: [tags.angleBracket],
        color: angle
    },
    {
        tag: [tags.attributeName],
        color: base_cyan
    },
    {
        tag: [tags.regexp],
        color: invalid
    },
    {
        tag: [tags.quote],
        color: base_green
    },
    { tag: [tags.string], color: base_yellow },
    {
        tag: tags.link,
        color: base_cyan,
        textDecoration: 'underline',
        textUnderlinePosition: 'under'
    },
    {
        tag: [tags.url, tags.escape, tags.special(tags.string)],
        color: base_yellow
    },
    { tag: [tags.meta], color: base_red },
    { tag: [tags.comment], color: comment, fontStyle: 'italic' },
    { tag: tags.strong, fontWeight: 'bold', color: base06 },
    { tag: tags.emphasis, fontStyle: 'italic', color: base_green },
    { tag: tags.strikethrough, textDecoration: 'line-through' },
    { tag: tags.heading, fontWeight: 'bold', color: base_yellow },
    { tag: tags.heading1, fontWeight: 'bold', color: base07 },
    {
        tag: [tags.heading2, tags.heading3, tags.heading4],
        fontWeight: 'bold',
        color: base06
    },
    {
        tag: [tags.heading5, tags.heading6],
        color: base06
    },
    { tag: [tags.atom, tags.bool, tags.special(tags.variableName)], color: base_magenta },
    {
        tag: [tags.processingInstruction, tags.inserted, tags.contentSeparator],
        color: base_red
    },
    {
        tag: [tags.contentSeparator],
        color: base_yellow
    },
    { tag: tags.invalid, color: base_red, borderBottom: `1px dotted ${base_red}` }
]);
/**
Extension to enable the CodePro Dark theme (both the editor theme and
the highlight style).
*/
const cm6proDark = [
    cm6proDarkTheme,
    syntaxHighlighting(cm6proDarkHighlightStyle)
];

export { cm6proDark, cm6proDarkHighlightStyle, cm6proDarkTheme };
