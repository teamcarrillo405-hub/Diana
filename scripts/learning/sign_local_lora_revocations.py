"""Operator tool: sign a fresh, external dataset-revocation snapshot without network calls."""

from __future__ import annotations

import argparse
import base64
from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path
import re

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from local_lora_common import verify_private_path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--private-key", required=True, type=Path)
    parser.add_argument("--revoked-hashes", required=True, type=Path, help="Operator-maintained JSON array of revoked dataset SHA-256 hashes")
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    workspace = Path.cwd().resolve()
    for path in (args.private_key, args.revoked_hashes, args.output):
        if path.absolute().is_relative_to(workspace):
            parser.error("Signing material and revocation snapshot must stay outside the source checkout")
    if args.output.exists():
        parser.error("Revocation snapshot output already exists")
    verify_private_path(args.private_key, workspace, directory=False)
    verify_private_path(args.revoked_hashes, workspace, directory=False)
    verify_private_path(args.output.parent, workspace, directory=True)
    revoked = json.loads(args.revoked_hashes.read_text(encoding="utf-8"))
    if not isinstance(revoked, list) or any(not isinstance(item, str) or not re.fullmatch(r"[a-f0-9]{64}", item) for item in revoked):
        parser.error("Expected a JSON array of lowercase SHA-256 dataset hashes")
    key = serialization.load_pem_private_key(args.private_key.read_bytes(), password=None)
    if not isinstance(key, Ed25519PrivateKey):
        parser.error("Private key must be Ed25519")
    now = datetime.now(timezone.utc)
    payload = {"version": "diana-local-lora-revocations-v1", "issuedAt": now.isoformat(),
               "expiresAt": (now + timedelta(hours=24)).isoformat(), "revokedDatasetSha256": sorted(set(revoked))}
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()
    receipt = {"payload": payload, "signatureBase64": base64.b64encode(key.sign(canonical)).decode()}
    descriptor = os.open(args.output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
        stream.write(json.dumps(receipt, indent=2) + "\n")
    verify_private_path(args.output, workspace, directory=False)
    print(json.dumps({"status": "signed", "expiresAt": payload["expiresAt"], "revokedCount": len(revoked)}))


if __name__ == "__main__":
    main()
