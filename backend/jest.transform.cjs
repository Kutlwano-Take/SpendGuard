const ts = require('typescript');

module.exports = {
  process(src, filename) {
    const output = ts.transpileModule(src, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        sourceMap: 'inline',
      },
      fileName: filename,
      reportDiagnostics: false,
    });

    return {
      code: output.outputText,
    };
  },
};
