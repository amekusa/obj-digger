const config = {
	input: 'src/index.js',
	output: {
		file: './index.js',
		format: 'umd',
		name: 'obj-digger',
		sourcemap: true,
		validate: true
	}
};

export default config;
