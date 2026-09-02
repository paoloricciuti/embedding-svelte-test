<script lang="ts">
	import { getAbortSignal, onDestroy } from 'svelte';
	import { embedding_models } from './embedding-models.js';
	import EmbeddingSearchWorker from './embedding-search.worker.ts?worker';
	import type {
		EmbeddingIndexMetadata,
		EmbeddingSearchResult,
		EmbeddingSearchWorkerRequest
	} from './embedding-search.worker.js';

	const initial_model = embedding_models[0];
	const worker = new EmbeddingSearchWorker();

	type WorkerSuccess<Result> = { ok: true; result: Result };
	type WorkerFailure = { ok: false; message: string };

	function request<Result>(
		payload: EmbeddingSearchWorkerRequest,
		signal?: AbortSignal
	): Promise<Result> {
		const { port1, port2 } = new MessageChannel();

		return new Promise((resolve, reject) => {
			const close = () => {
				signal?.removeEventListener('abort', abort);
				port1.close();
			};
			const abort = () => {
				close();
				reject(signal?.reason ?? new DOMException('The operation was aborted', 'AbortError'));
			};

			port1.onmessage = (event: MessageEvent<WorkerSuccess<Result> | WorkerFailure>) => {
				close();
				if (event.data.ok) resolve(event.data.result);
				else reject(new Error(event.data.message));
			};

			if (signal?.aborted) {
				abort();
				return;
			}

			signal?.addEventListener('abort', abort, { once: true });
			worker.postMessage(payload, [port2]);
		});
	}

	async function load_model(model_name: string) {
		return request<EmbeddingIndexMetadata>({ type: 'load', model_name }, getAbortSignal());
	}

	onDestroy(() => worker.terminate());

	let model_name = $state(initial_model.name);
	let query = $state('');
	let results = $state.raw<EmbeddingSearchResult[]>([]);
	let is_searching = $state(false);
	let error = $state<string | null>(null);

	let metadata = $derived(await load_model(model_name));
	let is_loading_model = $derived($effect.pending() > 0);

	function error_message(error: unknown) {
		return error instanceof Error ? error.message : 'An unexpected error occurred';
	}

	async function search(event: SubmitEvent) {
		event.preventDefault();
		if (is_searching || is_loading_model) return;
		const trimmed_query = query.trim();
		if (!trimmed_query) {
			results = [];
			error = 'Enter a query to search the documentation.';
			return;
		}

		is_searching = true;
		error = null;
		try {
			results = await request<EmbeddingSearchResult[]>({ type: 'search', query: trimmed_query });
		} catch (caught_error) {
			results = [];
			error = error_message(caught_error);
		} finally {
			is_searching = false;
		}
	}
</script>

<section class="controls" aria-label="Search controls">
	<label for="model">Embedding model</label>
	<select
		id="model"
		bind:value={model_name}
		onchange={() => {
			results = [];
			error = null;
		}}
		disabled={is_loading_model || is_searching}
	>
		{#each embedding_models as model (model.name)}
			<option value={model.name}>{model.name} (~{model.download_size_mb} MB)</option>
		{/each}
	</select>
	{#if is_loading_model}
		<p class="status" role="status">Loading model and search index…</p>
	{:else}
		<p class="status" role="status">
			{metadata.section_count} sections ready to search ({metadata.dimensions} dimensions).
		</p>
	{/if}
</section>

{#if error}
	<p class="message error" role="alert">{error}</p>
{/if}

<form onsubmit={search}>
	<label for="query">Search query</label>
	<div class="query-row">
		<input
			id="query"
			bind:value={query}
			disabled={is_loading_model || is_searching}
			placeholder="e.g. remote functions, deployment, auth"
		/>
		<button type="submit" disabled={is_loading_model || is_searching}>
			{is_searching ? 'Searching…' : 'Search'}
		</button>
	</div>
</form>

<section class="results" aria-live="polite" aria-busy={is_searching}>
	<h2>Relevant sections</h2>
	{#if results.length > 0}
		<ol>
			{#each results as result (`${result.document}:${result.section_index}`)}
				<li>
					<div class="result-meta">
						<span>Score {result.score.toFixed(4)}</span>
						<span>{result.document} · section {result.section_index}</span>
						<a
							href={result.source_url}
							target="_blank"
							rel="noopener noreferrer"
							aria-label={`Open ${result.document} documentation section (opens in a new tab)`}
						>
							Open documentation
						</a>
					</div>
					<pre>{result.content}</pre>
				</li>
			{/each}
		</ol>
	{:else if !error && !is_loading_model}
		<p class="empty">Run a search to see the most relevant sections.</p>
	{/if}
</section>

<style>
	.controls,
	form,
	.results {
		border: 1px solid var(--border, #e5e5e5);
		border-radius: 0.75rem;
		background: var(--card, #fff);
		box-shadow: var(--shadow, 0 1px 3px rgba(0, 0, 0, 0.06));
		padding: 1.5rem;
	}

	.controls {
		display: grid;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	label {
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--accent, #ff3e00);
	}

	select,
	input,
	button {
		box-sizing: border-box;
		font: inherit;
	}

	select {
		width: 100%;
		min-width: 0;
	}

	select,
	input {
		border: 1px solid var(--border, #e5e5e5);
		border-radius: 0.5rem;
		padding: 0.65rem 0.75rem;
		background: var(--card, #fff);
		color: var(--text, #222);
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}

	select:focus-visible,
	input:focus-visible {
		outline: none;
		border-color: var(--accent, #ff3e00);
		box-shadow: 0 0 0 3px rgba(255, 62, 0, 0.15);
	}

	.status,
	.message,
	.empty {
		margin: 0.25rem 0 0;
		color: var(--text-muted, #444);
	}

	.message {
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
	}

	.error {
		margin: 1rem 0;
		background: var(--error-bg, #fff0ee);
		border: 1px solid var(--error-text, #b32d00);
		color: var(--error-text, #b32d00);
	}

	form {
		margin-bottom: 1.5rem;
	}

	.query-row {
		display: flex;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}

	input {
		flex: 1;
		min-width: 0;
	}

	button {
		border: 0;
		border-radius: 0.5rem;
		background: var(--accent, #ff3e00);
		color: white;
		cursor: pointer;
		font-weight: 600;
		padding: 0.65rem 1.5rem;
		transition: background 0.15s ease;
	}

	button:hover:not(:disabled) {
		background: var(--accent-hover, #d63400);
	}

	button:disabled,
	select:disabled,
	input:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}

	.results h2 {
		margin-top: 0;
		font-size: 1.25rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		color: var(--text, #222);
	}

	ol {
		display: grid;
		gap: 1rem;
		margin: 0;
		padding-left: 1.5rem;
	}

	li {
		padding-left: 0.25rem;
	}

	.result-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 1rem;
		color: var(--text-muted, #444);
		font-size: 0.875rem;
	}

	.result-meta a {
		color: var(--accent, #ff3e00);
		font-weight: 600;
		text-decoration: none;
	}

	.result-meta a:hover {
		color: var(--accent-hover, #d63400);
		text-decoration: underline;
	}

	pre {
		margin: 0.5rem 0 0;
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		background: var(--bg, #fbfbfb);
		border: 1px solid var(--border, #e5e5e5);
		overflow-x: auto;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		color: var(--text, #222);
		font:
			0.9rem/1.5 ui-monospace,
			monospace;
	}

	@media (max-width: 36rem) {
		.query-row {
			flex-direction: column;
		}
	}
</style>
