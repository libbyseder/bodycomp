import { Chart, type LegendItem } from 'chart.js'

interface GoalLineDataset {
  label?: string
  borderDash?: number[]
  borderColor?: string
}

export function goalLegendLabels(chart: Chart): LegendItem[] {
  const defaults = Chart.defaults.plugins.legend.labels.generateLabels(chart)

  return defaults.map((label) => {
    const dataset = chart.data.datasets[label.datasetIndex ?? 0] as GoalLineDataset
    const isGoal = typeof dataset.label === 'string' && dataset.label.includes('Goal')

    if (!isGoal) return label

    return {
      ...label,
      pointStyle: 'circle',
      lineDash: dataset.borderDash ?? [6, 4],
      lineWidth: 2,
      strokeStyle: dataset.borderColor ?? label.strokeStyle,
      fillStyle: 'transparent',
    }
  })
}