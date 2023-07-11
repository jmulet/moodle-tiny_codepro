import {nodeResolve} from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default {
	input: 'index.js',
	output: {
		file: 'dist/editor.bundle.js',
		format: 'umd',
        name: 'cm6',
        plugins: [
            terser()
        ]
	},
    plugins: [nodeResolve()]
};