// ... (keep the rest of the file the same as your latest diagnostic version)

for (const group of groups) {
  const date = new Date(group.date * 1000).toISOString().split('T')[0];
  let weightKg = null;
  let bodyFat = null;

  for (const m of group.measures) {
    // CORRECTED: multiply, not divide
    const realValue = m.value * Math.pow(10, m.unit);

    if (m.type === 1) weightKg = realValue;           // now in kg
    if (m.type === 6) bodyFat = realValue;            // percentage
  }

  if (weightKg) {
    const weightLbs = weightKg * 2.20462;             // kg → lbs

    const { error } = await supabase.from('measurements').insert({
      user_id: user.id,
      date,
      weight: weightLbs,
      body_fat: bodyFat,
    });

    if (error) {
      console.error('Insert error on date', date, error);
      // You can collect errors here if you want richer logging
    } else {
      imported++;
    }
  }
}
