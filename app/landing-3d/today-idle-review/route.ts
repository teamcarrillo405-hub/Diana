import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return new Response(null, { status: 404 });
  }

  const asset = new URL(request.url).searchParams.get("asset");
  if (asset !== null && asset !== "motion") {
    return new Response(null, { status: 404 });
  }

  const isVideo = asset === "motion";
  const file = path.join(
    process.cwd(),
    "artifacts/today-diana-idle",
    isVideo ? "diana-idle-loop-local-test.mp4" : "review.html",
  );
  let data: Buffer;
  try {
    data = await readFile(file);
  } catch {
    return new Response("Local review asset is not available.", { status: 404 });
  }
  if (!isVideo) {
    const nonce = request.headers.get("x-nonce") ?? "";
    const safeNonce = /^[A-Za-z0-9+/=]+$/.test(nonce) ? nonce : "";
    data = Buffer.from(data.toString("utf8").replace("__REVIEW_NONCE__", safeNonce));
  }

  const headers = new Headers({
    "Content-Type": isVideo ? "video/mp4" : "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, nofollow",
    "X-Content-Type-Options": "nosniff",
  });
  if (isVideo) headers.set("Accept-Ranges", "bytes");

  const range = request.headers.get("range");
  if (isVideo && range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) {
      headers.set("Content-Range", `bytes */${data.length}`);
      return new Response(null, { status: 416, headers });
    }
    const start = match[1] ? Number(match[1]) : Math.max(0, data.length - Number(match[2]));
    const end = match[1] && match[2] ? Math.min(Number(match[2]), data.length - 1) : data.length - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= data.length) {
      headers.set("Content-Range", `bytes */${data.length}`);
      return new Response(null, { status: 416, headers });
    }
    headers.set("Content-Range", `bytes ${start}-${end}/${data.length}`);
    headers.set("Content-Length", String(end - start + 1));
    return new Response(new Uint8Array(data.subarray(start, end + 1)), { status: 206, headers });
  }
  headers.set("Content-Length", String(data.length));
  return new Response(new Uint8Array(data), { headers });
}
