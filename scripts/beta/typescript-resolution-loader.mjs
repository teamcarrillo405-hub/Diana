import path from "node:path";
import { fileURLToPath } from "node:url";

const TYPESCRIPT_EXTENSIONS = [".ts"];
const LOADER_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(LOADER_PATH), "..", "..");

function isLocalSourceSpecifier(specifier) {
  return specifier.startsWith("./") || specifier.startsWith("../");
}

function isProjectSourcePath(filePath) {
  const relative = path.relative(PROJECT_ROOT, filePath);
  return relative.length > 0 && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

/**
 * Node's native TypeScript support intentionally requires explicit file
 * extensions. Diana's TypeScript source uses the repository's established
 * extensionless internal imports, so the release launcher resolves only local
 * project source imports before letting Node perform its normal checks.
 */
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (
      !isLocalSourceSpecifier(specifier)
      || error?.code !== "ERR_MODULE_NOT_FOUND"
    ) {
      throw error;
    }

    const sourceSpecifier = specifier.endsWith(".js")
      ? specifier.slice(0, -3)
      : specifier;
    if (path.extname(sourceSpecifier)) throw error;

    for (const extension of TYPESCRIPT_EXTENSIONS) {
      try {
        const targetUrl = new URL(`${sourceSpecifier}${extension}`, context.parentURL);
        if (
          targetUrl.protocol !== "file:"
          || !isProjectSourcePath(fileURLToPath(targetUrl))
        ) {
          continue;
        }
        return await nextResolve(targetUrl.href, context);
      } catch (candidateError) {
        if (candidateError?.code !== "ERR_MODULE_NOT_FOUND") {
          throw candidateError;
        }
      }
    }

    throw error;
  }
}
