import { jsonByteLength, utf8ByteLength } from "@/lib/specialist-artifacts/bounds";

export const ARTIFACT_BLOCK_CONTENT_MAX_BYTES = 2_000_000;
export const ARTIFACT_BLOCK_PLAIN_TEXT_MAX_BYTES = 1_000_000;
export const ARTIFACT_BLOCK_SOURCE_ANCHOR_MAX_COUNT = 12;
export const ARTIFACT_BLOCK_SOURCE_ANCHOR_MAX_BYTES = 16_384;
export const ARTIFACT_BLOCK_MAX_PER_ASSIGNMENT = 64;

export type PersistedArtifactSourceAnchor = {
  sourceId: string;
  location?: string | null;
};

export function validateArtifactBlockPersistenceBounds(input: {
  content: Record<string, unknown>;
  plainText: string;
  sourceAnchors: readonly PersistedArtifactSourceAnchor[];
}): string | null {
  const contentBytes = jsonByteLength(input.content);
  if (contentBytes > ARTIFACT_BLOCK_CONTENT_MAX_BYTES) {
    return `Artifact content is ${contentBytes} bytes; the limit is ${ARTIFACT_BLOCK_CONTENT_MAX_BYTES}.`;
  }
  const plainTextBytes = utf8ByteLength(input.plainText);
  if (plainTextBytes > ARTIFACT_BLOCK_PLAIN_TEXT_MAX_BYTES) {
    return `Artifact text is ${plainTextBytes} bytes; the limit is ${ARTIFACT_BLOCK_PLAIN_TEXT_MAX_BYTES}.`;
  }
  if (input.sourceAnchors.length > ARTIFACT_BLOCK_SOURCE_ANCHOR_MAX_COUNT) {
    return `Artifact source anchors exceed the ${ARTIFACT_BLOCK_SOURCE_ANCHOR_MAX_COUNT}-anchor limit.`;
  }
  const sourceAnchorBytes = jsonByteLength(input.sourceAnchors);
  if (sourceAnchorBytes > ARTIFACT_BLOCK_SOURCE_ANCHOR_MAX_BYTES) {
    return `Artifact source anchors are ${sourceAnchorBytes} bytes; the limit is ${ARTIFACT_BLOCK_SOURCE_ANCHOR_MAX_BYTES}.`;
  }
  return null;
}
