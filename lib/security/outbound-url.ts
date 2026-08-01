import type { LookupAddress, LookupOptions } from "node:dns";
import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";
import { Agent, type Dispatcher } from "undici";

export type DnsAnswer = Readonly<{
  address: string;
  family: number;
}>;

export type DnsResolver = (hostname: string) => Promise<readonly DnsAnswer[]>;

export type OutboundUrlPolicy = Readonly<{
  allowedOrigins?: readonly string[];
  resolver?: DnsResolver;
}>;

type DispatcherRequestInit = RequestInit & Readonly<{
  dispatcher: Dispatcher;
}>;

type ValidatedFetch = (
  input: string | URL | Request,
  init?: DispatcherRequestInit,
) => Promise<Response>;

export type PinnedDispatcherFactory = (
  lookup: typeof import("node:dns").lookup,
) => Dispatcher;

export type ValidatedFetchPolicy = OutboundUrlPolicy & Readonly<{
  fetchImpl?: ValidatedFetch;
  dispatcherFactory?: PinnedDispatcherFactory;
}>;

type ValidatedDestination = Readonly<{
  url: URL;
  hostname: string;
  answers: readonly DnsAnswer[];
}>;

type LookupCallback = (
  error: NodeJS.ErrnoException | null,
  address: string | LookupAddress[],
  family?: number,
) => void;

export class OutboundUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OutboundUrlError";
  }
}

const BLOCKED_IPV4_RANGES: ReadonlyArray<readonly [number, number]> = [
  [ipv4Number("0.0.0.0"), 8],
  [ipv4Number("10.0.0.0"), 8],
  [ipv4Number("100.64.0.0"), 10],
  [ipv4Number("127.0.0.0"), 8],
  [ipv4Number("169.254.0.0"), 16],
  [ipv4Number("172.16.0.0"), 12],
  [ipv4Number("192.0.0.0"), 24],
  [ipv4Number("192.0.2.0"), 24],
  [ipv4Number("192.88.99.0"), 24],
  [ipv4Number("192.168.0.0"), 16],
  [ipv4Number("198.18.0.0"), 15],
  [ipv4Number("198.51.100.0"), 24],
  [ipv4Number("203.0.113.0"), 24],
  [ipv4Number("224.0.0.0"), 4],
  [ipv4Number("240.0.0.0"), 4],
];

const BLOCKED_METADATA_IPV4 = new Set([
  "168.63.129.16",
  "169.254.169.254",
  "169.254.170.2",
  "100.100.100.200",
]);

const defaultResolver: DnsResolver = async (hostname) => {
  const answers = await dnsLookup(hostname, { all: true, verbatim: true });
  return answers.map((answer) => ({ address: answer.address, family: answer.family }));
};

export function parseHttpsUrl(input: string | URL): URL {
  let url: URL;
  try {
    url = input instanceof URL ? new URL(input.toString()) : new URL(input);
  } catch {
    throw new OutboundUrlError("The destination URL could not be parsed");
  }

  if (url.protocol !== "https:") {
    throw new OutboundUrlError("The destination must use HTTPS");
  }
  if (url.username || url.password) {
    throw new OutboundUrlError("The destination must not include user information");
  }
  if (url.port) {
    throw new OutboundUrlError("The destination must use the default HTTPS port");
  }

  const hostname = unbracketHostname(url.hostname).toLowerCase();
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new OutboundUrlError("Local destinations are not allowed");
  }
  if (hostname.endsWith(".") || hostname.includes("%")) {
    throw new OutboundUrlError("The destination hostname is not allowed");
  }

  return url;
}

export async function validateOutboundUrl(
  input: string | URL,
  policy: OutboundUrlPolicy = {},
): Promise<URL> {
  return (await resolveValidatedDestination(input, policy)).url;
}

