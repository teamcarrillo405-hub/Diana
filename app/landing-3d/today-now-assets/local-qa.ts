type QaEnvironment = Record<string, string | undefined>;

export function isLocalNowQa(environment: QaEnvironment) {
  return environment.DIANA_NOW_LOCAL_QA === "1"
    && (environment.NEXT_DIST_DIR === ".next-now-qa" || environment.NEXT_DIST_DIR === ".next-now-finish" || environment.NEXT_DIST_DIR === ".next-now-relit" || environment.NEXT_DIST_DIR === ".next-now-diana" || environment.NEXT_DIST_DIR === ".next-now-graphics" || environment.NEXT_DIST_DIR === ".next-now-timing")
    && !environment.VERCEL;
}

export function isLoopbackHost(host: string | null) {
  return host !== null && /^(?:localhost|127\.0\.0\.1|\[::1\]):\d{1,5}$/.test(host);
}
