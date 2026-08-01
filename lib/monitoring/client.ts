export function reportClientError(
  error: Error & { digest?: string },
  route: string,
): void {
  const payload = JSON.stringify({
    route,
    message: error.name || "ClientError",
    digest: error.digest ?? null,
    severity: "error",
  });

  void fetch("/api/monitoring/error", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    credentials: "same-origin",
    keepalive: true,
  }).catch(() => undefined);
}
