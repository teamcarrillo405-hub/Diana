/** Only validated opaque hex colors are ever passed into CSS. */
export function schoolColor(value: string | null | undefined): string | null {
  return value && /^#[\da-f]{6}$/iu.test(value) ? value.toUpperCase() : null;
}

/** Pick readable text for any solid school color, including very light colors. */
export function schoolColorText(color: string): "#000000" | "#FFFFFF" {
  const normalized = schoolColor(color);
  if (!normalized) return "#FFFFFF";
  const components = [1, 3, 5].map(index => parseInt(normalized.slice(index, index + 2), 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  const luminance = components[0] * 0.2126 + components[1] * 0.7152 + components[2] * 0.0722;
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? "#000000" : "#FFFFFF";
}

/** Profile logos are stored as canonical WebP data, not arbitrary remote URLs. */
export function schoolLogo(value: string | null | undefined): string | null {
  return value && /^data:image\/webp;base64,[\da-z+/]+=*$/iu.test(value) ? value : null;
}
