import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") return new Response(null, { status: 404 });
  let data: Buffer;
  try {
    data = await readFile(path.join(process.cwd(), "artifacts/today-diana-integration/diana-idle-loop.webm"));
  } catch {
    return new Response("Local motion review is not available.", { status: 404 });
  }
  const headers = new Headers({
    "Content-Type": "video/webm",
    "Cache-Control": "no-store",
    "Accept-Ranges": "bytes",
    "X-Robots-Tag": "noindex, nofollow",
    "X-Content-Type-Options": "nosniff",
  });
  const range = request.headers.get("range");
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    const start = match?.[1] ? Number(match[1]) : Math.max(0, data.length - Number(match?.[2]));
    const end = match?.[1] && match[2] ? Math.min(Number(match[2]), data.length - 1) : data.length - 1;
    if (!match || (!match[1] && !match[2]) || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= data.length) {
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
