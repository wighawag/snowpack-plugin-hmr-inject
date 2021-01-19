# snowpack-plugin-hmr-inject

`snowpack-plugin-hmr-inject` is a [snowpack](https://www.snowpack.dev/) plugin that can auto inject hmr code to any module (who do not already have hmr support) so they can have their code hot swapped while their exported field instance data remains the same.

It do that by looking at all export field of a module and for each it replace its prototype with the one from the newly loaded module (same export field);

This is great for export field that are instance of classes that see all their new code used while keeping their instance data.

It also provide a hook for further customization:

if your exported instance have a `__hmr__` function it will call it like `exportedField.__hmr__({previousModule, module, newValue})` with module being the new module and newValue the new value of that module.

If you wanted to replicate the default behavior of `snowpack-plugin-hmr-inject`, `__hmr__` can be implemented as follow :

```ts
class Test {
    __hmr__({newValue}) {
        Reflect.setPrototypeOf(this, Reflect.getProtypeOf(newValue));
    }
    ...
}
export const test = new Test();
```

if `__hmr__` throw it will invalidate hmr and reload the page


## Configuration

Default :

```js
// snowpack.config.js
module.exports = {
  plugins: [
    'snowpack-plugin-hmr-inject',
  ],
}
```

This will transform all module in your code that do not already support hmr and will perform its prototype replacement on every exported fields.
It will also call `__hmr(...)` on field that have it as described above.

You can configure the plugin to only perform that transformation on certain module via the filter options:

```js
// snowpack.config.js
module.exports = {
  plugins: [
    ['snowpack-plugin-hmr-inject', {filter: function(transformOptions) => return true}]
  ],
}
```

the argument passed to the filter options is the same as snowpack arguments passed to the plugin's transform function:
```
export interface PluginTransformOptions {
    id: string;
    fileExt: string;
    contents: string | Buffer;
    isDev: boolean;
    isHmrEnabled: boolean;
}
```


The plugin comes with a builtin filter that let you define glob pattern to include or to exclude :


```js
// snowpack.config.js
const {filterFiles} = require('snowpack-plugin-hmr-inject');
module.exports = {
  plugins: [
    ['snowpack-plugin-hmr-inject', {filter: filterFiles({includes: ['src/stores/*'], excludes: []})}]
  ],
};
```

