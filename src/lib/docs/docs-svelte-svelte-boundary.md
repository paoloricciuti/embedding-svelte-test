```svelte
<svelte:boundary onerror={handler}>...</svelte:boundary>
```

> [!NOTE]
> This feature was added in 5.3.0

Boundaries allow you to 'wall off' parts of your app, so that you can:

- provide UI that should be shown when [`await`](await-expressions) expressions are first resolving
- handle errors that occur during rendering or while running effects, and provide UI that should be rendered when an error happens

If a boundary handles an error (with a `failed` snippet or `onerror` handler, or both) its existing content will be removed.

> [!NOTE] Errors occurring outside the rendering process (for example, in event handlers or after a `setTimeout` or async work) are _not_ caught by error boundaries.

## Properties

For the boundary to do anything, one or more of the following must be provided.

### `pending`

This snippet will be shown when the boundary is first created, and will remain visible until all the [`await`](await-expressions) expressions inside the boundary have resolved (demo:

```svelte
<svelte:boundary>
	<p>{await delayed('hello!')}</p>

	{#snippet pending()}
		<p>loading...</p>
	{/snippet}
</svelte:boundary>
```

The `pending` snippet will _not_ be shown for subsequent async updates — for these, you can use [`$effect.pending()`]($effect#$effect.pending).

> [!NOTE] In the [playground](/playground), your app is rendered inside a boundary with an empty pending snippet, so that you can use `await` without having to create one.


### `failed`

If a `failed` snippet is provided, it will be rendered when an error is thrown inside the boundary, with the `error` and a `reset` function that recreates the contents (demo:

```svelte
<svelte:boundary>
	<FlakyComponent />

	{#snippet failed(error, reset)}
		<button onclick={reset}>oops! try again</button>
	{/snippet}
</svelte:boundary>
```

> [!NOTE]
> As with [snippets passed to components](snippet#Passing-snippets-to-components), the `failed` snippet can be passed explicitly as a property...
>
> ```svelte
> <svelte:boundary {failed}>...</svelte:boundary>
> ```
>
> ...or implicitly by declaring it directly inside the boundary, as in the example above.

### `onerror`

If an `onerror` function is provided, it will be called with the same two `error` and `reset` arguments. This is useful for tracking the error with an error reporting service...

```svelte
<svelte:boundary onerror={(e) => report(e)}>
	...
</svelte:boundary>
```

...or using `error` and `reset` outside the boundary itself:

```svelte
<script>
	let error = $state(null);
	let reset = $state(() => {});

	function onerror(e, r) {
		error = e;
		reset = r;
	}
</script>

<svelte:boundary {onerror}>
	<FlakyComponent />
</svelte:boundary>

{#if error}
	<button onclick={() => {
		error = null;
		reset();
	}}>
		oops! try again
	</button>
{/if}
```

If an error occurs inside the `onerror` function (or if you rethrow the error), it will be handled by a parent boundary if such exists.

## Using `transformError`

By default, error boundaries have no effect on the server — if an error occurs during rendering, the render as a whole will fail.

Since 5.51 you can control this behaviour for boundaries with a `failed` snippet, by calling [`render(...)`](imperative-component-api#render) with a `transformError` function.

> [!NOTE] If you're using Svelte via a framework such as SvelteKit, you most likely don't have direct access to the `render(...)` call — the framework must configure `transformError` on your behalf. SvelteKit will add support for this in the near future, via the [`handleError`](../kit/hooks#handleError) hook.

The `transformError` function must return a JSON-stringifiable object which will be used to render the `failed` snippet. This object will be serialized and used to hydrate the snippet in the browser:

```js
// @errors: 1005
import { render } from 'svelte/server';
import App from './App.svelte';

const { head, body } = await render(App, {
	transformError: (error) => {
		// log the original error, with the stack trace...
		console.error(error);

		// ...and return a sanitized user-friendly error
		// to display in the `failed` snippet
		return {
			message: 'An error occurred!'
		};
	};
});
```

If `transformError` throws (or rethrows) an error, `render(...)` as a whole will fail with that error.

> [!NOTE] Errors that occur during server-side rendering can contain sensitive information in the `message` and `stack`. It's recommended to redact these rather than sending them unaltered to the browser.

If the boundary has an `onerror` handler, it will be called upon hydration with the deserialized error object.

The [`mount`](imperative-component-api#mount) and [`hydrate`](imperative-component-api#hydrate) functions also accept a `transformError` option, which defaults to the identity function. As with `render`, this function transforms a render-time error before it is passed to a `failed` snippet or `onerror` handler.