<script lang="ts">
	import '@fontsource-variable/dm-sans';
	import EmbeddingSearch from '#lib/EmbeddingSearch.svelte';

	function error_message(error: unknown) {
		return error instanceof Error ? error.message : 'An unexpected error occurred';
	}
</script>

<svelte:head>
	<title>Semantic documentation search</title>
</svelte:head>

<main>
	<header>
		<p class="eyebrow">Client-side search</p>
		<h1>Semantic documentation search</h1>
		<p>Search documentation sections locally with the selected embedding model.</p>
	</header>

	<svelte:boundary>
		<EmbeddingSearch />

		{#snippet pending()}
			<section class="boundary-message" aria-live="polite" aria-busy="true">
				<p role="status">Loading model and search index…</p>
			</section>
		{/snippet}

		{#snippet failed(error, reset)}
			<section class="boundary-message error" role="alert">
				<p>Could not initialize semantic search: {error_message(error)}</p>
				<button type="button" onclick={reset}>Try again</button>
			</section>
		{/snippet}
	</svelte:boundary>
</main>

<style>
	:global(:root) {
		--accent: #ff3e00;
		--accent-hover: #d63400;
		--bg: #fbfbfb;
		--card: #ffffff;
		--border: #e5e5e5;
		--text: #222;
		--text-muted: #444;
		--error-bg: #fff0ee;
		--error-text: #b32d00;
		--shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(0, 0, 0, 0.04);
	}

	@media (prefers-color-scheme: dark) {
		:global(:root) {
			--bg: #1a1a1a;
			--card: #242424;
			--border: #383838;
			--text: #f0f0f0;
			--text-muted: #b0b0b0;
			--error-bg: #3a1a12;
			--error-text: #ff8f6b;
			--shadow: 0 1px 3px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.2);
		}
	}

	:global(body) {
		margin: 0;
		background: var(--bg);
		color: var(--text);
		font-family: 'DM Sans Variable', system-ui, sans-serif;
	}

	main {
		width: min(100% - 2rem, 60rem);
		margin: 0 auto;
		padding: 3rem 0;
	}

	header {
		margin-bottom: 2rem;
	}

	h1 {
		margin: 0.5rem 0;
		font-size: clamp(2rem, 5vw, 3rem);
		font-weight: 700;
		letter-spacing: -0.02em;
		color: var(--text);
	}

	header p:not(.eyebrow) {
		color: var(--text-muted);
		font-size: 1.1rem;
	}

	.eyebrow {
		margin: 0;
		color: var(--accent);
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.boundary-message {
		border: 1px solid var(--border);
		border-radius: 0.75rem;
		background: var(--card);
		box-shadow: var(--shadow);
		padding: 1.25rem;
		color: var(--text-muted);
	}

	.boundary-message p {
		margin: 0;
	}

	.boundary-message.error {
		background: var(--error-bg);
		border-color: var(--error-text);
		color: var(--error-text);
	}

	button {
		margin-top: 1rem;
		border: 0;
		border-radius: 0.5rem;
		background: var(--accent);
		color: white;
		cursor: pointer;
		font: inherit;
		font-weight: 600;
		padding: 0.65rem 1.25rem;
		transition: background 0.15s ease;
	}

	button:hover {
		background: var(--accent-hover);
	}

	@media (max-width: 36rem) {
		main {
			width: min(100% - 1.25rem, 60rem);
			padding: 1.5rem 0;
		}
	}
</style>
