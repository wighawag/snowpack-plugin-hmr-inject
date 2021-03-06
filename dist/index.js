"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterFiles = void 0;
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
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
        name: 'snowpack-plugin-hmr-inject',
        async transform(transformOptions) {
            // if (!transformOptions.isHmrEnabled) { // seems to be always false
            //   console.log('no transform');
            //   return;
            // }
            if (!transformOptions.isDev && (options.devOnly === undefined || options.devOnly)) {
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
                    if (options.debug) {
                        console.log(`injecting HMR code in ${id}`);
                    }
                    const newContent = contents + `
(async () => {
  if (import.meta.hot) {
    const moduleUrl = import.meta.url;
    const previousModule = await import(moduleUrl);
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
            const clazz = previousValue.prototype?.constructor;
            if (clazz && clazz.__instances) {
              for (const instance of clazz.__instances) {
                const classPrototype = newValue.prototype;
                Reflect.setPrototypeOf(instance, classPrototype);
              }
            } else {
              const newPrototype = Reflect.getPrototypeOf(newValue);
              Reflect.setPrototypeOf(previousValue, newPrototype);
            }
          }
        } else {
          previousModule[field] = newValue;
        }
      }
    });
  }
})();
`;
                    if (options.writeToFolder) {
                        const relpath = path_1.default.relative(snowpackConfig.root, id);
                        const filepath = path_1.default.join(options.writeToFolder, relpath);
                        fs_extra_1.default.ensureDirSync(path_1.default.dirname(filepath));
                        fs_extra_1.default.writeFileSync(filepath, newContent);
                    }
                    return newContent;
                }
            }
        },
    };
}
exports.default = default_1;
;
