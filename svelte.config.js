import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		// Served from a GitHub Pages project page, so every asset URL needs the
		// repository name prefixed. Empty in dev so `vite dev` still works.
		paths: {
			base: process.env.BASE_PATH || ''
		}
	}
};

export default config;
