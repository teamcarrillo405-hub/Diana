import { Inflate } from "fflate";
import { SaxesParser, type SaxesTagNS } from "saxes";

export const MEBIBYTE = 1024 * 1024;
export const UPLOAD_HEADER_BYTES = 4096;

export type UploadPurpose =
  | "assignmentSource"
  | "assignmentSubmission"
  | "aiToolImage"
  | "portfolioFile"
  | "landingAsset"
  | "noteAudio"
  | "noteDocument"
  | "quickAddPhoto"
  | "shareTarget"
  | "diagramImage"
  | "voiceAudio"
  | "assignmentAudio"
  | "assignmentVideo";

type Signature = (bytes: Uint8Array) => boolean;

type FormatRule = {
  extensions: readonly string[];
  mimeTypes: readonly string[];
  canonicalMime: string;
  signature: Signature;
};

type UploadPolicy = {
  maxBytes: number;
  formats: readonly FormatRule[];
};

export type UploadMetadata = {
  name: string;
  mimeType: string;
  size: number;
  bytes: Uint8Array;
};

export type ValidatedUpload = {
  extension: string;
  mimeType: string;
  size: number;
};

export type UploadValidationResult =
  | { ok: true; value: ValidatedUpload }
  | { ok: false; error: string; code: "empty" | "size" | "extension" | "mime" | "signature" };

const startsWith = (bytes: Uint8Array, expected: readonly number[]) =>
  expected.every((value, index) => bytes[index] === value);

const ascii = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.slice(start, start + length));

const uint16le = (bytes: Uint8Array, offset: number) =>
  bytes[offset] | (bytes[offset + 1] << 8);

const uint32le = (bytes: Uint8Array, offset: number) =>
  (bytes[offset]
    | (bytes[offset + 1] << 8)
    | (bytes[offset + 2] << 16)
    | (bytes[offset + 3] << 24)) >>> 0;

const uint32be = (bytes: Uint8Array, offset: number) =>
  (((bytes[offset] << 24) >>> 0)
    | (bytes[offset + 1] << 16)
    | (bytes[offset + 2] << 8)
    | bytes[offset + 3]) >>> 0;

