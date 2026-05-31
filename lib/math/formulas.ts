// F6 (AP Math depth) — Static formula reference panel.
// Plain text Unicode. NO KaTeX. NO derivations. NO AI calls (D-01).
// If you add a formula, run `npm run tone-audit` afterwards.

export type Formula = {
  name: string;
  formula: string;
  notes?: string;
};

export const CALC_FORMULAS: Formula[] = [
  { name: "Power rule",            formula: "d/dx[xⁿ] = n·xⁿ⁻¹",                        notes: "n any real number" },
  { name: "Product rule",          formula: "d/dx[f·g] = f'·g + f·g'" },
  { name: "Quotient rule",         formula: "d/dx[f/g] = (f'·g − f·g') / g²" },
  { name: "Chain rule",            formula: "d/dx[f(g(x))] = f'(g(x))·g'(x)" },
  { name: "Derivative of sin",     formula: "d/dx[sin x] = cos x" },
  { name: "Derivative of cos",     formula: "d/dx[cos x] = −sin x" },
  { name: "Derivative of eˣ",      formula: "d/dx[eˣ] = eˣ" },
  { name: "Derivative of ln x",    formula: "d/dx[ln x] = 1/x",                          notes: "x > 0" },
  { name: "Power rule (integral)", formula: "∫ xⁿ dx = xⁿ⁺¹/(n+1) + C",                 notes: "n ≠ −1" },
  { name: "Integral of 1/x",       formula: "∫ 1/x dx = ln|x| + C" },
  { name: "Integral of eˣ",        formula: "∫ eˣ dx = eˣ + C" },
  { name: "Fundamental theorem",   formula: "∫ₐᵇ f'(x) dx = f(b) − f(a)" },
  { name: "Mean value theorem",    formula: "f'(c) = (f(b) − f(a)) / (b − a)",           notes: "for some c in (a, b)" },
];

export const PHYSICS_FORMULAS: Formula[] = [
  { name: "Newton's second law",   formula: "F = m·a",                                   notes: "force in newtons" },
  { name: "Kinetic energy",        formula: "KE = ½·m·v²" },
  { name: "Gravitational PE",      formula: "PE = m·g·h",                                notes: "g ≈ 9.8 m/s²" },
  { name: "Work",                  formula: "W = F·d·cos θ" },
  { name: "Power",                 formula: "P = W / t" },
  { name: "Momentum",              formula: "p = m·v" },
  { name: "Impulse",               formula: "J = F·Δt = Δp" },
  { name: "Constant acceleration", formula: "v = v₀ + a·t" },
  { name: "Position (constant a)", formula: "x = x₀ + v₀·t + ½·a·t²" },
  { name: "Velocity squared",      formula: "v² = v₀² + 2·a·(x − x₀)" },
  { name: "Ohm's law",             formula: "V = I·R" },
  { name: "Electric power",        formula: "P = I·V = I²·R" },
  { name: "Coulomb's law",         formula: "F = k·q₁·q₂ / r²",                         notes: "k ≈ 8.99×10⁹ N·m²/C²" },
];

export const ALGEBRA_FORMULAS: Formula[] = [
  { name: "Quadratic formula",     formula: "x = (−b ± √(b² − 4ac)) / (2a)",            notes: "for ax² + bx + c = 0" },
  { name: "Discriminant",          formula: "Δ = b² − 4ac",                              notes: "Δ > 0: two real roots" },
  { name: "Difference of squares", formula: "a² − b² = (a + b)(a − b)" },
  { name: "Perfect square (sum)",  formula: "(a + b)² = a² + 2ab + b²" },
  { name: "Perfect square (diff)", formula: "(a − b)² = a² − 2ab + b²" },
  { name: "Sum of cubes",          formula: "a³ + b³ = (a + b)(a² − ab + b²)" },
  { name: "Slope of a line",       formula: "m = (y₂ − y₁) / (x₂ − x₁)" },
  { name: "Point-slope form",      formula: "y − y₁ = m·(x − x₁)" },
  { name: "Distance formula",      formula: "d = √((x₂ − x₁)² + (y₂ − y₁)²)" },
  { name: "Midpoint formula",      formula: "((x₁ + x₂)/2, (y₁ + y₂)/2)" },
  { name: "Logarithm power rule",  formula: "log_b(xⁿ) = n·log_b(x)" },
  { name: "Change of base",        formula: "log_b(x) = ln(x) / ln(b)" },
];
