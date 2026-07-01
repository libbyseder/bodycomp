export type AverageWindow = 7 | 30 | 90 | 'all'

export function computeSimpleMovingAverage(
  values: (number | null)[],
  window: AverageWindow
): (number | null)[] {
  return values.map((_, index) => {
    const start =
      window === 'all' ? 0 : Math.max(0, index - window + 1)
    const windowValues = values
      .slice(start, index + 1)
      .filter((value): value is number => value != null)

    if (windowValues.length === 0) return null

    const average =
      windowValues.reduce((sum, value) => sum + value, 0) / windowValues.length

    return parseFloat(average.toFixed(2))
  })
}

export function getAverageWindowLabel(window: AverageWindow): string {
  if (window === 'all') return 'All-Time Average'
  return `${window}-Day Average`
}