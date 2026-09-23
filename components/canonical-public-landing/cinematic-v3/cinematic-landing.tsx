import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { CinematicLandingClient } from "./cinematic-landing-client";

const assetBase = "/assets/landing-cinematic-v3";

function buildNarrativeHtml() {
  const directory = path.join(process.cwd(), "public", "assets", "landing-cinematic-v3");
  const documentHtml = readFileSync(path.join(directory, "index.html"), "utf8");
  const body = documentHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1];
  if (!body) throw new Error("The cinematic landing narrative could not be loaded.");
  const assetVersion = createHash("sha256")
    .update(documentHtml)
    .update(readFileSync(path.join(directory, "style.css")))
    .update(readFileSync(path.join(directory, "main.js")))
    .digest("hex")
    .slice(0, 12);

  const narrativeHtml = body
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<a class="skip-link"[\s\S]*?<\/a>/i, "")
    .replace("<main>", '<main id="main-content">')
    .replace(
      /<div class="closing-action" id="cinematic-waitlist-slot">[\s\S]*?<\/div>/i,
      '<div class="closing-action" id="cinematic-waitlist-slot"></div>',
    )
    .replaceAll('href="privacy.html#privacy"', `href="${assetBase}/privacy.html#privacy"`)
    .replace(/\b(src|srcset)="(?!data:|https?:|\/)([^"]+)"/g, (_match, attribute, value) => (
      `${attribute}="${assetBase}/${value}?v=${assetVersion}"`
    ));
  return { narrativeHtml, assetVersion };
}

export function CinematicLanding() {
  const { narrativeHtml, assetVersion } = buildNarrativeHtml();
  return <CinematicLandingClient narrativeHtml={narrativeHtml} assetBase={assetBase} assetVersion={assetVersion} />;
}
