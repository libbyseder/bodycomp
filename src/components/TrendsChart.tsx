import { useState, useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import type { Measurement } from '../types'
import type { Profile } from '../types'
import { Settings } from 'lucide-react'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface TrendsChartProps {
  measurements: Measurement[]
  profile: Profile | null
}

type TimePeriod = 'week' | 'month' | 'quarter' | 'year' | 'all'

interface VisibilitySettings {
  weight: boolean
  bodyFat: boolean
  ffmi: boolean
  weightGoal: boolean
  bfGoal: boolean
  ffmiGoal: boolean
}

interface DailyAverage {
  date: string
  weight: number
  body_fat: number | null
  ffmi: number | null
  count: number
}

export default function TrendsChart({ measurements, profile }: TrendsChartProps) {
  const [period, setPeriod] = useState<TimePeriod>('month')
  const [offset, setOffset] = useState(0)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [visibility, setVisibility] = useState<VisibilitySettings>({
    weight: true,
    bodyFat: true,
    ffmi: true,
    weightGoal: true,
    bfGoal: true,
    ffmiGoal: true,
  })

  const sorted = useMemo(() => [...measurements].sort((a, b) => a.date.localeCompare(b.date)), [measurements])

  const { data, label } = useMemo(() => {
    if (sorted.length === 0) return { data: [] as DailyAverage[], label: '' }

    // Group and average by day
    const grouped: Record<string, { weight: number[]; body_fat: number[] }> = {}

    sorted.forEach(m => {
      const dateOnly = new Date(m.date).toISOString().split('T')[0]
      if (!grouped[dateOnly]) grouped[dateOnly] = { weight: [], body_fat: [] }
      grouped[dateOnly].weight.push(m.weight)
      if (m.body_fat !== null) grouped[dateOnly].body_fat.push(m.body_fat)
    })

    const averaged: DailyAverage[] = Object.entries(grouped).map(([date, values]) => {
      const avgWeight = values.weight.reduce((a, b) => a + b, 0) / values.weight.length
      const avgBf = values.body_fat.length > 0
        ? values.body_fat.reduce((a, b) => a + b, 0) / values.body_fat.length
        : null

      let avgFfmi = null
      const h = profile?.height_inches
      if (avgBf !== null && h) {
        const kg = avgWeight / 2.20462
        const leanKg = kg * (1 - avgBf / 100)
        avgFfmi = parseFloat((leanKg / Math.pow(h * 0.0254, 2)).toFixed(2))
      }

      return {
        date,
        weight: parseFloat(avgWeight.toFixed(1)),
        body_fat: avgBf ? parseFloat(avgBf.toFixed(1)) : null,
        ffmi: avgFfmi,
        count: values.weight.length,
      }
    })

    averaged.sort((a, b) => a.date.localeCompare(b.date))

    // Time period filtering
    if (period === 'all') {
      return { data: averaged, label: 'All Time' }
    }

    const now = new Date()
    let windowSize = 30
    let lbl = ''

    switch (period) {
      case 'week':
        windowSize = 7
        lbl = offset === 0 ? 'This Week' : offset === 1 ? 'Previous Week' : `${offset} Weeks Ago`
        break
      case 'month':
        windowSize = 30
        lbl = offset === 0 ? 'This Month' : offset === 1 ? 'Previous Month' : `${offset} Months Ago`
        break
      case 'quarter':
        windowSize = 90
        lbl = offset === 0 ? 'This Quarter' : offset === 1 ? 'Previous Quarter' : `${offset} Quarters Ago`
        break
      case 'year':
        windowSize = 365
        lbl = offset === 0 ? 'This Year' : offset === 1 ? 'Previous Year' : `${offset} Years Ago`
        break
    }

    const endDate = new Date(now)
    endDate.setDate(endDate.getDate() - (windowSize * offset))
    const startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - windowSize)

    const filtered = averaged.filter(d => {
      const dDate = new Date(d.date)
      return dDate >= startDate && dDate <= endDate
    })

    return { data: filtered, label: lbl }
  }, [sorted, period, offset, profile?.height_inches])

  const labels = data.map(d => d.date)
  const wData = data.map(d => d.weight)
  const bfData = data.map(d => d.body_fat)
  const ffmiData = data.map(d => d.ffmi)

  const chartData = {
    labels,
    datasets: [
      visibility.weight && {
        label: 'Weight (lbs)',
        data: wData,
        borderColor: '#10b981',
        borderWidth: 3,
        tension: 0.3,
        spanGaps: true,
        yAxisID: 'y',
      },
      visibility.bodyFat && {
        label: 'Body Fat %',
        data: bfData,
        borderColor: '#f59e0b',
        borderWidth: 3,
        tension: 0.3,
        spanGaps: true,
        yAxisID: 'y1',
      },
      visibility.ffmi && {
        label: 'FFMI',
        data: ffmiData,
        borderColor: '#3b82f6',
        borderWidth: 3,
        tension: 0.3,
        spanGaps: true,
        yAxisID: 'y2',
      },
      // Goal Lines
      visibility.weightGoal && profile?.target_weight != null && {
        label: 'Weight Goal',
        data: Array(labels.length).fill(profile.target_weight),
        borderColor: '#10b981',
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 0,
        yAxisID: 'y',
      },
      visibility.bfGoal && profile?.target_body_fat != null && {
        label: 'BF% Goal',
        data: Array(labels.length).fill(profile.target_body_fat),
        borderColor: '#f59e0b',
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 0,
        yAxisID: 'y1',
      },
      visibility.ffmiGoal && profile?.target_ffmi != null && {
        label: 'FFMI Goal',
        data: Array(labels.length).fill(profile.target_ffmi),
        borderColor: '#3b82f6',
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 0,
        yAxisID: 'y2',
      },
    ].filter(Boolean) as any[],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { padding: 20, usePointStyle: true },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        filter: (tooltipItem: any) => !tooltipItem.dataset.label?.includes('Goal'),
        callbacks: {
          label: (context: any) => {
            const point = data[context.dataIndex]
            const label = context.dataset.label

            if (label === 'Weight (lbs)') {
              return `Weight: ${point.weight} lbs (avg of ${point.count})`
            }
            if (label === 'Body Fat %') {
              return point.body_fat ? `Body Fat: ${point.body_fat}% (avg of ${point.count})` : 'Body Fat: —'
            }
            if (label === 'FFMI') {
              return point.ffmi ? `FFMI: ${point.ffmi} (avg of ${point.count})` : 'FFMI: —'
            }
            return `${label}: ${context.raw}`
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: '#27272a' },
        ticks: { display: false },
      },
      y: {
        position: 'left' as const,
        title: { text: 'Weight (lbs)', color: '#10b981' },
        ticks: { color: '#10b981' },
        grid: { color: '#27272a' },
      },
      y1: {
        position: 'right' as const,
        offset: true,
        title: { text: 'Body Fat %', color: '#f59e0b' },
        ticks: { color: '#f59e0b' },
        grid: { drawOnChartArea: false },
      },
      y2: {
        position: 'right' as const,
        offset: true,
        title: { text: 'FFMI', color: '#3b82f6' },
        ticks: { color: '#3b82f6', stepSize: 1 },
        grid: { drawOnChartArea: false },
        beginAtZero: false,
      },
    },
  }

  const toggle = (key: keyof VisibilitySettings) =>
    setVisibility(v => ({ ...v, [key]: !v[key] }))

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-8 mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Trends</h2>
          <p className="text-zinc-400 text-sm mt-1">{label}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setOffset(o => o + 1)} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm">
            ← Prev
          </button>

          {(['week', 'month', 'quarter', 'year', 'all'] as TimePeriod[]).map(p => (
            <button
              key={p}
              onClick={() => { setPeriod(p); setOffset(0) }}
              className={`px-4 py-1.5 rounded-2xl text-sm ${period === p ? 'bg-emerald-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700'}`}
            >
              {p[0].toUpperCase() + p.slice(1)}
            </button>
          ))}

          <button
            onClick={() => offset > 0 && setOffset(o => o - 1)}
            disabled={offset === 0}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 rounded-xl text-sm"
          >
            Next →
          </button>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="ml-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm flex items-center gap-x-1"
          >
            <Settings size={16} /> Advanced
          </button>
        </div>
      </div>

      {showAdvanced && (
        <div className="mb-6 p-4 bg-zinc-800 rounded-2xl border border-zinc-700">
          <div className="text-sm font-medium mb-3">Toggle Data Series</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
            {Object.keys(visibility).map(k => (
              <label key={k} className="flex items-center gap-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibility[k as keyof VisibilitySettings]}
                  onChange={() => toggle(k as keyof VisibilitySettings)}
                  className="accent-emerald-500"
                />
                {k.replace(/([A-Z])/g, ' $1')}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="h-[420px]">
        {data.length > 0 ? (
          <Line data={chartData} options={options} />
        ) : (
          <div className="h-full flex items-center justify-center text-zinc-400">
            No data in this period
          </div>
        )}
      </div>
    </div>
  )
}