async function resolveValidatedDestination(
  input: string | URL,
  policy: OutboundUrlPolicy,
): Promise<ValidatedDestination> {
  const url = parseHttpsUrl(input);
  const allowedOrigins = policy.allowedOrigins?.map((origin) => parseHttpsUrl(origin).origin);
  if (allowedOrigins && !allowedOrigins.includes(url.origin)) {
    throw new OutboundUrlError("The destination origin is not allowed");
  }

  const hostname = unbracketHostname(url.hostname);
  const literalFamily = isIP(hostname);
  if (literalFamily) {
    assertPublicIpAddress(hostname);
    return { url, hostname, answers: [{ address: hostname, family: literalFamily }] };
  }

  let answers: readonly DnsAnswer[];
  try {
    answers = await (policy.resolver ?? defaultResolver)(hostname);
  } catch {
    throw new OutboundUrlError("The destination hostname could not be resolved");
  }
  if (answers.length === 0) {
    throw new OutboundUrlError("The destination hostname has no address records");
  }
  const validatedAnswers: DnsAnswer[] = [];
  for (const answer of answers) {
    const actualFamily = isIP(answer.address);
    if (actualFamily === 0 || actualFamily !== answer.family) {
      throw new OutboundUrlError("The destination returned an unsupported address record");
    }
    assertPublicIpAddress(answer.address);
    if (!validatedAnswers.some((current) => current.address === answer.address)) {
      validatedAnswers.push({ address: answer.address, family: actualFamily });
    }
  }

  return { url, hostname, answers: validatedAnswers };
}

export async function fetchValidatedUrl(
  input: string | URL,
  init: RequestInit = {},
  policy: ValidatedFetchPolicy = {},
): Promise<Response> {
  const destination = await resolveValidatedDestination(input, policy);
  const pinnedLookup = createPinnedDnsLookup(destination.hostname, destination.answers);
  const dispatcher = (policy.dispatcherFactory ?? createPinnedDispatcher)(pinnedLookup);
  const fetchImpl = policy.fetchImpl ?? (fetch as ValidatedFetch);

  try {
    const response = await fetchImpl(destination.url, {
      ...init,
      redirect: "manual",
      dispatcher,
    });
    if (isRedirectStatus(response.status)) {
      await response.body?.cancel().catch(() => undefined);
      throw new OutboundUrlError("Redirects are not allowed for this destination");
    }
    return response;
  } finally {
    void dispatcher.close().catch(() => undefined);
  }
}

export function createPinnedDnsLookup(
  expectedHostname: string,
  answers: readonly DnsAnswer[],
): typeof import("node:dns").lookup {
  const normalizedHostname = unbracketHostname(expectedHostname).toLowerCase();
  const pinnedAnswers = answers.map((answer) => ({
    address: answer.address,
    family: answer.family,
  }));

  const pinnedLookup = (
    requestedHostname: string,
    optionsOrCallback: number | LookupOptions | LookupCallback,
    maybeCallback?: LookupCallback,
  ): void => {
    const callback = typeof optionsOrCallback === "function"
      ? optionsOrCallback
      : maybeCallback;
    if (!callback) throw new TypeError("DNS lookup callback is required");

    const options = typeof optionsOrCallback === "function" ? {} : optionsOrCallback;
    const all = typeof options === "object" && options.all === true;
    const family = requestedLookupFamily(options);
    const hostname = unbracketHostname(requestedHostname).toLowerCase();
    const candidates = hostname === normalizedHostname
      ? pinnedAnswers.filter((answer) => family === 0 || answer.family === family)
      : [];

    if (candidates.length === 0) {
      callback(dnsNotFoundError(requestedHostname), all ? [] : "", 0);
      return;
    }
    if (all) {
      callback(null, candidates.map((answer) => ({ ...answer })));
      return;
    }
    callback(null, candidates[0].address, candidates[0].family);
  };

  return pinnedLookup as typeof import("node:dns").lookup;
}

function createPinnedDispatcher(lookup: typeof import("node:dns").lookup): Dispatcher {
  return new Agent({
    connect: { lookup },
    autoSelectFamily: true,
    autoSelectFamilyAttemptTimeout: 250,
  });
}

function requestedLookupFamily(options: number | LookupOptions): number {
  const family = typeof options === "number" ? options : options.family;
  if (family === 4 || family === "IPv4") return 4;
  if (family === 6 || family === "IPv6") return 6;
  return 0;
}

function dnsNotFoundError(hostname: string): NodeJS.ErrnoException {
  const error = new Error(`No pinned DNS answer is available for ${hostname}`) as NodeJS.ErrnoException;
  error.code = "ENOTFOUND";
  error.syscall = "getaddrinfo";
  return error;
}

export function assertPublicIpAddress(address: string): void {
  const family = isIP(address);
  if (family === 4) {
    if (!isPublicIpv4(address)) {
      throw new OutboundUrlError("The destination resolved to a non-public IPv4 address");
    }
    return;
  }
  if (family === 6) {
    if (!isPublicIpv6(address)) {
      throw new OutboundUrlError("The destination resolved to a non-public IPv6 address");
    }
    return;
  }
  throw new OutboundUrlError("The destination address is not a valid IP address");
}

