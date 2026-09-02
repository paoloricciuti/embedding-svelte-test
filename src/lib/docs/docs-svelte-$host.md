When compiling a component as a [custom element](custom-elements), the `$host` rune provides access to the host element, allowing you to (for example) dispatch custom events (demo:

<!-- prettier-ignore -->
```svelte
/// file: Stepper.svelte
<svelte:options customElement="my-stepper" />

<script>
	function dispatch(type) {
		+++$host()+++.dispatchEvent(new CustomEvent(type));
	}
</script>

<button onclick={() => dispatch('decrement')}>decrement</button>
<button onclick={() => dispatch('increment')}>increment</button>
```

<!-- prettier-ignore -->
```svelte
/// file: App.svelte
<script>
	import './Stepper.svelte';

	let count = $state(0);
</script>

<my-stepper
	ondecrement={() => count -= 1}
	onincrement={() => count += 1}
></my-stepper>

<p>count: {count}</p>
```