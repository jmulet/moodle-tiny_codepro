import {nodeResolve} from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default {
	input: 'cm6pro.js',
	output: {
        sourcemap: true,
		file: './dist/cm6pro.min.js',
		format: 'umd',
        name: 'cm6pro',
        plugins: [
            terser()
        ]
	},
    plugins: [nodeResolve()]
};