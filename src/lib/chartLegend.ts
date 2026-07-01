import { Chart, type LegendItem } from 'chart.js'

export function goalLegendLabels(chart: Chart): LegendItem[] {
  const defaults = Chart.defaults.plugins.legend.labels.generateLabels(chart)

  return defaults.map((label) => {
    const dataset = chart.data.datasets[label.datasetIndex ?? 0]
    const isGoal = typeof dataset.label === 'string' && dataset.label.includes('Goal')

    if (!isGoal) return label

    return {
      ...label,
      pointStyle: 'circle',
      lineDash: (dataset.borderDash as number[] | undefined) ?? [6, 4],
      lineWidth: 2,
      strokeStyle: (dataset.borderColor as string) ?? label.strokeStyle,
      fillStyle: 'transparent',
    }
  })
}