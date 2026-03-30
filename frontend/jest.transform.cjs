/**
 * Custom Jest transformer that replaces import.meta.env references before
 * delegating to ts-jest, allowing CJS-mode tests to work with Vite source files.
 */
const tsJest = require('ts-jest').default;

const transformer = tsJest.createTransformer({
  tsconfig: {
    target: 'ES2020',
    lib: ['ES2020', 'DOM', 'DOM.Iterable'],
    module: 'CommonJS',
    moduleResolution: 'node',
    esModuleInterop: true,
    resolveJsonModule: true,
    isolatedModules: true,
    jsx: 'react-jsx',
    strict: false,
    skipLibCheck: true,
  },
  diagnostics: false,
});

module.exports = {
  process(sourceText, sourcePath, options) {
    // Replace import.meta.env.VITE_* with values from process.env or defaults
    const patched = sourceText
      .replace(/import\.meta\.env\.VITE_API_BASE_URL/g, '(process.env.VITE_API_BASE_URL || "http://localhost:3001")')
      .replace(/import\.meta\.env/g, '(process.env)');
    return transformer.process(patched, sourcePath, options);
  },
  getCacheKey(sourceText, sourcePath, options) {
    const patched = sourceText
      .replace(/import\.meta\.env\.VITE_API_BASE_URL/g, '(process.env.VITE_API_BASE_URL || "http://localhost:3001")')
      .replace(/import\.meta\.env/g, '(process.env)');
    return transformer.getCacheKey(patched, sourcePath, options);
  },
};
