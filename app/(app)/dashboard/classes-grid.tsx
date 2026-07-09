export function classTheme(cls: { id: string; name: string; color?: string | null }) {
  const n = cls.name || "";
  if (/math|algebra|geometry|calculus|pre.?calc|stats|trig/i.test(n))
    return { symbol: "M", bannerBg: "linear-gradient(135deg,#0a1a3c,#1428a0)", accent: "#29d0ff" };
  if (/english|writing|lit|language|essay|grammar|composition/i.test(n))
    return { symbol: "E", bannerBg: "linear-gradient(135deg,#1a0d3c,#2a0d7a)", accent: "#a855f7" };
  if (/science|bio|chem|physics|earth|environ/i.test(n))
    return { symbol: "S", bannerBg: "linear-gradient(135deg,#0a2a10,#0d5c1a)", accent: "#36e07a" };
  if (/hist|social|world|gov|econ|geo|civics/i.test(n))
    return { symbol: "H", bannerBg: "linear-gradient(135deg,#2a1000,#6b2600)", accent: "#f59e0b" };
  if (/art|music|drama|theater|dance|creative|photo/i.test(n))
    return { symbol: "A", bannerBg: "linear-gradient(135deg,#2a002a,#6b006b)", accent: "#f472b6" };
  if (/pe|physical|health|sport|fitness|gym/i.test(n))
    return { symbol: "P", bannerBg: "linear-gradient(135deg,#1a2a00,#3a5c00)", accent: "#84cc16" };
  if (/spanish|french|german|latin|chinese|japanese|korean|lang/i.test(n))
    return { symbol: "L", bannerBg: "linear-gradient(135deg,#1a1000,#3a2600)", accent: "#ffd24a" };
  const FALLBACK = [
    { bannerBg: "linear-gradient(135deg,#0a1a3c,#1428a0)", accent: "#29d0ff" },
    { bannerBg: "linear-gradient(135deg,#1a0d3c,#2a0d7a)", accent: "#a855f7" },
    { bannerBg: "linear-gradient(135deg,#0a2a10,#0d5c1a)", accent: "#36e07a" },
    { bannerBg: "linear-gradient(135deg,#2a1000,#6b2600)", accent: "#f59e0b" },
    { bannerBg: "linear-gradient(135deg,#2a002a,#6b006b)", accent: "#f472b6" },
  ];
  return { symbol: (n[0] ?? "C").toUpperCase(), ...FALLBACK[cls.id.charCodeAt(0) % FALLBACK.length] };
}
