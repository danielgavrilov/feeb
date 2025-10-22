import { readFile } from "node:fs/promises";

const tsModule = await import(
  new URL("../apps/web/node_modules/typescript/lib/typescript.js", import.meta.url)
);
const ts = tsModule.default ?? tsModule;

const compilerOptions = {
  module: ts.ModuleKind.ESNext,
  target: ts.ScriptTarget.ES2020,
  jsx: ts.JsxEmit.ReactJSX,
  esModuleInterop: true,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
};

export async function resolve(specifier, context, defaultResolve) {
  if (specifier.endsWith(".ts") || specifier.endsWith(".tsx")) {
    return defaultResolve(specifier, context, defaultResolve);
  }

  try {
    return await defaultResolve(specifier, context, defaultResolve);
  } catch (error) {
    if (specifier.startsWith("@/")) {
      const basePath = `../apps/web/src/${specifier.slice(2)}`;
      for (const extension of ["", ".ts", ".tsx", ".js", ".mjs"]) {
        try {
          const aliasUrl = new URL(basePath + extension, import.meta.url);
          return await defaultResolve(aliasUrl.href, context, defaultResolve);
        } catch {
          // Try next extension
        }
      }
    }

    if (!specifier.endsWith(".js") && !specifier.endsWith(".mjs")) {
      for (const extension of [".ts", ".tsx"]) {
        try {
          return await defaultResolve(specifier + extension, context, defaultResolve);
        } catch {
          // Continue trying extensions
        }
      }
    }

    throw error;
  }
}

export async function load(url, context, defaultLoad) {
  if (url.endsWith(".ts") || url.endsWith(".tsx")) {
    const source = await readFile(new URL(url));
    const transpiled = ts.transpileModule(source.toString(), {
      compilerOptions,
      fileName: url,
    });

    const rewrittenSource = transpiled.outputText.replaceAll(
      "import.meta.env",
      "({})",
    );

    return {
      format: "module",
      source: rewrittenSource,
      shortCircuit: true,
    };
  }

  return defaultLoad(url, context, defaultLoad);
}
