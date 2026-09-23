import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const desktopHeaders = Object.freeze([
  ["Student Lobby.dc.html", "today"],
  ["Work.dc.html", "work"],
  ["Classes.dc.html", "classes"],
  ["Calendar.dc.html", "calendar"],
  ["Search.dc.html", ""],
  ["Proof.dc.html", ""],
  ["Portfolio.dc.html", ""],
  ["Wellness.dc.html", ""],
  ["Sharing.dc.html", ""],
  ["Settings.dc.html", ""],
  ["AI History.dc.html", ""],
  ["AP Command Center.dc.html", ""],
  ["More.dc.html", ""],
]);

function countMatches(value, pattern) {
  return [...value.matchAll(pattern)].length;
}

function importMarkup(fileName, active) {
  const attributes = [`name="Student Desktop Header"`];
  if (active) attributes.push(`active="${active}"`);
  if (fileName === "Student Lobby.dc.html") {
    attributes.push('initial="{{ initials }}"');
    attributes.push('profile-photo="{{ profilePhotoSrc }}"');
    attributes.push('on-record="{{ toggleAudio }}"');
  }
  attributes.push('hint-size="1440px,58px"');
  return `<dc-import ${attributes.join(" ")}></dc-import>`;
}

function replaceHeader(source, fileName, active) {
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  const lines = source.split(/\r?\n/u);
  const existing = lines.findIndex((line) =>
    line.includes('<dc-import name="Student Desktop Header"'),
  );
  const replacement = importMarkup(fileName, active);

  if (existing >= 0) {
    const indent = lines[existing].match(/^\s*/u)?.[0] ?? "";
    lines[existing] = `${indent}${replacement}`;
    return lines.join(newline);
  }

  const start = lines.findIndex(
    (line) =>
      line.includes("height:58px") &&
      line.includes("display:flex") &&
      line.includes("align-items:center") &&
      line.includes("max-width:1440px"),
  );
  if (start < 0) throw new Error(`${fileName}: desktop header start not found`);

  let depth = 0;
  let end = -1;
  for (let index = start; index < lines.length; index += 1) {
    depth += countMatches(lines[index], /<div(?=[\s>])/gu);
    depth -= countMatches(lines[index], /<\/div>/gu);
    if (depth === 0) {
      end = index;
      break;
    }
  }
  if (end < start) throw new Error(`${fileName}: desktop header end not found`);

  const indent = lines[start].match(/^\s*/u)?.[0] ?? "";
  lines.splice(start, end - start + 1, `${indent}${replacement}`);
  return lines.join(newline);
}

for (const [fileName, active] of desktopHeaders) {
  const filePath = path.join(root, "public", "design", fileName);
  const source = await readFile(filePath, "utf8");
  const updated = replaceHeader(source, fileName, active);
  if (updated !== source) await writeFile(filePath, updated, "utf8");
}

console.log(`Standardized ${desktopHeaders.length} desktop design headers.`);
