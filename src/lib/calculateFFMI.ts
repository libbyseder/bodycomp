export function calculateFFMI(weightLbs: number, bodyFatPercent: number | null, heightInches: number): number | null {
  if (!bodyFatPercent || !heightInches || heightInches <= 0) return null;

  const weightKg = weightLbs / 2.20462;
  const leanMassKg = weightKg * (1 - bodyFatPercent / 100);
  const heightMeters = heightInches * 0.0254;

  const ffmi = leanMassKg / (heightMeters * heightMeters);
  return parseFloat(ffmi.toFixed(2));
}

export function calculateLeanMassLbs(weightLbs: number, bodyFatPercent: number | null): number | null {
  if (!bodyFatPercent) return null;
  return parseFloat((weightLbs * (1 - bodyFatPercent / 100)).toFixed(1));
}
