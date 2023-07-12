import {nodeResolve} from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default {
	input: 'index.js',
	output: {
        sourcemap: true,
		file: './dist/cm6-lazy.min.js',
		format: 'umd',
        name: 'cm6',
        plugins: [
            terser()
        ]
	},
    plugins: [nodeResolve()]
};