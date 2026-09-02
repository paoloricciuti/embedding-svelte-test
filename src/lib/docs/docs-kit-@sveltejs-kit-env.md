```js
// @noErrors
import { defineEnvVars } from '@sveltejs/kit/env';
```

## defineEnvVars

Utility for defining [environment variables](/docs/kit/environment-variables),
which are made available via `$app/env/public` and `$app/env/private`.

<div class="ts-block">

```dts
function defineEnvVars<
	T extends Record<
		string,
		import('@sveltejs/kit').EnvVarConfig<any>
	>
>(variables: T): T;
```

</div>