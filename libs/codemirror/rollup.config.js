/* eslint-disable max-len */
import replace from '@rollup/plugin-replace';
import {nodeResolve} from '@rollup/plugin-node-resolve';

const banner = `
/** @ts-ignore */
/* eslint-disable */
`;

export default [
    {
        input: 'cm6pro.mjs',
        output: {
            sourcemap: false,
            file: '../../amd/src/cm6pro-lazy.js',
            format: 'esm',
            name: 'cm6pro',
            plugins: [],
            banner
        },
        plugins: [
            replace({
                preventAssignment: true,
                values: {
                    "const defaultHighlightStyle = /*@__PURE__*/HighlightStyle.define([":
                    "const HighlightStyleDefs = HighlightStyle.define;\nconst defaultHighlightStyle = /*@__PURE__*/HighlightStyleDefs(["
                },
                delimiters: ['', '']
            }),
            nodeResolve()
        ]
    },
    {
        input: 'htmlfy.mjs',
        output: {
            sourcemap: false,
            file: '../../amd/src/htmlfy-lazy.js',
            format: 'esm',
            name: 'htmlfy',
            plugins: [],
            banner
        },
        plugins: [
            nodeResolve()
        ]
    }
];