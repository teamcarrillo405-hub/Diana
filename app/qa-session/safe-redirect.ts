export function safeQaRedirect(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard";
}
