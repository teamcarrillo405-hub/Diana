import { readFile } from "node:fs/promises";
import path from "node:path";
import { isLocalNowQa, isLoopbackHost } from "../local-qa";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const files = {
  motion: { filename: "relit-motion-browser.webm", type: "video/webm" },
  poster: { filename: "relit-motion-browser-poster.webp", type: "image/webp" },
};

async function serve(request: Request, headOnly: boolean) {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, nofollow",
    "X-Content-Type-Options": "nosniff",
  });
  if (process.env.VERCEL || (process.env.NODE_ENV !== "development" && !isLocalNowQa(process.env)) || !isLoopbackHost(request.headers.get("host"))) {
    return new Response(null, { status: 404, headers });
  }
  const params = new URL(request.url).searchParams;
  const asset = params.get("asset");
  if ((asset !== "motion" && asset !== "poster") || params.getAll("asset").length !== 1 || Array.from(params.keys()).some(key => key !== "asset")) {
    return new Response(null, { status: 404, headers });
  }
  const file = files[asset];
  let data: Buffer;
  try {
    data = await readFile(path.join(process.cwd(), "artifacts", "today-graphics-fidelity", file.filename));
  } catch {
    return new Response(null, { status: 404, headers });
  }
  headers.set("Content-Type", file.type);
  headers.set("Accept-Ranges", "bytes");
  // A HEAD response describes the full resource; byte ranges apply only to GET.
  const range = headOnly ? null : request.headers.get("range");
  if (range !== null) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    const first = match?.[1] ? Number(match[1]) : undefined;
    const last = match?.[2] ? Number(match[2]) : undefined;
    const validNumbers = (first === undefined || Number.isSafeInteger(first)) && (last === undefined || Number.isSafeInteger(last));
    const start = first ?? Math.max(0, data.length - (last ?? 0));
    const end = first !== undefined && last !== undefined ? Math.min(last, data.length - 1) : data.length - 1;
    if (!match || (first === undefined && last === undefined) || !validNumbers || start > end || start >= data.length) {
      headers.set("Content-Range", `bytes */${data.length}`);
      return new Response(null, { status: 416, headers });
    }
    headers.set("Content-Range", `bytes ${start}-${end}/${data.length}`);
    headers.set("Content-Length", String(end - start + 1));
    return new Response(new Uint8Array(data.subarray(start, end + 1)), { status: 206, headers });
  }
  headers.set("Content-Length", String(data.length));
  return new Response(headOnly ? null : new Uint8Array(data), { headers });
}

export function GET(request: Request) {
  return serve(request, false);
}

export function HEAD(request: Request) {
  return serve(request, true);
}
