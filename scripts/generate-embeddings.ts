import fs from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from '@huggingface/transformers';
import { embedding_models } from '../src/lib/embedding-models.ts';

const docs_directory = path.resolve('src/lib/docs');
const output_directory = path.resolve('src/lib/embeddings');
const batch_size = Number.parseInt(process.env.EMBEDDING_BATCH_SIZE ?? '8', 10);
const selected_model_name = process.env.EMBEDDING_MODEL;

if (!Number.isInteger(batch_size) || batch_size < 1) {
	throw new Error('EMBEDDING_BATCH_SIZE must be a positive integer');
}

type DocSection = {
	document: string;
	section_index: number;
	content: string;
};

function split_markdown_sections(markdown: string) {
	const sections: string[] = [];
	let section_lines: string[] = [];
	let fence: { character: '`' | '~'; length: number } | null = null;

	function flush_section() {
		const section = section_lines.join('\n').trim();
		if (section) sections.push(section);
		section_lines = [];
	}

	for (const line of markdown.split(/\r?\n/)) {
		if (fence) {
			section_lines.push(line);
			const closing_fence = new RegExp(`^\\s*${fence.character}{${fence.length},}\\s*$`);
			if (closing_fence.test(line)) fence = null;
			continue;
		}

		const opening_fence = line.match(/^\s*(`{3,}|~{3,})/);
		if (opening_fence) {
			fence = {
				character: opening_fence[1][0] as '`' | '~',
				length: opening_fence[1].length
			};
			section_lines.push(line);
			continue;
		}

		if (/^#{1,6}\s/.test(line)) flush_section();
		section_lines.push(line);
	}

	flush_section();
	return sections;
}

async function read_doc_sections() {
	const file_names = (await fs.readdir(docs_directory, { withFileTypes: true }))
		.filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
		.map((entry) => entry.name)
		.sort();

	const documents = await Promise.all(
		file_names.map(async (file_name) => {
			const markdown = await fs.readFile(path.join(docs_directory, file_name), 'utf8');
			return split_markdown_sections(markdown).map((content, section_index): DocSection => ({
				document: file_name,
				section_index,
				content
			}));
		})
	);

	return documents.flat();
}

const sections = await read_doc_sections();
await fs.mkdir(output_directory, { recursive: true });

const selected_models = selected_model_name
	? embedding_models.filter((model) => model.name === selected_model_name)
	: embedding_models;
if (selected_models.length === 0)
	throw new Error(`Unknown embedding model: ${selected_model_name}`);

console.info(`Embedding ${sections.length} sections with ${selected_models.length} models`);

for (const model_config of selected_models) {
	console.info(`Loading ${model_config.name} (${model_config.dtype})`);

	const extractor = await pipeline('feature-extraction', model_config.name, {
		dtype: model_config.dtype
	});
	const embedded_sections: Array<DocSection & { embedding: number[] }> = [];

	try {
		for (let start = 0; start < sections.length; start += batch_size) {
			const batch = sections.slice(start, start + batch_size);
			const output = await extractor(
				batch.map((section) => model_config.document_prefix + section.content),
				{ pooling: model_config.pooling, normalize: true }
			);
			const embeddings = output.tolist() as number[][];

			for (const [index, section] of batch.entries()) {
				embedded_sections.push({ ...section, embedding: embeddings[index] });
			}

			console.info(
				`${model_config.name}: ${Math.min(start + batch.length, sections.length)}/${sections.length} sections`
			);
		}

		const output_file = `${model_config.name.replaceAll('/', '--')}.json`;
		await fs.writeFile(
			path.join(output_directory, output_file),
			`${JSON.stringify({
				model: model_config.name,
				dtype: model_config.dtype,
				pooling: model_config.pooling,
				dimensions: embedded_sections[0]?.embedding.length ?? 0,
				sections: embedded_sections
			})}\n`
		);
	} finally {
		await extractor.dispose();
	}
}
