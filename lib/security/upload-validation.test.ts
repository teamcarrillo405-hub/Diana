import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";

import {
  hasAssignmentStoragePrefix,
  hasOwnerStoragePrefix,
  ownerStorageKey,
  validateUpload,
} from "./upload-validation";

const bytes = (...values: number[]) => new Uint8Array(values);

function avifBox(majorBrand = "avif", compatibleBrands: string[] = []): Uint8Array {
  const result = new Uint8Array(16 + compatibleBrands.length * 4);
  const view = new DataView(result.buffer);
  view.setUint32(0, result.length);
  result.set(Buffer.from("ftyp", "ascii"), 4);
  result.set(Buffer.from(majorBrand, "ascii"), 8);
  result.set(Buffer.from("\0\0\0\0", "binary"), 12);
  compatibleBrands.forEach((brand, index) => result.set(Buffer.from(brand, "ascii"), 16 + index * 4));
  return result;
}

function emptyZipArchive(entryNames: string[]): Uint8Array {
  const chunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let localOffset = 0;

  for (const entryName of entryNames) {
    const name = new Uint8Array(Buffer.from(entryName, "ascii"));
    const local = new Uint8Array(30 + name.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(26, name.length, true);
    local.set(name, 30);
    chunks.push(local);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint32(42, localOffset, true);
    central.set(name, 46);
    centralChunks.push(central);
    localOffset += local.length;
  }

  const centralSize = centralChunks.reduce((total, chunk) => total + chunk.length, 0);
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(8, entryNames.length, true);
  eocdView.setUint16(10, entryNames.length, true);
  eocdView.setUint32(12, centralSize, true);
  eocdView.setUint32(16, localOffset, true);

  const result = new Uint8Array(localOffset + centralSize + eocd.length);
  let offset = 0;
  for (const chunk of [...chunks, ...centralChunks, eocd]) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

const ooxmlKinds = {
  docx: {
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    requiredPart: "word/document.xml",
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml",
    root: '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p/></w:body></w:document>',
  },
  xlsx: {
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    requiredPart: "xl/workbook.xml",
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml",
    root: '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheets/></workbook>',
  },
  pptx: {
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    requiredPart: "ppt/presentation.xml",
    contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml",
    root: '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldIdLst/></p:presentation>',
  },
} as const;

function ooxmlArchive(
  kind: keyof typeof ooxmlKinds,
  overrides: {
    contentTypes?: string;
    relationships?: string;
    root?: string;
    extra?: Record<string, Uint8Array>;
  } = {},
): Uint8Array {
  const spec = ooxmlKinds[kind];
  const contentTypes = overrides.contentTypes
    ?? `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/${spec.requiredPart}" ContentType="${spec.contentType}"/></Types>`;
  const relationships = overrides.relationships
    ?? `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="${spec.requiredPart}"/></Relationships>`;
  return zipSync({
    "[Content_Types].xml": strToU8(contentTypes),
    "_rels/.rels": strToU8(relationships),
    [spec.requiredPart]: strToU8(overrides.root ?? spec.root),
    ...overrides.extra,
  }, { level: 6 });
}

function findZipEntryRecord(archive: Uint8Array, signature: number, entryName: string): number {
  const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
  const nameLengthOffset = signature === 0x04034b50 ? 26 : 28;
  const nameOffset = signature === 0x04034b50 ? 30 : 46;
  for (let offset = 0; offset + nameOffset <= archive.length; offset += 1) {
    if (view.getUint32(offset, true) !== signature) continue;
    const nameLength = view.getUint16(offset + nameLengthOffset, true);
    const name = Buffer.from(archive.slice(offset + nameOffset, offset + nameOffset + nameLength)).toString("utf8");
    if (name === entryName) return offset;
  }
  throw new Error(`ZIP entry ${entryName} not found`);
}

function crc32(input: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of input) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) !== 0 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function findZipSignature(archive: Uint8Array, signature: number): number {
  for (let offset = 0; offset + 4 <= archive.length; offset += 1) {
    if (new DataView(archive.buffer, archive.byteOffset, archive.byteLength).getUint32(offset, true) === signature) {
      return offset;
    }
  }
  throw new Error(`ZIP signature ${signature.toString(16)} not found`);
}

function mutateUint32(archive: Uint8Array, offset: number, value: number): Uint8Array {
  const mutated = archive.slice();
  new DataView(mutated.buffer).setUint32(offset, value, true);
  return mutated;
}

describe("upload validation", () => {
  it("accepts a PDF only when extension, MIME, and signature agree", () => {
    const result = validateUpload("assignmentSource", {
      name: "worksheet.pdf",
      mimeType: "application/pdf",
      size: 128,
      bytes: bytes(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37),
    });

    expect(result).toEqual({
      ok: true,
      value: { extension: "pdf", mimeType: "application/pdf", size: 128 },
    });
  });

  it("normalizes accepted aliases to the canonical extension and MIME", () => {
    const result = validateUpload("aiToolImage", {
      name: "scan.JPEG",
      mimeType: "image/jpg",
      size: 64,
      bytes: bytes(0xff, 0xd8, 0xff, 0xe0),
    });

    expect(result).toEqual({
      ok: true,
      value: { extension: "jpg", mimeType: "image/jpeg", size: 64 },
    });
  });

  it("accepts AVIF only for landing assets with an AVIF brand", () => {
    const header = avifBox("mif1", ["avif"]);

    expect(validateUpload("landingAsset", {
      name: "hero.avif",
      mimeType: "image/avif",
      size: header.length,
      bytes: header,
    })).toMatchObject({
      ok: true,
      value: { extension: "avif", mimeType: "image/avif" },
    });
    expect(validateUpload("aiToolImage", {
      name: "hero.avif",
      mimeType: "image/avif",
      size: header.length,
      bytes: header,
    })).toMatchObject({ ok: false, code: "extension" });
  });

  it("rejects malformed, truncated, and out-of-box AVIF brands", () => {
    const truncated = avifBox();
    new DataView(truncated.buffer).setUint32(0, truncated.length + 4);
    const misaligned = new Uint8Array([...avifBox(), 0x61]);
    new DataView(misaligned.buffer).setUint32(0, misaligned.length);
    const outOfBox = new Uint8Array([...avifBox("mif1"), ...Buffer.from("avif", "ascii")]);

    for (const header of [truncated, misaligned, outOfBox]) {
      expect(validateUpload("landingAsset", {
        name: "hero.avif",
        mimeType: "image/avif",
        size: header.length,
        bytes: header,
      })).toMatchObject({ ok: false, code: "signature" });
    }
  });

  it("rejects a renamed executable with a PDF MIME declaration", () => {
    const result = validateUpload("assignmentSource", {
      name: "worksheet.pdf",
      mimeType: "application/pdf",
      size: 128,
      bytes: bytes(0x4d, 0x5a, 0x90, 0x00),
    });

    expect(result).toMatchObject({ ok: false, code: "signature" });
  });

  it("rejects MIME and extension disagreement", () => {
    const result = validateUpload("quickAddPhoto", {
      name: "capture.png",
      mimeType: "image/jpeg",
      size: 64,
      bytes: bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a),
    });

    expect(result).toMatchObject({ ok: false, code: "mime" });
  });

  it("rejects empty files before considering their declared type", () => {
    expect(validateUpload("portfolioFile", {
      name: "project.pdf",
      mimeType: "application/pdf",
      size: 0,
      bytes: bytes(),
    })).toMatchObject({ ok: false, code: "empty" });
  });

  it("keeps portfolio documents on the route-specific allowlist", () => {
    const pdfHeader = new Uint8Array(Buffer.from("%PDF-1.7", "ascii"));
    const docx = ooxmlArchive("docx");

    expect(validateUpload("portfolioFile", {
      name: "essay.pdf",
      mimeType: "application/pdf",
      size: pdfHeader.length,
      bytes: pdfHeader,
    })).toMatchObject({ ok: true });
    expect(validateUpload("portfolioFile", {
      name: "essay.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: docx.length,
      bytes: docx,
    })).toMatchObject({ ok: true });
    expect(validateUpload("portfolioFile", {
      name: "grades.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      size: docx.length,
      bytes: docx,
    })).toMatchObject({ ok: false, code: "extension" });
  });

  it("requires a complete OOXML archive with the correct package parts", () => {
    const bareSignature = bytes(0x50, 0x4b, 0x03, 0x04);
    const missingContentTypes = zipSync({ "word/document.xml": strToU8(ooxmlKinds.docx.root) });
    const spreadsheet = ooxmlArchive("xlsx");

    for (const archive of [bareSignature, missingContentTypes, spreadsheet]) {
      expect(validateUpload("portfolioFile", {
        name: "essay.docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        size: archive.length,
        bytes: archive,
      })).toMatchObject({ ok: false, code: "signature" });
    }
  });

  it("requires a valid package-level officeDocument relationship to the expected main part", () => {
    const spec = ooxmlKinds.docx;
    const contentTypes = `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/${spec.requiredPart}" ContentType="${spec.contentType}"/></Types>`;
    const noRelationships = zipSync({
      "[Content_Types].xml": strToU8(contentTypes),
      [spec.requiredPart]: strToU8(spec.root),
    });
    const wrongTarget = ooxmlArchive("docx", {
      relationships: '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/other.xml"/></Relationships>',
    });

    for (const archive of [noRelationships, wrongTarget]) {
      expect(validateUpload("portfolioFile", {
        name: "essay.docx",
        mimeType: spec.mimeType,
        size: archive.length,
        bytes: archive,
      })).toMatchObject({ ok: false, code: "signature" });
    }
  });

  it("rejects malformed or DTD-bearing XML in an OOXML package", () => {
    const malformedRelationships = ooxmlArchive("docx", {
      relationships: '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship',
    });
    const malformedExtraPart = ooxmlArchive("docx", {
      extra: { "word/styles.xml": strToU8("<styles><broken></styles>") },
    });
    const dtdContentTypes = ooxmlArchive("docx", {
      contentTypes: '<!DOCTYPE Types [<!ENTITY x "value">]><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    });

    for (const archive of [malformedRelationships, malformedExtraPart, dtdContentTypes]) {
      expect(validateUpload("portfolioFile", {
        name: "essay.docx",
        mimeType: ooxmlKinds.docx.mimeType,
        size: archive.length,
        bytes: archive,
      })).toMatchObject({ ok: false, code: "signature" });
    }
  });

  it.each(Object.entries(ooxmlKinds))(
    "accepts a compressed, CRC-valid %s package",
    (extension, spec) => {
    const archive = ooxmlArchive(extension as keyof typeof ooxmlKinds);
    expect(validateUpload("assignmentSubmission", {
      name: `assignment.${extension}`,
      mimeType: spec.mimeType,
      size: archive.length,
      bytes: archive,
    })).toMatchObject({ ok: true, value: { extension, mimeType: spec.mimeType } });
  });

  it("rejects the 246-byte empty-entry OOXML fake", () => {
    const fake = emptyZipArchive(["[Content_Types].xml", "word/document.xml"]);
    expect(fake).toHaveLength(246);
    expect(validateUpload("portfolioFile", {
      name: "essay.docx",
      mimeType: ooxmlKinds.docx.mimeType,
      size: fake.length,
      bytes: fake,
    })).toMatchObject({ ok: false, code: "signature" });
  });

  it("rejects 4 GiB declarations, unsupported methods, and excessive compression ratios", () => {
    const valid = ooxmlArchive("docx");
    const local = findZipSignature(valid, 0x04034b50);
    const central = findZipSignature(valid, 0x02014b50);

    const fourGiB = valid.slice();
    new DataView(fourGiB.buffer).setUint32(local + 22, 0xffffffff, true);
    new DataView(fourGiB.buffer).setUint32(central + 24, 0xffffffff, true);

    const unsupported = valid.slice();
    new DataView(unsupported.buffer).setUint16(local + 8, 99, true);
    new DataView(unsupported.buffer).setUint16(central + 10, 99, true);

    const ratioBomb = valid.slice();
    new DataView(ratioBomb.buffer).setUint32(local + 22, 16 * 1024 * 1024, true);
    new DataView(ratioBomb.buffer).setUint32(central + 24, 16 * 1024 * 1024, true);

    for (const archive of [fourGiB, unsupported, ratioBomb]) {
      expect(validateUpload("portfolioFile", {
        name: "essay.docx",
        mimeType: ooxmlKinds.docx.mimeType,
        size: archive.length,
        bytes: archive,
      })).toMatchObject({ ok: false, code: "signature" });
    }
  });

  it("rejects a 64 MiB deflate member whose declared size and CRC describe only a tiny prefix", () => {
    const bombName = "word/media/bomb.bin";
    const archive = ooxmlArchive("docx", {
      extra: { [bombName]: new Uint8Array(64 * 1024 * 1024) },
    });
    const local = findZipEntryRecord(archive, 0x04034b50, bombName);
    const central = findZipEntryRecord(archive, 0x02014b50, bombName);
    const view = new DataView(archive.buffer);
    const forgedCrc = crc32(new Uint8Array([0]));
    expect(view.getUint16(local + 8, true)).toBe(8);
    view.setUint32(local + 14, forgedCrc, true);
    view.setUint32(local + 22, 1, true);
    view.setUint32(central + 16, forgedCrc, true);
    view.setUint32(central + 24, 1, true);

    expect(validateUpload("portfolioFile", {
      name: "essay.docx",
      mimeType: ooxmlKinds.docx.mimeType,
      size: archive.length,
      bytes: archive,
    })).toMatchObject({ ok: false, code: "signature" });
  });

  it("rejects central-directory and local-entry bounds that point outside their records", () => {
    const valid = ooxmlArchive("docx");
    const central = findZipSignature(valid, 0x02014b50);
    const eocd = findZipSignature(valid, 0x06054b50);
    const outsideLocalRecords = mutateUint32(valid, central + 42, central);
    const outsideCentralDirectory = mutateUint32(valid, eocd + 16, valid.length);

    for (const archive of [outsideLocalRecords, outsideCentralDirectory]) {
      expect(validateUpload("portfolioFile", {
        name: "essay.docx",
        mimeType: ooxmlKinds.docx.mimeType,
        size: archive.length,
        bytes: archive,
      })).toMatchObject({ ok: false, code: "signature" });
    }
  });

  it("rejects damaged deflate data and a type-confused OOXML root declaration", () => {
    const badDeflate = ooxmlArchive("docx").slice();
    const local = findZipSignature(badDeflate, 0x04034b50);
    const nameLength = new DataView(badDeflate.buffer).getUint16(local + 26, true);
    const extraLength = new DataView(badDeflate.buffer).getUint16(local + 28, true);
    badDeflate[local + 30 + nameLength + extraLength] ^= 0xff;
    const wrongContentType = ooxmlArchive("docx", {
      contentTypes: `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/${ooxmlKinds.docx.requiredPart}" ContentType="${ooxmlKinds.xlsx.contentType}"/></Types>`,
    });

    for (const archive of [badDeflate, wrongContentType]) {
      expect(validateUpload("portfolioFile", {
        name: "essay.docx",
        mimeType: ooxmlKinds.docx.mimeType,
        size: archive.length,
        bytes: archive,
      })).toMatchObject({ ok: false, code: "signature" });
    }
  });

  it("rejects CRC tampering, empty roots, and missing main-part declarations", () => {
    const valid = ooxmlArchive("docx");
    const local = findZipSignature(valid, 0x04034b50);
    const central = findZipSignature(valid, 0x02014b50);
    const badCrc = mutateUint32(mutateUint32(valid, local + 14, 0), central + 16, 0);
    const emptyRoot = ooxmlArchive("docx", {
      root: '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"></w:document>',
    });
    const missingDeclaration = ooxmlArchive("docx", {
      contentTypes: '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>',
    });

    for (const archive of [badCrc, emptyRoot, missingDeclaration]) {
      expect(validateUpload("portfolioFile", {
        name: "essay.docx",
        mimeType: ooxmlKinds.docx.mimeType,
        size: archive.length,
        bytes: archive,
      })).toMatchObject({ ok: false, code: "signature" });
    }
  });

  it("rejects packages over the entry-count limit", () => {
    const names = Array.from({ length: 513 }, (_, index) => `word/items/${index}.xml`);
    const archive = emptyZipArchive(names);
    expect(validateUpload("portfolioFile", {
      name: "essay.docx",
      mimeType: ooxmlKinds.docx.mimeType,
      size: archive.length,
      bytes: archive,
    })).toMatchObject({ ok: false, code: "signature" });
  });

  it("does not accept a legacy OLE DOC as DOCX", () => {
    const oleHeader = bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1);
    expect(validateUpload("portfolioFile", {
      name: "essay.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: oleHeader.length,
      bytes: oleHeader,
    })).toMatchObject({ ok: false, code: "signature" });
  });

  it("recognizes browser WAV aliases and normalizes the stored MIME", () => {
    const result = validateUpload("assignmentAudio", {
      name: "practice.wav",
      mimeType: "audio/x-wav",
      size: 256,
      bytes: new Uint8Array(Buffer.from("RIFF0000WAVEfmt ", "ascii")),
    });

    expect(result).toMatchObject({ ok: true, value: { extension: "wav", mimeType: "audio/wav" } });
  });

  it("keeps audio and video declarations separate even for WebM", () => {
    const header = bytes(0x1a, 0x45, 0xdf, 0xa3, 0x01);
    expect(validateUpload("assignmentAudio", {
      name: "reading.webm", mimeType: "video/webm", size: 64, bytes: header,
    })).toMatchObject({ ok: false, code: "mime" });
    expect(validateUpload("assignmentVideo", {
      name: "reading.webm", mimeType: "video/webm", size: 64, bytes: header,
    })).toMatchObject({ ok: true });
  });

  it("rejects an HEIC image renamed as MP4", () => {
    const result = validateUpload("assignmentVideo", {
      name: "recording.mp4",
      mimeType: "video/mp4",
      size: 64,
      bytes: new Uint8Array(Buffer.from("0000ftypheic", "ascii")),
    });

    expect(result).toMatchObject({ ok: false, code: "signature" });
  });
});

describe("private storage paths", () => {
  const ownerId = "11111111-1111-4111-8111-111111111111";
  const assignmentId = "22222222-2222-4222-8222-222222222222";

  it("builds and checks owner-prefixed assignment paths", () => {
    const key = ownerStorageKey(ownerId, assignmentId, "33333333-3333-4333-8333-333333333333.mp4");
    expect(hasOwnerStoragePrefix(ownerId, key)).toBe(true);
    expect(hasAssignmentStoragePrefix(ownerId, assignmentId, key)).toBe(true);
  });

  it("rejects another owner and traversal segments", () => {
    expect(hasOwnerStoragePrefix(ownerId, `other/${assignmentId}/clip.mp4`)).toBe(false);
    expect(hasAssignmentStoragePrefix(ownerId, assignmentId, `${ownerId}/${assignmentId}/../clip.mp4`)).toBe(false);
    expect(() => ownerStorageKey(ownerId, "..", "clip.mp4")).toThrow();
  });
});
