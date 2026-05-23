// Cinematic camera conversion utilities
// Extracted from ControlsCinematic.tsx legacy (removed in v2.0.0, formulas preserved).
// FL raw reference: 800 = 50mm

export const flToMm = (fl: number): number => Math.round((fl / 800) * 50);
export const mmToFl = (mm: number): number => (mm / 50) * 800;