function isPublicIpv4(address: string): boolean {
  if (BLOCKED_METADATA_IPV4.has(address)) return false;
  const value = ipv4Number(address);
  return !BLOCKED_IPV4_RANGES.some(([base, prefix]) => inIpv4Cidr(value, base, prefix));
}

function isPublicIpv6(address: string): boolean {
  const bytes = ipv6Bytes(address);

  if (matchesPrefix(bytes, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0xff, 0xff], 96)) {
    return isPublicIpv4(`${bytes[12]}.${bytes[13]}.${bytes[14]}.${bytes[15]}`);
  }
  if (matchesPrefix(bytes, [0x00, 0x64, 0xff, 0x9b, 0, 0, 0, 0, 0, 0, 0, 0], 96)) {
    return isPublicIpv4(`${bytes[12]}.${bytes[13]}.${bytes[14]}.${bytes[15]}`);
  }
  if (matchesPrefix(bytes, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 96)) return false;

  const blockedPrefixes: ReadonlyArray<readonly [readonly number[], number]> = [
    [[0x00, 0x64, 0xff, 0x9b, 0x00, 0x01], 48],
    [[0x01, 0x00], 64],
    [[0x20, 0x01, 0x00, 0x00], 32],
    [[0x20, 0x01, 0x00, 0x02, 0x00, 0x00], 48],
    [[0x20, 0x01, 0x0d, 0xb8], 32],
    [[0x20, 0x02], 16],
    [[0xfc], 7],
    [[0xfe, 0x80], 10],
    [[0xfe, 0xc0], 10],
    [[0xff], 8],
  ];
  return !blockedPrefixes.some(([prefix, bits]) => matchesPrefix(bytes, prefix, bits));
}

function ipv4Number(address: string): number {
  const parts = address.split(".");
  if (parts.length !== 4) throw new OutboundUrlError("The IPv4 address is malformed");
  let value = 0;
  for (const part of parts) {
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) {
      throw new OutboundUrlError("The IPv4 address is malformed");
    }
    value = ((value << 8) | octet) >>> 0;
  }
  return value;
}

function inIpv4Cidr(value: number, base: number, prefix: number): boolean {
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (value & mask) === (base & mask);
}

function ipv6Bytes(address: string): number[] {
  const normalized = unbracketHostname(address).toLowerCase();
  if (normalized.includes("%")) throw new OutboundUrlError("Scoped IPv6 addresses are not allowed");

  const doubleColon = normalized.indexOf("::");
  if (doubleColon !== normalized.lastIndexOf("::")) {
    throw new OutboundUrlError("The IPv6 address is malformed");
  }
  const left = doubleColon >= 0 ? normalized.slice(0, doubleColon) : normalized;
  const right = doubleColon >= 0 ? normalized.slice(doubleColon + 2) : "";
  const leftParts = expandIpv6Parts(left ? left.split(":") : []);
  const rightParts = expandIpv6Parts(right ? right.split(":") : []);
  const missing = 8 - leftParts.length - rightParts.length;
  if ((doubleColon < 0 && missing !== 0) || (doubleColon >= 0 && missing < 1)) {
    throw new OutboundUrlError("The IPv6 address is malformed");
  }
  const parts = [...leftParts, ...Array.from({ length: Math.max(0, missing) }, () => 0), ...rightParts];
  if (parts.length !== 8) throw new OutboundUrlError("The IPv6 address is malformed");

  return parts.flatMap((part) => [(part >> 8) & 0xff, part & 0xff]);
}

function expandIpv6Parts(parts: string[]): number[] {
  const expanded: number[] = [];
  for (const part of parts) {
    if (part.includes(".")) {
      const value = ipv4Number(part);
      expanded.push((value >>> 16) & 0xffff, value & 0xffff);
      continue;
    }
    if (!/^[0-9a-f]{1,4}$/u.test(part)) {
      throw new OutboundUrlError("The IPv6 address is malformed");
    }
    expanded.push(Number.parseInt(part, 16));
  }
  return expanded;
}

function matchesPrefix(bytes: readonly number[], prefix: readonly number[], bits: number): boolean {
  const fullBytes = Math.floor(bits / 8);
  for (let index = 0; index < fullBytes; index += 1) {
    if (bytes[index] !== prefix[index]) return false;
  }
  const remainingBits = bits % 8;
  if (remainingBits === 0) return true;
  const mask = (0xff << (8 - remainingBits)) & 0xff;
  return ((bytes[fullBytes] ?? 0) & mask) === ((prefix[fullBytes] ?? 0) & mask);
}

function unbracketHostname(hostname: string): string {
  return hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname;
}

function isRedirectStatus(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}
