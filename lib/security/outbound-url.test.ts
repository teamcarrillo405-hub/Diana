import type { LookupAddress } from "node:dns";
import { describe, expect, it, vi } from "vitest";
import { Agent, type Dispatcher } from "undici";
import {
  fetchValidatedUrl,
  validateOutboundUrl,
  type DnsResolver,
} from "./outbound-url";

const publicDns: DnsResolver = async () => [
  { address: "93.184.216.34", family: 4 },
  { address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 },
];

describe("validateOutboundUrl", () => {
  it("accepts HTTPS on the default port with public A and AAAA answers", async () => {
    await expect(validateOutboundUrl("https://example.com:443/calendar.ics", {
      resolver: publicDns,
    })).resolves.toMatchObject({ origin: "https://example.com" });
  });

  it.each([
    "http://example.com/resource",
    "https://example.com:444/resource",
    "https://student:secret@example.com/resource",
    "https://localhost/resource",
    "https://service.localhost/resource",
  ])("rejects unsafe URL syntax: %s", async (url) => {
    await expect(validateOutboundUrl(url, { resolver: publicDns })).rejects.toThrow();
  });

  it.each([
    "https://127.0.0.1/",
    "https://2130706433/",
    "https://0x7f000001/",
    "https://10.0.0.1/",
    "https://100.64.0.1/",
    "https://169.254.169.254/latest/meta-data/",
    "https://172.16.0.1/",
    "https://192.168.1.1/",
    "https://224.0.0.1/",
  ])("rejects private, metadata, encoded, CGNAT, or multicast IPv4: %s", async (url) => {
    await expect(validateOutboundUrl(url)).rejects.toThrow("non-public IPv4");
  });

  it.each([
    "https://[::1]/",
    "https://[fc00::1]/",
    "https://[fe80::1]/",
    "https://[ff02::1]/",
    "https://[::ffff:127.0.0.1]/",
    "https://[64:ff9b::7f00:1]/",
    "https://[2001:db8::1]/",
  ])("rejects non-public IPv6: %s", async (url) => {
    await expect(validateOutboundUrl(url)).rejects.toThrow();
  });

  it("rejects a hostname when any A or AAAA answer is non-public", async () => {
    const resolver = vi.fn<DnsResolver>(async () => [
      { address: "93.184.216.34", family: 4 },
      { address: "fd00::50", family: 6 },
    ]);
    await expect(validateOutboundUrl("https://calendar.example/feed", { resolver })).rejects.toThrow(
      "non-public IPv6",
    );
    expect(resolver).toHaveBeenCalledWith("calendar.example");
  });

  it("rejects DNS records whose declared family does not match the address", async () => {
    const resolver: DnsResolver = async () => [
      { address: "93.184.216.34", family: 6 },
    ];
    await expect(validateOutboundUrl("https://calendar.example/feed", { resolver })).rejects.toThrow(
      "unsupported address record",
    );
  });

  it("enforces exact origins instead of suffix or prefix matches", async () => {
    await expect(validateOutboundUrl("https://canvas.school.example.attacker.test/api", {
      allowedOrigins: ["https://canvas.school.example"],
      resolver: publicDns,
    })).rejects.toThrow("origin is not allowed");
  });
});

describe("fetchValidatedUrl", () => {
  it("validates immediately before one manual-redirect fetch", async () => {
    const resolver = vi.fn<DnsResolver>(publicDns);
    const fetchImpl = vi.fn(async (
      _input: string | URL | Request,
      _init?: RequestInit & { dispatcher: Dispatcher },
    ) => new Response("ok", { status: 200 }));
    const controller = new AbortController();
    await fetchValidatedUrl(
      "https://example.com/feed",
      { signal: controller.signal },
      { resolver, fetchImpl },
    );
    expect(resolver).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      new URL("https://example.com/feed"),
      expect.objectContaining({
        dispatcher: expect.any(Agent),
        redirect: "manual",
        signal: controller.signal,
      }),
    );
  });

  it("pins the validated public answers when DNS changes before connection lookup", async () => {
    const validatedAnswers = [
      { address: "93.184.216.34", family: 4 },
      { address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 },
    ] as const;
    const privateAnswers = [{ address: "127.0.0.1", family: 4 }] as const;
    let systemAnswers: readonly { address: string; family: number }[] = validatedAnswers;
    const resolver = vi.fn<DnsResolver>(async () => systemAnswers);
    const fetchImpl = vi.fn(async (
      _input: string | URL | Request,
      _init?: RequestInit & { dispatcher: Dispatcher },
    ) => new Response("ok", { status: 200 }));
    let connectionAnswers: Array<{ address: string; family: number }> = [];
    const timeoutSignal = AbortSignal.timeout(15_000);

    const dispatcherFactory = vi.fn((pinnedLookup: typeof import("node:dns").lookup) => {
      systemAnswers = privateAnswers;
      pinnedLookup("canvas.school.example", { all: true }, (
        error: NodeJS.ErrnoException | null,
        addresses: LookupAddress[],
      ) => {
        expect(error).toBeNull();
        connectionAnswers = addresses;
      });
      return new Agent({ connect: { lookup: pinnedLookup } });
    });

    await fetchValidatedUrl(
      "https://canvas.school.example/api/v1/courses",
      { signal: timeoutSignal },
      { resolver, fetchImpl, dispatcherFactory },
    );

    expect(resolver).toHaveBeenCalledTimes(1);
    expect(connectionAnswers).toEqual(validatedAnswers);
    await expect(resolver("canvas.school.example")).resolves.toEqual(privateAnswers);
    expect(fetchImpl.mock.calls[0][0]).toEqual(
      new URL("https://canvas.school.example/api/v1/courses"),
    );
    expect(fetchImpl.mock.calls[0][1]).toEqual(expect.objectContaining({
      redirect: "manual",
      dispatcher: expect.any(Agent),
      signal: timeoutSignal,
    }));
  });

  it("rejects redirects without fetching the Location destination", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, {
      status: 302,
      headers: { Location: "https://127.0.0.1/admin" },
    }));
    await expect(fetchValidatedUrl("https://93.184.216.34/feed", {}, { fetchImpl })).rejects.toThrow(
      "Redirects are not allowed",
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
