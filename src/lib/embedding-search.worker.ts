/// <reference lib="webworker" />

import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';
import { load_embedding_index, type EmbeddingIndex } from './embedding-index.js';
import { embedding_models, type EmbeddingModel } from './embedding-models.js';
import { build_svelte_docs_urls } from './svelte-docs-url.js';

export type EmbeddingSearchResult = {
	document: string;
	section_index: number;
	content: string;
	source_url: string;
	score: number;
};

export type EmbeddingIndexMetadata = {
	dimensions: number;
	section_count: number;
};

export type EmbeddingSearchWorkerRequest =
	{ type: 'load'; model_name: string } | { type: 'search'; query: string };

type LoadedResources = {
	model_config: EmbeddingModel;
	extractor: FeatureExtractionPipeline;
	index: EmbeddingIndex;
	source_urls: string[];
};

const worker_scope = self as unknown as DedicatedWorkerGlobalScope;
let resources: LoadedResources | null = null;

function error_message(error: unknown) {
	return error instanceof Error ? error.message : 'An unexpected worker error occurred';
}

async function load_model(model_name: string): Promise<EmbeddingIndexMetadata> {
	const model_config = embedding_models.find((model) => model.name === model_name);
	if (!model_config) throw new Error(`Unknown embedding model: ${model_name}`);

	if (resources?.model_config === model_config) {
		return {
			dimensions: resources.index.dimensions,
			section_count: resources.index.sections.length
		};
	}

	const previous_resources = resources;
	resources = null;
	if (previous_resources) await previous_resources.extractor.dispose();

	const extractor = await pipeline('feature-extraction', model_config.name, {
		dtype: model_config.dtype
	});

	try {
		const index = await load_embedding_index(model_config.name);
		resources = {
			model_config,
			extractor,
			index,
			source_urls: build_svelte_docs_urls(index.sections)
		};

		return {
			dimensions: index.dimensions,
			section_count: index.sections.length
		};
	} catch (error) {
		await extractor.dispose();
		throw error;
	}
}

async function search(query: string): Promise<EmbeddingSearchResult[]> {
	const loaded_resources = resources;
	if (!loaded_resources) throw new Error('No embedding model is loaded');

	const query_embedding = await loaded_resources.extractor(
		`${loaded_resources.model_config.query_prefix}${query}`,
		{ pooling: loaded_resources.model_config.pooling, normalize: true }
	);
	if (query_embedding.data.length !== loaded_resources.index.dimensions) {
		throw new Error(
			`Query embedding has ${query_embedding.data.length} dimensions; the index has ${loaded_resources.index.dimensions}`
		);
	}

	return loaded_resources.index.sections
		.map((section, section_position) => ({
			document: section.document,
			section_index: section.section_index,
			content: section.content,
			source_url: loaded_resources.source_urls[section_position] as string,
			score: section.embedding.reduce(
				(score, value, dimension) => score + value * Number(query_embedding.data[dimension]),
				0
			)
		}))
		.sort((left, right) => right.score - left.score)
		.slice(0, 10);
}

async function handle_request(request: EmbeddingSearchWorkerRequest) {
	return request.type === 'load' ? load_model(request.model_name) : search(request.query);
}

worker_scope.addEventListener('message', (event: MessageEvent<EmbeddingSearchWorkerRequest>) => {
	const response_port = event.ports[0];
	if (!response_port) return;

	void handle_request(event.data)
		.then((result) => response_port.postMessage({ ok: true, result }))
		.catch((error: unknown) =>
			response_port.postMessage({ ok: false, message: error_message(error) })
		)
		.finally(() => response_port.close());
});
