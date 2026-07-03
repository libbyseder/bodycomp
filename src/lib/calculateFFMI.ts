/** Reference height (m) used to normalize FFMI for cross-height comparison */
export const NORMALIZED_FFMI_REFERENCE_HEIGHT_M = 1.8

export function heightInchesToMeters(heightInches: number): number {
  return heightInches * 0.0254
}

export function calculateFFMI(weightLbs: number, bodyFatPercent: number | null, heightInches: number): number | null {
  if (!bodyFatPercent || !heightInches || heightInches <= 0) return null;

  const weightKg = weightLbs / 2.20462;
  const leanMassKg = weightKg * (1 - bodyFatPercent / 100);
  const heightMeters = heightInchesToMeters(heightInches);

  const ffmi = leanMassKg / (heightMeters * heightMeters);
  return parseFloat(ffmi.toFixed(2));
}

/** Adjusts FFMI to a 1.8 m reference frame for fairer height comparison */
export function calculateNormalizedFFMI(
  weightLbs: number,
  bodyFatPercent: number | null,
  heightInches: number
): number | null {
  const ffmi = calculateFFMI(weightLbs, bodyFatPercent, heightInches)
  if (ffmi == null) return null

  const heightMeters = heightInchesToMeters(heightInches)
  const normalized = ffmi + 6.1 * (NORMALIZED_FFMI_REFERENCE_HEIGHT_M - heightMeters)
  return parseFloat(normalized.toFixed(2))
}

export function calculateLeanMassLbs(weightLbs: number, bodyFatPercent: number | null): number | null {
  if (!bodyFatPercent) return null;
  return parseFloat((weightLbs * (1 - bodyFatPercent / 100)).toFixed(1));
}
