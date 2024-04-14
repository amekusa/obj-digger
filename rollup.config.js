import {env} from 'node:process';
const prod = env.NODE_ENV == 'production';

export default {
	input: 'src/index.js',
	output: {
		name: 'obj-digger',
		file: 'dist/index.cjs',
		format: 'cjs',
		sourcemap: !prod,
		validate: prod,
	}
};

