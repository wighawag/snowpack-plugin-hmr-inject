"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterFiles = void 0;
const path_1 = __importDefault(require("path"));
const minimatch_1 = __importDefault(require("minimatch"));
function filterFiles({ includes, excludes }) {
    const cwd = process.cwd();
    return ({ id }) => {
        const relPath = path_1.default.relative(cwd, id);
        if (excludes) {
            for (const exclude of excludes) {
                if (minimatch_1.default(relPath, exclude)) {
                    return false;
                }
            }
        }
        if (includes) {
            for (const include of includes) {
                if (minimatch_1.default(relPath, include)) {
                    return true;
                }
            }
        }
        return !includes;
    };
}
exports.filterFiles = filterFiles;
function default_1(snowpackConfig, options) {
    return {
        name: 'hmr-prototype-snowpack-plugin',
        async transform(transformOptions) {
            if (!transformOptions.isHmrEnabled) {
                return;
            }
            if (transformOptions.isDev && options.devOnly === undefined || options.devOnly) {
                return;
            }
            let { id, contents } = transformOptions;
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
                    return contents + `
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
                }
            }
        },
    };
}
exports.default = default_1;
;
