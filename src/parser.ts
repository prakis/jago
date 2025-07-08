import * as babelParser from "@babel/parser";
import { File } from "@babel/types";


export function preprocessJaGo(code: string): string {
  return code
    .replace(/^import\s+(\w+);/gm, 'const $1 = __import("$1");') // replace JaGo-style import
    .replace(/^go\s+(\w+\(\));/gm, '__go($1);');                 // placeholder for go call
}


export function parseJaGoCode(code: string): File {
  const processedcode = preprocessJaGo(code);
  const ast = babelParser.parse(processedcode, {
    sourceType: "module",
    plugins: [
      "typescript",   // optional, helps with type annotations if needed later
    ],
    allowImportExportEverywhere: true,
    errorRecovery: true,
  });

  return ast;
}
