import { describe, expect, it } from 'vitest';
import { build_svelte_docs_urls, slugify_svelte_docs_heading } from './svelte-docs-url.js';

describe('slugify_svelte_docs_heading', () => {
	it('matches punctuation and markup used by Svelte documentation headings', () => {
		expect(slugify_svelte_docs_heading('`<script lang="ts">`')).toBe('script-lang-ts');
		expect(slugify_svelte_docs_heading('`$inspect(...).with`')).toBe('$inspect().with');
		expect(slugify_svelte_docs_heading('animation_missing_key')).toBe('animation_missing_key');
	});
});

describe('build_svelte_docs_urls', () => {
	it('links preambles, top-level headings, and nested headings', () => {
		expect(
			build_svelte_docs_urls([
				{ document: 'docs-svelte-typescript.md', content: '<!-- preamble -->' },
				{ document: 'docs-svelte-typescript.md', content: '## `<script lang="ts">`' },
				{ document: 'docs-svelte-typescript.md', content: '## Preprocessor setup' },
				{ document: 'docs-svelte-typescript.md', content: '### Using Vite' },
				{ document: 'docs-svelte-$state.md', content: '### Deep state' }
			])
		).toEqual([
			'https://svelte.dev/docs/svelte/typescript',
			'https://svelte.dev/docs/svelte/typescript#script-lang-ts',
			'https://svelte.dev/docs/svelte/typescript#Preprocessor-setup',
			'https://svelte.dev/docs/svelte/typescript#Preprocessor-setup-Using-Vite',
			'https://svelte.dev/docs/svelte/$state#Deep-state'
		]);
	});
});
