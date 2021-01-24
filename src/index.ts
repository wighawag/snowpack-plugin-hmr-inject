import type {PluginTransformOptions, PluginTransformResult, SnowpackConfig, SnowpackPlugin} from 'snowpack';
import path from 'path';
import fs from 'fs-extra';
import minimatch from 'minimatch';

type Filter = (transformOptions: PluginTransformOptions) => boolean;

type HMRPrototypePluginOptions = {
  filter?: Filter;
  devOnly?: boolean;
  writeToFolder?: string
}

export function filterFiles({includes, excludes}: {
  includes?: string[];
  excludes?: string[]
}): Filter {
  const cwd = process.cwd();
  return ({id}) => {
    const relPath = path.relative(cwd, id);
    if (excludes) {
      for (const exclude of excludes) {
        if (minimatch(relPath, exclude)) {
          return false;
        }
      }
    }
    if (includes) {
      for (const include of includes) {
        if (minimatch(relPath, include)) {
          return true;
        }
      }
    }
    return !includes;
  }
}

export default function (snowpackConfig: SnowpackConfig, options: HMRPrototypePluginOptions): SnowpackPlugin {
  return {
    name: 'snowpack-plugin-hmr-inject',
    async transform(transformOptions: PluginTransformOptions): Promise<PluginTransformResult | string | null | undefined | void> {
      // if (!transformOptions.isHmrEnabled) { // seems to be always false
      //   console.log('no transform');
      //   return;
      // }
      if (!transformOptions.isDev && (options.devOnly === undefined || options.devOnly)) {
        return;
      }
      let {id, contents} = transformOptions;
      if (id.endsWith('.js')) {
        if (options.filter) {
          if (!options.filter(transformOptions)) {
            return;
          }
        }
        if (typeof contents !== 'string') {
          contents = contents.toString();
        }
        // TODO options: 
        // - force replace existing `import.meta.hot`
        // TODO
        // tackle base class automatically somehow ?
        // or at least provide helpers ?
        if (contents.indexOf("import.meta.hot") === -1) {
          if ((options as any).debug) {
            console.log(`injecting HMR code in ${id}`);
          }
          const newContent = contents + `
(async () => {
  if (import.meta.hot) {
    const previousModule = await import(import.meta.url);
    import.meta.hot.accept(({module}) => {
      for (const field of Object.keys(module)) {
        const newValue = module[field];
        const previousValue = previousModule[field];
        if (previousValue) {
          let __hmr__;
          if (newValue.__hmr__) {
            __hmr__ = newValue.__hmr__.bind(previousValue);
          } else if (previousValue.__hmr__) {
            __hmr__ = previousValue.__hmr__;
          }
          if (__hmr__) {
            try {
              __hmr__({previousModule, module, newValue});
            } catch (e) {
              import.meta.hot.invalidate();
            }
          } else {
            const newPrototype = Reflect.getPrototypeOf(newValue);
            Reflect.setPrototypeOf(previousValue, newPrototype);
          }
        } else {
          previousModule[field] =  newValue;
        }
      }
    });
  }
})();
`;
          if (options.writeToFolder) {
            const relpath = path.relative(snowpackConfig.root, id);
            const filepath = path.join(options.writeToFolder, relpath);
            fs.ensureDirSync(path.dirname(filepath));
            fs.writeFileSync(filepath, newContent);
          }
          return newContent;
        }      
      }
    },
  };
};