const crcTable = new Uint32Array(256).map((_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const value of bytes) crc = crcTable[(crc ^ value) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

const pdf: Signature = (bytes) => ascii(bytes, 0, 5) === "%PDF-";
const jpeg: Signature = (bytes) => startsWith(bytes, [0xff, 0xd8, 0xff]);
const png: Signature = (bytes) => {
  if (!startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return false;

  let offset = 8;
  let sawHeader = false;
  let sawImageData = false;
  while (offset + 12 <= bytes.length) {
    const length = uint32be(bytes, offset);
    const type = ascii(bytes, offset + 4, 4);
    const dataOffset = offset + 8;
    const crcOffset = dataOffset + length;
    const nextOffset = crcOffset + 4;
    if (!/^[A-Za-z]{4}$/u.test(type) || nextOffset > bytes.length) return false;
    if (crc32(bytes.slice(offset + 4, crcOffset)) !== uint32be(bytes, crcOffset)) return false;

    if (!sawHeader) {
      if (type !== "IHDR" || length !== 13) return false;
      const width = uint32be(bytes, dataOffset);
      const height = uint32be(bytes, dataOffset + 4);
      const bitDepth = bytes[dataOffset + 8];
      const colorType = bytes[dataOffset + 9];
      const validDepths: Record<number, readonly number[]> = {
        0: [1, 2, 4, 8, 16],
        2: [8, 16],
        3: [1, 2, 4, 8],
        4: [8, 16],
        6: [8, 16],
      };
      if (
        width === 0
        || height === 0
        || !validDepths[colorType]?.includes(bitDepth)
        || bytes[dataOffset + 10] !== 0
        || bytes[dataOffset + 11] !== 0
        || ![0, 1].includes(bytes[dataOffset + 12])
      ) return false;
      sawHeader = true;
    } else if (type === "IHDR") {
      return false;
    }

    if (type === "IDAT") {
      if (length === 0) return false;
      sawImageData = true;
    }
    if (type === "IEND") return length === 0 && sawImageData && nextOffset === bytes.length;
    offset = nextOffset;
  }
  return false;
};
const gif: Signature = (bytes) => ["GIF87a", "GIF89a"].includes(ascii(bytes, 0, 6));
const webp: Signature = (bytes) => {
  if (
    bytes.length < 12
    || ascii(bytes, 0, 4) !== "RIFF"
    || ascii(bytes, 8, 4) !== "WEBP"
    || uint32le(bytes, 4) !== bytes.length - 8
  ) return false;

  let offset = 12;
  let sawExtendedHeader = false;
  let sawImageData = false;
  while (offset + 8 <= bytes.length) {
    const type = ascii(bytes, offset, 4);
    const length = uint32le(bytes, offset + 4);
    const dataOffset = offset + 8;
    const nextOffset = dataOffset + length + (length & 1);
    if (nextOffset > bytes.length) return false;

    if (type === "VP8 ") {
      if (
        length < 10
        || sawImageData
        || (!sawExtendedHeader && offset !== 12)
        || !startsWith(bytes.slice(dataOffset + 3), [0x9d, 0x01, 0x2a])
        || (uint16le(bytes, dataOffset + 6) & 0x3fff) === 0
        || (uint16le(bytes, dataOffset + 8) & 0x3fff) === 0
      ) return false;
      sawImageData = true;
    } else if (type === "VP8L") {
      if (length < 5 || sawImageData || (!sawExtendedHeader && offset !== 12) || bytes[dataOffset] !== 0x2f) return false;
      const dimensions = uint32le(bytes, dataOffset + 1);
      if ((dimensions >>> 29) !== 0) return false;
      sawImageData = true;
    } else if (type === "VP8X") {
      if (length !== 10 || sawExtendedHeader || offset !== 12) return false;
      if ((bytes[dataOffset] & 0xc1) !== 0 || bytes[dataOffset + 1] !== 0 || bytes[dataOffset + 2] !== 0 || bytes[dataOffset + 3] !== 0) return false;
      sawExtendedHeader = true;
    } else if (type === "ANMF") {
      if (!sawExtendedHeader || length < 16) return false;
      sawImageData = true;
    }
    offset = nextOffset;
  }
  return offset === bytes.length && sawImageData;
};
const wav: Signature = (bytes) => ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WAVE";
const ogg: Signature = (bytes) => ascii(bytes, 0, 4) === "OggS";
const webm: Signature = (bytes) => startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3]);
const mp3: Signature = (bytes) =>
  ascii(bytes, 0, 3) === "ID3" || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
const isoBaseMedia: Signature = (bytes) => bytes.length >= 12 && ascii(bytes, 4, 4) === "ftyp";
const avif: Signature = (bytes) => {
  if (bytes.length < 16 || ascii(bytes, 4, 4) !== "ftyp") return false;
  const boxLength = uint32be(bytes, 0);
  if (boxLength < 16 || boxLength > bytes.length || (boxLength - 16) % 4 !== 0) return false;

  const brands = [ascii(bytes, 8, 4)];
  for (let offset = 16; offset < boxLength; offset += 4) {
    brands.push(ascii(bytes, offset, 4));
  }
  return brands.some((brand) => brand === "avif" || brand === "avis");
};
const mediaIsoBase: Signature = (bytes) => {
  if (!isoBaseMedia(bytes)) return false;
  return !["heic", "heix", "hevc", "hevx", "mif1", "msf1", "avif", "avis"].includes(ascii(bytes, 8, 4));
};
const heif: Signature = (bytes) => {
  if (!isoBaseMedia(bytes)) return false;
  const brand = ascii(bytes, 8, 4);
  return ["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand);
};
const ZIP_LOCAL_HEADER = 0x04034b50;
const ZIP_CENTRAL_HEADER = 0x02014b50;
const ZIP_END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const ZIP_DATA_DESCRIPTOR = 0x08074b50;
const ZIP_EOCD_MIN_BYTES = 22;
const ZIP_MAX_COMMENT_BYTES = 0xffff;
const ZIP_MAX_ENTRIES = 512;
const ZIP_MAX_ENTRY_NAME_BYTES = 512;
const ZIP_MAX_CENTRAL_DIRECTORY_BYTES = 2 * MEBIBYTE;
const ZIP_MAX_ENTRY_COMPRESSED_BYTES = 20 * MEBIBYTE;
const ZIP_MAX_ENTRY_UNCOMPRESSED_BYTES = 16 * MEBIBYTE;
const ZIP_MAX_TOTAL_UNCOMPRESSED_BYTES = 64 * MEBIBYTE;
const ZIP_MAX_XML_BYTES = 2 * MEBIBYTE;
const ZIP_MAX_COMPRESSION_RATIO = 200;
const ZIP_SUPPORTED_FLAGS = 0x080e; // UTF-8 names, data descriptors, and deflate options.
const ZIP64_EXTRA_FIELD = 0x0001;

type ZipEntry = {
  name: string;
  compression: 0 | 8;
  crc32: number;
  compressedSize: number;
  uncompressedSize: number;
  localOffset: number;
  dataOffset: number;
  recordEnd: number;
};

type OoxmlSpec = {
  requiredPart: string;
  contentType: string;
  relationshipTypes: readonly string[];
  rootLocalName: string;
  rootNamespaces: readonly string[];
};

type ParsedXmlElement = {
  localName: string;
  namespace: string;
  attributes: Map<string, string>;
};

type ParsedXmlDocument = {
  root: ParsedXmlElement;
  directChildren: ParsedXmlElement[];
  elementCount: number;
};

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function hasValidZipExtraFields(bytes: Uint8Array, start: number, length: number): boolean {
  const end = start + length;
  if (end > bytes.length) return false;
  let offset = start;
  while (offset < end) {
    if (offset + 4 > end) return false;
    const fieldId = uint16le(bytes, offset);
    const fieldLength = uint16le(bytes, offset + 2);
    if (fieldId === ZIP64_EXTRA_FIELD || offset + 4 + fieldLength > end) return false;
    offset += 4 + fieldLength;
  }
  return offset === end;
}

function decodeZipEntryName(nameBytes: Uint8Array, flags: number): string | null {
  if (nameBytes.length === 0 || nameBytes.length > ZIP_MAX_ENTRY_NAME_BYTES || nameBytes.includes(0)) return null;
  try {
    if ((flags & 0x0800) === 0 && nameBytes.some((value) => value > 0x7f)) return null;
    const name = new TextDecoder((flags & 0x0800) !== 0 ? "utf-8" : "ascii", { fatal: true }).decode(nameBytes);
    if (
      name.includes("\\")
      || name.startsWith("/")
      || /^[a-zA-Z]:/u.test(name)
      || name.split("/").some((segment) => segment === "." || segment === "..")
    ) return null;
    return name;
  } catch {
    return null;
  }
}

function findZipEndOfCentralDirectory(bytes: Uint8Array): number {
  const firstCandidate = Math.max(0, bytes.length - ZIP_EOCD_MIN_BYTES - ZIP_MAX_COMMENT_BYTES);
  for (let offset = bytes.length - ZIP_EOCD_MIN_BYTES; offset >= firstCandidate; offset -= 1) {
    if (uint32le(bytes, offset) !== ZIP_END_OF_CENTRAL_DIRECTORY) continue;
    const commentLength = uint16le(bytes, offset + 20);
    if (offset + ZIP_EOCD_MIN_BYTES + commentLength === bytes.length) return offset;
  }
  return -1;
}

function parseZipEntries(bytes: Uint8Array): Map<string, ZipEntry> | null {
  if (bytes.length < ZIP_EOCD_MIN_BYTES || bytes.length > 20 * MEBIBYTE) return null;
  const eocdOffset = findZipEndOfCentralDirectory(bytes);
  if (eocdOffset < 0) return null;

  const diskNumber = uint16le(bytes, eocdOffset + 4);
  const centralDisk = uint16le(bytes, eocdOffset + 6);
  const entriesOnDisk = uint16le(bytes, eocdOffset + 8);
  const totalEntries = uint16le(bytes, eocdOffset + 10);
  const centralSize = uint32le(bytes, eocdOffset + 12);
  const centralOffset = uint32le(bytes, eocdOffset + 16);
  if (
    diskNumber !== 0
    || centralDisk !== 0
    || entriesOnDisk !== totalEntries
    || totalEntries === 0
    || totalEntries > ZIP_MAX_ENTRIES
    || totalEntries === 0xffff
    || centralSize === 0xffffffff
    || centralSize > ZIP_MAX_CENTRAL_DIRECTORY_BYTES
    || centralOffset === 0xffffffff
    || centralOffset + centralSize !== eocdOffset
  ) return null;

  const entries = new Map<string, ZipEntry>();
  let totalUncompressedSize = 0;
  let offset = centralOffset;
  for (let index = 0; index < totalEntries; index += 1) {
    if (offset + 46 > eocdOffset || uint32le(bytes, offset) !== ZIP_CENTRAL_HEADER) return null;
    const versionNeeded = uint16le(bytes, offset + 6);
    const flags = uint16le(bytes, offset + 8);
    const compression = uint16le(bytes, offset + 10);
    const crc32 = uint32le(bytes, offset + 16);
    const compressedSize = uint32le(bytes, offset + 20);
    const uncompressedSize = uint32le(bytes, offset + 24);
    const nameLength = uint16le(bytes, offset + 28);
    const extraLength = uint16le(bytes, offset + 30);
    const commentLength = uint16le(bytes, offset + 32);
    const entryDisk = uint16le(bytes, offset + 34);
    const localOffset = uint32le(bytes, offset + 42);
    const nextOffset = offset + 46 + nameLength + extraLength + commentLength;
    if (
      (flags & 0x0001) !== 0
      || (flags & ~ZIP_SUPPORTED_FLAGS) !== 0
      || versionNeeded > 63
      || (compression !== 0 && compression !== 8)
      || entryDisk !== 0
      || compressedSize === 0xffffffff
      || compressedSize > ZIP_MAX_ENTRY_COMPRESSED_BYTES
      || uncompressedSize === 0xffffffff
      || localOffset === 0xffffffff
      || nameLength === 0
      || nameLength > ZIP_MAX_ENTRY_NAME_BYTES
      || nextOffset > eocdOffset
      || localOffset + 30 > centralOffset
      || uint32le(bytes, localOffset) !== ZIP_LOCAL_HEADER
      || !hasValidZipExtraFields(bytes, offset + 46 + nameLength, extraLength)
      || uncompressedSize > ZIP_MAX_ENTRY_UNCOMPRESSED_BYTES
      || (uncompressedSize > 0 && compressedSize === 0)
      || (uncompressedSize > 0 && uncompressedSize / compressedSize > ZIP_MAX_COMPRESSION_RATIO)
      || (compression === 0 && compressedSize !== uncompressedSize)
    ) return null;

    const nameBytes = bytes.slice(offset + 46, offset + 46 + nameLength);
    const name = decodeZipEntryName(nameBytes, flags);
    if (!name || entries.has(name)) return null;

    totalUncompressedSize += uncompressedSize;
    if (totalUncompressedSize > ZIP_MAX_TOTAL_UNCOMPRESSED_BYTES) return null;

    const localVersionNeeded = uint16le(bytes, localOffset + 4);
    const localFlags = uint16le(bytes, localOffset + 6);
    const localCompression = uint16le(bytes, localOffset + 8);
    const localCrc32 = uint32le(bytes, localOffset + 14);
    const localCompressedSize = uint32le(bytes, localOffset + 18);
    const localUncompressedSize = uint32le(bytes, localOffset + 22);
    const localNameLength = uint16le(bytes, localOffset + 26);
    const localExtraLength = uint16le(bytes, localOffset + 28);
    const localNameBytes = bytes.slice(localOffset + 30, localOffset + 30 + localNameLength);
    const localDataOffset = localOffset + 30 + localNameLength + localExtraLength;
    if (
      localVersionNeeded !== versionNeeded
      || localFlags !== flags
      || localCompression !== compression
      || localNameLength !== nameLength
      || !equalBytes(localNameBytes, nameBytes)
      || !hasValidZipExtraFields(bytes, localOffset + 30 + localNameLength, localExtraLength)
      || localDataOffset + compressedSize > centralOffset
      || ((flags & 0x0008) === 0 && (
        localCrc32 !== crc32
        || localCompressedSize !== compressedSize
        || localUncompressedSize !== uncompressedSize
      ))
      || ((flags & 0x0008) !== 0 && (
        ![0, crc32].includes(localCrc32)
        || ![0, compressedSize].includes(localCompressedSize)
        || ![0, uncompressedSize].includes(localUncompressedSize)
      ))
    ) return null;

    let recordEnd = localDataOffset + compressedSize;
    if ((flags & 0x0008) !== 0) {
      const hasSignature = uint32le(bytes, recordEnd) === ZIP_DATA_DESCRIPTOR;
      const descriptorOffset = recordEnd + (hasSignature ? 4 : 0);
      if (
        descriptorOffset + 12 > centralOffset
        || uint32le(bytes, descriptorOffset) !== crc32
        || uint32le(bytes, descriptorOffset + 4) !== compressedSize
        || uint32le(bytes, descriptorOffset + 8) !== uncompressedSize
      ) return null;
      recordEnd = descriptorOffset + 12;
    }

    entries.set(name, {
      name,
      compression,
      crc32,
      compressedSize,
      uncompressedSize,
      localOffset,
      dataOffset: localDataOffset,
      recordEnd,
    });
    offset = nextOffset;
  }
  if (offset !== eocdOffset) return null;

  const localEntries = [...entries.values()].sort((left, right) => left.localOffset - right.localOffset);
  if (localEntries[0]?.localOffset !== 0) return null;
  for (let index = 0; index < localEntries.length; index += 1) {
    const expectedEnd = localEntries[index + 1]?.localOffset ?? centralOffset;
    if (localEntries[index].recordEnd !== expectedEnd) return null;
  }
  return entries;
}

function decompressZipEntry(bytes: Uint8Array, entry: ZipEntry, maxBytes: number): Uint8Array | null {
  const compressed = bytes.slice(entry.dataOffset, entry.dataOffset + entry.compressedSize);
  try {
    let output: Uint8Array;
    if (entry.compression === 0) {
      if (compressed.length > maxBytes) return null;
      output = compressed;
    } else {
      const chunks: Uint8Array[] = [];
      let outputLength = 0;
      let finished = false;
      const inflator = new Inflate((chunk, final) => {
        outputLength += chunk.length;
        if (outputLength > maxBytes) throw new Error("ZIP entry exceeds the inflation limit");
        chunks.push(chunk.slice());
        finished = final;
      });
      const inputChunkBytes = 1024;
      for (let offset = 0; offset < compressed.length; offset += inputChunkBytes) {
        const end = Math.min(offset + inputChunkBytes, compressed.length);
        inflator.push(compressed.slice(offset, end), end === compressed.length);
      }
      if (!finished) return null;
      output = new Uint8Array(outputLength);
      let outputOffset = 0;
      for (const chunk of chunks) {
        output.set(chunk, outputOffset);
        outputOffset += chunk.length;
      }
    }
    if (output.length !== entry.uncompressedSize || crc32(output) !== entry.crc32) return null;
    return output;
  } catch {
    return null;
  }
}

function xmlAttributes(tag: SaxesTagNS): Map<string, string> {
  const attributes = new Map<string, string>();
  for (const attribute of Object.values(tag.attributes)) {
    if (attribute.uri === "") attributes.set(attribute.local, attribute.value);
  }
  return attributes;
}

function parseXml(bytes: Uint8Array): ParsedXmlDocument | null {
  if (bytes.length === 0 || bytes.includes(0)) return null;
  try {
    const xml = new TextDecoder("utf-8", { fatal: true }).decode(bytes).trim();
    if (!xml || /<!DOCTYPE/iu.test(xml)) return null;

    const parser = new SaxesParser({ xmlns: true, position: false });
    let root: ParsedXmlElement | null = null;
    const directChildren: ParsedXmlElement[] = [];
    let depth = 0;
    let elementCount = 0;

    parser.on("doctype", () => {
      throw new Error("DTDs are not allowed in OOXML packages");
    });
    parser.on("error", (error) => {
      throw error;
    });
    parser.on("opentag", (tag) => {
      depth += 1;
      elementCount += 1;
      const element: ParsedXmlElement = {
        localName: tag.local,
        namespace: tag.uri,
        attributes: xmlAttributes(tag),
      };
      if (depth === 1) root = element;
      else if (depth === 2) directChildren.push(element);
    });
    parser.on("closetag", () => {
      depth -= 1;
    });
    parser.write(xml).close();
    if (!root || depth !== 0) return null;
    return { root, directChildren, elementCount };
  } catch {
    return null;
  }
}

function hasExpectedContentType(document: ParsedXmlDocument, spec: OoxmlSpec): boolean {
  const { root } = document;
  if (
    root.localName !== "Types"
    || root.namespace !== "http://schemas.openxmlformats.org/package/2006/content-types"
  ) return false;

  return document.directChildren.some((element) => (
    element.localName === "Override"
    && element.namespace === root.namespace
    && element.attributes.get("PartName") === `/${spec.requiredPart}`
    && element.attributes.get("ContentType") === spec.contentType
  ));
}

function hasExpectedOfficeDocumentRelationship(document: ParsedXmlDocument, spec: OoxmlSpec): boolean {
  const relationshipNamespace = "http://schemas.openxmlformats.org/package/2006/relationships";
  if (document.root.localName !== "Relationships" || document.root.namespace !== relationshipNamespace) return false;

  const officeRelationships = document.directChildren.filter((element) => (
    element.localName === "Relationship"
    && element.namespace === relationshipNamespace
    && spec.relationshipTypes.includes(element.attributes.get("Type") ?? "")
  ));
  if (officeRelationships.length !== 1) return false;

  const relationship = officeRelationships[0];
  const target = relationship.attributes.get("Target") ?? "";
  const targetMode = relationship.attributes.get("TargetMode");
  return Boolean(relationship.attributes.get("Id"))
    && (targetMode === undefined || targetMode === "Internal")
    && !target.includes("\\")
    && !target.includes("?")
    && !target.includes("#")
    && target.replace(/^\/+/, "") === spec.requiredPart;
}

function hasExpectedOoxmlRoot(document: ParsedXmlDocument, spec: OoxmlSpec): boolean {
  return document.root.localName === spec.rootLocalName
    && spec.rootNamespaces.includes(document.root.namespace)
    && document.elementCount > 1;
}

function inflateAndValidateZipEntries(
  bytes: Uint8Array,
  entries: Map<string, ZipEntry>,
): Map<string, Uint8Array> | null {
  const inflated = new Map<string, Uint8Array>();
  let totalActualBytes = 0;
  for (const entry of entries.values()) {
    const remainingBytes = ZIP_MAX_TOTAL_UNCOMPRESSED_BYTES - totalActualBytes;
    if (remainingBytes < 0) return null;
    const output = decompressZipEntry(
      bytes,
      entry,
      Math.min(ZIP_MAX_ENTRY_UNCOMPRESSED_BYTES, remainingBytes),
    );
    if (!output) return null;
    totalActualBytes += output.length;
    if (totalActualBytes > ZIP_MAX_TOTAL_UNCOMPRESSED_BYTES) return null;
    inflated.set(entry.name, output);
  }
  return inflated;
}

const ooxml = (spec: OoxmlSpec): Signature => (bytes) => {
  const entries = parseZipEntries(bytes);
  if (!entries) return false;
  const inflated = inflateAndValidateZipEntries(bytes, entries);
  if (!inflated) return false;
  const contentTypes = inflated.get("[Content_Types].xml");
  const relationships = inflated.get("_rels/.rels");
  const rootPart = inflated.get(spec.requiredPart);
  if (
    !contentTypes
    || !relationships
    || !rootPart
    || contentTypes.length > ZIP_MAX_XML_BYTES
    || relationships.length > ZIP_MAX_XML_BYTES
    || rootPart.length > ZIP_MAX_XML_BYTES
  ) return false;

  for (const [name, output] of inflated) {
    if ((name.endsWith(".xml") || name.endsWith(".rels")) && parseXml(output) === null) return false;
  }
  const contentTypesXml = parseXml(contentTypes);
  const relationshipsXml = parseXml(relationships);
  const rootXml = parseXml(rootPart);
  return contentTypesXml !== null
    && relationshipsXml !== null
    && rootXml !== null
    && hasExpectedContentType(contentTypesXml, spec)
    && hasExpectedOfficeDocumentRelationship(relationshipsXml, spec)
    && hasExpectedOoxmlRoot(rootXml, spec);
};

const OOXML_SPECS = {
  docx: {
    requiredPart: "word/document.xml",
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml",
    relationshipTypes: [
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
      "http://purl.oclc.org/ooxml/officeDocument/relationships/officeDocument",
    ],
    rootLocalName: "document",
    rootNamespaces: [
      "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
      "http://purl.oclc.org/ooxml/wordprocessingml/main",
    ],
  },
  xlsx: {
    requiredPart: "xl/workbook.xml",
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml",
    relationshipTypes: [
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
      "http://purl.oclc.org/ooxml/officeDocument/relationships/officeDocument",
    ],
    rootLocalName: "workbook",
    rootNamespaces: [
      "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
      "http://purl.oclc.org/ooxml/spreadsheetml/main",
    ],
  },
  pptx: {
    requiredPart: "ppt/presentation.xml",
    contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml",
    relationshipTypes: [
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
      "http://purl.oclc.org/ooxml/officeDocument/relationships/officeDocument",
    ],
    rootLocalName: "presentation",
    rootNamespaces: [
      "http://schemas.openxmlformats.org/presentationml/2006/main",
      "http://purl.oclc.org/ooxml/presentationml/main",
    ],
  },
} satisfies Record<string, OoxmlSpec>;

const ole: Signature = (bytes) => startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const plainText: Signature = (bytes) => {
  if (bytes.length === 0 || bytes.includes(0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return true;
  } catch {
    return false;
  }
};

const formats = {
  pdf: { extensions: ["pdf"], mimeTypes: ["application/pdf"], canonicalMime: "application/pdf", signature: pdf },
  jpeg: { extensions: ["jpg", "jpeg"], mimeTypes: ["image/jpeg", "image/jpg"], canonicalMime: "image/jpeg", signature: jpeg },
  png: { extensions: ["png"], mimeTypes: ["image/png"], canonicalMime: "image/png", signature: png },
  webp: { extensions: ["webp"], mimeTypes: ["image/webp"], canonicalMime: "image/webp", signature: webp },
  gif: { extensions: ["gif"], mimeTypes: ["image/gif"], canonicalMime: "image/gif", signature: gif },
  avif: { extensions: ["avif"], mimeTypes: ["image/avif"], canonicalMime: "image/avif", signature: avif },
  heic: { extensions: ["heic"], mimeTypes: ["image/heic", "image/heif"], canonicalMime: "image/heic", signature: heif },
  heif: { extensions: ["heif"], mimeTypes: ["image/heif", "image/heic"], canonicalMime: "image/heif", signature: heif },
  text: { extensions: ["txt"], mimeTypes: ["text/plain"], canonicalMime: "text/plain", signature: plainText },
  doc: { extensions: ["doc"], mimeTypes: ["application/msword"], canonicalMime: "application/msword", signature: ole },
  docx: { extensions: ["docx"], mimeTypes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"], canonicalMime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", signature: ooxml(OOXML_SPECS.docx) },
  xls: { extensions: ["xls"], mimeTypes: ["application/vnd.ms-excel"], canonicalMime: "application/vnd.ms-excel", signature: ole },
  xlsx: { extensions: ["xlsx"], mimeTypes: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"], canonicalMime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", signature: ooxml(OOXML_SPECS.xlsx) },
  ppt: { extensions: ["ppt"], mimeTypes: ["application/vnd.ms-powerpoint"], canonicalMime: "application/vnd.ms-powerpoint", signature: ole },
  pptx: { extensions: ["pptx"], mimeTypes: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"], canonicalMime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", signature: ooxml(OOXML_SPECS.pptx) },
  mp3: { extensions: ["mp3"], mimeTypes: ["audio/mpeg"], canonicalMime: "audio/mpeg", signature: mp3 },
  m4a: { extensions: ["m4a"], mimeTypes: ["audio/mp4", "audio/x-m4a"], canonicalMime: "audio/mp4", signature: mediaIsoBase },
  wav: { extensions: ["wav"], mimeTypes: ["audio/wav", "audio/x-wav"], canonicalMime: "audio/wav", signature: wav },
  audioWebm: { extensions: ["webm"], mimeTypes: ["audio/webm"], canonicalMime: "audio/webm", signature: webm },
  audioOgg: { extensions: ["ogg", "oga"], mimeTypes: ["audio/ogg"], canonicalMime: "audio/ogg", signature: ogg },
  videoMp4: { extensions: ["mp4", "m4v"], mimeTypes: ["video/mp4"], canonicalMime: "video/mp4", signature: mediaIsoBase },
  videoWebm: { extensions: ["webm"], mimeTypes: ["video/webm"], canonicalMime: "video/webm", signature: webm },
  quicktime: { extensions: ["mov"], mimeTypes: ["video/quicktime"], canonicalMime: "video/quicktime", signature: mediaIsoBase },
} satisfies Record<string, FormatRule>;

const images = [formats.jpeg, formats.png, formats.webp, formats.gif] as const;
const noteImages = [...images, formats.heic, formats.heif] as const;
const office = [formats.doc, formats.docx, formats.xls, formats.xlsx, formats.ppt, formats.pptx] as const;
const audio = [formats.mp3, formats.m4a, formats.wav, formats.audioWebm, formats.audioOgg] as const;

export const UPLOAD_POLICIES: Record<UploadPurpose, UploadPolicy> = {
  assignmentSource: { maxBytes: 20 * MEBIBYTE, formats: [formats.pdf, ...images, formats.text] },
  assignmentSubmission: { maxBytes: 20 * MEBIBYTE, formats: [formats.pdf, ...images, formats.text, ...office] },
  aiToolImage: { maxBytes: 10 * MEBIBYTE, formats: images },
  portfolioFile: { maxBytes: 20 * MEBIBYTE, formats: [formats.pdf, ...images, formats.doc, formats.docx] },
  landingAsset: { maxBytes: 10 * MEBIBYTE, formats: [...images, formats.avif] },
  noteAudio: { maxBytes: 25 * MEBIBYTE, formats: audio },
  noteDocument: { maxBytes: 20 * MEBIBYTE, formats: [formats.pdf, ...noteImages] },
  quickAddPhoto: { maxBytes: 10 * MEBIBYTE, formats: images },
  shareTarget: { maxBytes: 20 * MEBIBYTE, formats: [formats.pdf, ...noteImages, formats.text] },
  diagramImage: { maxBytes: 10 * MEBIBYTE, formats: images },
  voiceAudio: { maxBytes: 25 * MEBIBYTE, formats: [formats.audioWebm] },
  assignmentAudio: { maxBytes: 250 * MEBIBYTE, formats: audio },
  assignmentVideo: { maxBytes: 250 * MEBIBYTE, formats: [formats.videoMp4, formats.videoWebm, formats.quicktime] },
};

export function fileExtension(name: string): string {
  const base = name.trim().split(/[\\/]/u).pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot > 0 && dot < base.length - 1 ? base.slice(dot + 1).toLowerCase() : "";
}

export function validateUpload(
  purpose: UploadPurpose,
  metadata: UploadMetadata,
): UploadValidationResult {
  const policy = UPLOAD_POLICIES[purpose];
  if (!Number.isSafeInteger(metadata.size) || metadata.size <= 0) {
    return { ok: false, code: "empty", error: "Choose a file with content in it." };
  }
  if (metadata.size > policy.maxBytes) {
    return { ok: false, code: "size", error: `Choose a file no larger than ${policy.maxBytes / MEBIBYTE} MB.` };
  }

  const extension = fileExtension(metadata.name);
  const extensionRule = policy.formats.find((format) => format.extensions.includes(extension));
  if (!extensionRule) {
    return { ok: false, code: "extension", error: "Choose a supported file type." };
  }

  const mimeType = metadata.mimeType.trim().toLowerCase().split(";", 1)[0];
  if (!extensionRule.mimeTypes.includes(mimeType)) {
    return {
      ok: false,
      code: "mime",
      error: "The file name and format do not match. Choose the original file or export it again.",
    };
  }
  if (!extensionRule.signature(metadata.bytes)) {
    return {
      ok: false,
      code: "signature",
      error: "This file does not match its reported format. Choose the original file or export it again.",
    };
  }

  return {
    ok: true,
    value: {
      extension: extensionRule.extensions[0],
      mimeType: extensionRule.canonicalMime,
      size: metadata.size,
    },
  };
}

export async function validateFileUpload(
  purpose: UploadPurpose,
  file: File,
): Promise<UploadValidationResult> {
  const extension = fileExtension(file.name);
  const bytes = ["docx", "xlsx", "pptx", "png", "webp"].includes(extension)
    ? new Uint8Array(await file.arrayBuffer())
    : await readUploadHeader(file);
  return validateUpload(purpose, {
    name: file.name,
    mimeType: file.type,
    size: file.size,
    bytes,
  });
}

export async function readUploadHeader(file: Blob): Promise<Uint8Array> {
  return new Uint8Array(await file.slice(0, UPLOAD_HEADER_BYTES).arrayBuffer());
}

export function ownerStorageKey(ownerId: string, ...segments: string[]): string {
  const safeSegments = [ownerId, ...segments];
  if (safeSegments.some((segment) => !/^[a-zA-Z0-9._-]+$/u.test(segment) || segment === "." || segment === "..")) {
    throw new Error("Storage path contains an unsafe segment.");
  }
  return safeSegments.join("/");
}

export function hasOwnerStoragePrefix(ownerId: string, storageKey: string): boolean {
  return storageKey.startsWith(`${ownerId}/`) && !storageKey.includes("\\") && !storageKey.split("/").includes("..");
}

export function hasAssignmentStoragePrefix(
  ownerId: string,
  assignmentId: string,
  storageKey: string,
): boolean {
  return storageKey.startsWith(`${ownerId}/${assignmentId}/`) && hasOwnerStoragePrefix(ownerId, storageKey);
}
