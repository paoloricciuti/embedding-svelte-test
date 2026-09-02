import fs from 'node:fs/promises';

const docs_content = await fetch('https://svelte.dev/docs/experimental/sections.json').then((res) =>
	res.json()
);

const promises: Array<Promise<void>> = [];

for (const doc of Object.values<{ slug: string }>(docs_content)) {
	promises.push(
		(async () => {
			const doc_content = await fetch(`https://svelte.dev/${doc.slug}/llms.txt`).then((res) =>
				res.text()
			);
			await fs.writeFile(`src/lib/docs/${doc.slug.replaceAll('/', '-')}.md`, doc_content);
		})()
	);
}

await Promise.all(promises);
