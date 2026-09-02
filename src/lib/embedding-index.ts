import { embedding_models } from './embedding-models.js';

export type IndexedSection = {
	document: string;
	section_index: number;
	content: string;
	embedding: number[];
};

export type EmbeddingIndex = {
	model: string;
	dtype: string;
	pooling: string;
	dimensions: number;
	sections: IndexedSection[];
};

const embedding_index_urls = import.meta.glob('./embeddings/*.json', {
	query: '?url',
	import: 'default',
	eager: true
}) as Record<string, string>;

function is_embedding_index(value: unknown): value is EmbeddingIndex {
	if (!value || typeof value !== 'object') return false;

	const index = value as Partial<EmbeddingIndex>;
	return (
		typeof index.model === 'string' &&
		typeof index.dtype === 'string' &&
		typeof index.pooling === 'string' &&
		typeof index.dimensions === 'number' &&
		Array.isArray(index.sections)
	);
}

function is_indexed_section(value: unknown, dimensions: number): value is IndexedSection {
	if (!value || typeof value !== 'object') return false;

	const section = value as Partial<IndexedSection>;
	return (
		typeof section.document === 'string' &&
		Number.isInteger(section.section_index) &&
		typeof section.content === 'string' &&
		Array.isArray(section.embedding) &&
		section.embedding.length === dimensions &&
		section.embedding.every((entry) => typeof entry === 'number' && Number.isFinite(entry))
	);
}

export async function load_embedding_index(model_name: string): Promise<EmbeddingIndex> {
	const model_config = embedding_models.find((model) => model.name === model_name);
	if (!model_config) throw new Error(`Unknown embedding model: ${model_name}`);

	const file_name = `${model_name.replaceAll('/', '--')}.json`;
	const index_url = embedding_index_urls[`./embeddings/${file_name}`];
	if (!index_url) throw new Error(`No embedding index found for ${model_name} (${file_name})`);

	let response: Response;
	try {
		response = await fetch(index_url);
	} catch (error) {
		throw new Error(`Could not fetch the embedding index for ${model_name}`, { cause: error });
	}

	if (!response.ok) {
		throw new Error(
			`Could not load the embedding index for ${model_name}: ${response.status} ${response.statusText}`
		);
	}

	let index: unknown;
	try {
		index = await response.json();
	} catch (error) {
		throw new Error(`The embedding index for ${model_name} is not valid JSON`, { cause: error });
	}

	if (!is_embedding_index(index))
		throw new Error(`The embedding index for ${model_name} has an invalid shape`);
	if (index.model !== model_name)
		throw new Error(`The embedding index model does not match ${model_name}`);
	if (index.dtype !== model_config.dtype || index.pooling !== model_config.pooling) {
		throw new Error(`The embedding index settings do not match ${model_name}`);
	}
	if (!Number.isInteger(index.dimensions) || index.dimensions < 1) {
		throw new Error(`The embedding index for ${model_name} has invalid dimensions`);
	}
	if (!index.sections.every((section) => is_indexed_section(section, index.dimensions))) {
		throw new Error(
			`The embedding index for ${model_name} contains an invalid section or embedding`
		);
	}

	return index;
}
