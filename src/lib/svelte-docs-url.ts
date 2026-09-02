type DocumentationSection = {
	document: string;
	content: string;
};

function clean_markdown(markdown: string) {
	return markdown
		.replace(/(^|\s)\*\*(.+?)\*\*(?=\s|$)/g, '$1$2')
		.replace(/(^|\s)_(.+?)_(?=\s|$)/g, '$1$2')
		.replace(/(^|\s)\*(.+?)\*(?=\s|$)/g, '$1$2')
		.replace(/`(.+?)`/g, '$1')
		.replace(/~~(.+?)~~/g, '$1')
		.replace(/\[(.+?)\]\(.+?\)/g, '$1')
		.trim();
}

export function slugify_svelte_docs_heading(heading: string) {
	return clean_markdown(heading)
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&')
		.replace(/&quot;/g, '"')
		.replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
		.replace(/&#(\d+);/g, (_, decimal: string) => String.fromCharCode(parseInt(decimal, 10)))
		.replace(/(’|&rsquo;)/g, "'")
		.replace(/<([a-z-]+)>(.*?)<\/\1>/g, '$2')
		.replace(/[<>]/g, '')
		.replace(/\.\.\./g, '')
		.replace(/[^a-zA-Z0-9-$(.):'_]/g, '-')
		.replace(/-{2,}/g, '-')
		.replace(/^-|-$/g, '');
}

function svelte_docs_page_url(document: string) {
	const match = /^docs-([^-]+)-(.+)\.md$/.exec(document);
	if (!match) throw new Error(`Cannot create a Svelte documentation URL for ${document}`);

	return `https://svelte.dev/docs/${match[1]}/${match[2]}`;
}

export function build_svelte_docs_urls(sections: DocumentationSection[]) {
	let current_document = '';
	let heading_slugs: string[] = [];

	return sections.map((section) => {
		if (section.document !== current_document) {
			current_document = section.document;
			heading_slugs = [];
		}

		const page_url = svelte_docs_page_url(section.document);
		const heading = /^(#{1,6})\s+(.+?)\s*#*\s*(?:\r?\n|$)/.exec(section.content);
		if (!heading) return page_url;

		const depth = heading[1].length;
		heading_slugs[depth - 1] = slugify_svelte_docs_heading(heading[2]);
		heading_slugs.length = depth;

		return `${page_url}#${heading_slugs.filter(Boolean).join('-')}`;
	});
}
