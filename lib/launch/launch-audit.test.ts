import { describe, expect, it } from "vitest";

import { buildRemoteGates } from "../../scripts/launch-audit";

const RELEASE_SHA = "a".repeat(40);

describe("launch audit Edge Function parity gate", () => {
  it("keeps remote parity disabled by default", () => {
    expect(buildRemoteGates({})).toEqual([]);
  });

  it("passes the protected receipt and beta release SHA as parity arguments", () => {
    const gates = buildRemoteGates({
      DIANA_VERIFY_EDGE_FUNCTION_PARITY: "true",
      STAGING_EDGE_DEPLOYMENT_RECEIPT_PATH: "C:\\temp\\edge-receipt.json",
      DIANA_BETA_RELEASE_SHA: RELEASE_SHA,
    });

    expect(gates).toEqual([
      {
        id: "edge-function-parity",
        label: "Edge Function parity",
        args: [
          "run",
          "edge-functions:parity",
          "--",
          "--receipt=C:\\temp\\edge-receipt.json",
          `--release-sha=${RELEASE_SHA}`,
        ],
      },
    ]);
  });

  it("uses the CI release SHA when the beta binding is absent", () => {
    const [gate] = buildRemoteGates({
      DIANA_VERIFY_EDGE_FUNCTION_PARITY: "true",
      STAGING_EDGE_DEPLOYMENT_RECEIPT_PATH: "/tmp/edge-receipt.json",
      GITHUB_SHA: RELEASE_SHA,
    });

    expect(gate.args.at(-1)).toBe(`--release-sha=${RELEASE_SHA}`);
  });

  it("fails closed before parity when either required binding is absent", () => {
    expect(() => buildRemoteGates({
      DIANA_VERIFY_EDGE_FUNCTION_PARITY: "true",
      DIANA_BETA_RELEASE_SHA: RELEASE_SHA,
    })).toThrow("STAGING_EDGE_DEPLOYMENT_RECEIPT_PATH");

    expect(() => buildRemoteGates({
      DIANA_VERIFY_EDGE_FUNCTION_PARITY: "true",
      STAGING_EDGE_DEPLOYMENT_RECEIPT_PATH: "/tmp/edge-receipt.json",
    })).toThrow("full release SHA");
  });
});
