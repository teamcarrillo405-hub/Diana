import { createHash, randomBytes } from "node:crypto";

const SHARE_TOKEN_BYTES = 32;

export function createShareToken(): string {
  return randomBytes(SHARE_TOKEN_BYTES).toString("base64url");
}

export function digestShareToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
