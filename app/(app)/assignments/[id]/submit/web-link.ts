export function submissionWebLink(value: string | null): string | null {
  const candidate = value?.trim();
  if (!candidate || !/^https?:\/\//iu.test(candidate)) return null;
  try {
    const url = new URL(candidate);
    return url.username || url.password ? null : url.href;
  } catch {
    return null;
  }
}
