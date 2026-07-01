export type TrendPeriod = 7 | 30 | 90 | 365 | 'all'

export const TREND_PERIODS: TrendPeriod[] = [7, 30, 90, 365, 'all']

export function getTrendPeriodLabel(period: TrendPeriod): string {
  if (period === 'all') return 'All Time'
  return `Last ${period} Days`
}

export function filterPointsByPeriod<T extends { date: string }>(
  points: T[],
  period: TrendPeriod
): T[] {
  if (period === 'all' || points.length === 0) return points

  const latestDate = new Date(`${points[points.length - 1].date}T12:00:00`)
  const startDate = new Date(latestDate)
  startDate.setDate(startDate.getDate() - period)

  return points.filter((point) => new Date(`${point.date}T12:00:00`) >= startDate)
}

export function getSmoothingWindow(pointCount: number): number {
  return Math.min(7, Math.max(1, pointCount))
}

export function computeSimpleMovingAverage(
  values: (number | null)[],
  window: number
): (number | null)[] {
  const safeWindow = Math.max(1, window)

  return values.map((_, index) => {
    const start = Math.max(0, index - safeWindow + 1)
    const windowValues = values
      .slice(start, index + 1)
      .filter((value): value is number => value != null)

    if (windowValues.length === 0) return null

    const average =
      windowValues.reduce((sum, value) => sum + value, 0) / windowValues.length

    return parseFloat(average.toFixed(2))
  })
}