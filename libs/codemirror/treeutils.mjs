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
 * Tiny CodePro plugin. Thin wrapper around CodeMirror 6
 *
 * @module      tiny_codepro/plugin
 * @copyright   2024 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Recursively finds the tag name from a syntax tree node.
 * @param {Tree} node
 * @param {Text} doc
 * @returns {string|null}
 */
export function getTagNameFromCursor(node, doc) {
    const cursor = node.cursor();
    function findTagName(c) {
        if (c.name === "TagName") {
            return doc.sliceString(c.from, c.to);
        }
        if (c.firstChild()) {
            do {
                const result = findTagName(c);
                if (result) return result;
            } while (c.nextSibling());
            c.parent();
        }
        return null;
    }
    return findTagName(cursor);
}

/**
 * Debug utility that prints the full syntax tree.
 * @param {EditorState} state
 */
export function printFullSyntaxTree(state) {
    const doc = state.doc;
    const tree = syntaxTree(state);
    const cursor = tree.topNode.cursor();

    function printNode(c, indent = 0) {
        const padding = "  ".repeat(indent);
        const content = doc.sliceString(c.from, c.to).replace(/\n/g, "\\n");
        console.log(`${padding}${c.name} [${c.from}, ${c.to}]: "${content}"`);

        if (c.firstChild()) {
            do {
                printNode(c, indent + 1);
            } while (c.nextSibling());
            c.parent();
        }
    }

    printNode(cursor);
}

/**
 * Debug utility that prints the path from a node to the root with siblings.
 * @param {Tree} node
 * @param {Text} doc
 */
export function printTreePathToRoot(node, doc) {
    const path = [];
    const cursor = node.cursor();

    do {
        const siblings = [];
        const siblingCursor = cursor.node.parent?.cursor();
        if (siblingCursor?.firstChild()) {
            do {
                const sFrom = siblingCursor.from;
                const sTo = siblingCursor.to;
                const sText = doc.sliceString(sFrom, sTo).replace(/\n/g, "\\n");
                const isCurrent = siblingCursor.from === cursor.from && siblingCursor.to === cursor.to;
                siblings.push(`${isCurrent ? "\uD83D\uDC49 " : "   "}${siblingCursor.name} [${sFrom}, ${sTo}]: "${sText}"`);
            } while (siblingCursor.nextSibling());
        }

        path.push(siblings);
    } while (cursor.parent());

    console.log("Tree path from node to root with siblings:");
    path.forEach((siblings, level) => {
        const indent = "  ".repeat(level);
        siblings.forEach(line => console.log(indent + line));
    });
}
