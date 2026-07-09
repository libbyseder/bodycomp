import { useState, useMemo, useEffect } from 'react'
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
import { goalLegendLabels } from '../lib/chartLegend'
import { calculateFFMI, calculateNormalizedFFMI } from '../lib/calculateFFMI'
import { measurementsForDisplay } from '../lib/goalWindow'
import GoalWindowNotice from './GoalWindowNotice'

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
  className?: string
}

type TimePeriod = 'week' | 'month' | 'quarter' | 'year' | 'all'

interface VisibilitySettings {
  weight: boolean
  bodyFat: boolean
  ffmi: boolean
  normalizedFfmi: boolean
  weightGoal: boolean
  bfGoal: boolean
  ffmiGoal: boolean
  normalizedFfmiGoal: boolean
}

interface DailyAverage {
  date: string
  weight: number
  body_fat: number | null
  ffmi: number | null
  normalized_ffmi: number | null
  count: number
}

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < breakpoint
  )

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    setIsMobile(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [breakpoint])

  return isMobile
}

export default function TrendsChart({
  measurements,
  profile,
  className = 'mb-6 sm:mb-8',
}: TrendsChartProps) {
  const [period, setPeriod] = useState<TimePeriod>('month')
  const [offset, setOffset] = useState(0)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const isMobile = useIsMobile()

  const [visibility, setVisibility] = useState<VisibilitySettings>({
    weight: true,
    bodyFat: true,
    ffmi: true,
    normalizedFfmi: false,
    weightGoal: true,
    bfGoal: true,
    ffmiGoal: true,
    normalizedFfmiGoal: true,
  })

  const displayMeasurements = useMemo(
    () => measurementsForDisplay(measurements, profile),
    [measurements, profile]
  )

  const sorted = useMemo(
    () => [...displayMeasurements].sort((a, b) => a.date.localeCompare(b.date)),
    [displayMeasurements]
  )

  const { data, label } = useMemo(() => {
    if (sorted.length === 0) return { data: [] as DailyAverage[], label: '' }

    // One row per date — values are already daily averages
    const averaged: DailyAverage[] = sorted.map((m) => {
      const h = m.height_inches ?? profile?.height_inches ?? null
      const ffmi = h ? calculateFFMI(m.weight, m.body_fat, h) : null
      const normalized_ffmi = h ? calculateNormalizedFFMI(m.weight, m.body_fat, h) : null

      return {
        date: m.date,
        weight: m.weight,
        body_fat: m.body_fat,
        ffmi,
        normalized_ffmi,
        count: m.log_count ?? 1,
      }
    })

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
  const normalizedFfmiData = data.map(d => d.normalized_ffmi)

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
      visibility.normalizedFfmi && {
        label: 'Norm. FFMI',
        data: normalizedFfmiData,
        borderColor: '#818cf8',
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
        borderDash: [6, 4],
        borderWidth: 2,
        pointRadius: 0,
        pointStyle: 'circle',
        yAxisID: 'y',
      },
      visibility.bfGoal && profile?.target_body_fat != null && {
        label: 'BF% Goal',
        data: Array(labels.length).fill(profile.target_body_fat),
        borderColor: '#f59e0b',
        borderDash: [6, 4],
        borderWidth: 2,
        pointRadius: 0,
        pointStyle: 'circle',
        yAxisID: 'y1',
      },
      visibility.ffmiGoal && profile?.target_ffmi != null && {
        label: 'FFMI Goal',
        data: Array(labels.length).fill(profile.target_ffmi),
        borderColor: '#3b82f6',
        borderDash: [6, 4],
        borderWidth: 2,
        pointRadius: 0,
        pointStyle: 'circle',
        yAxisID: 'y2',
      },
      visibility.normalizedFfmiGoal && profile?.target_normalized_ffmi != null && {
        label: 'Norm. FFMI Goal',
        data: Array(labels.length).fill(profile.target_normalized_ffmi),
        borderColor: '#a78bfa',
        borderDash: [6, 4],
        borderWidth: 2,
        pointRadius: 0,
        pointStyle: 'circle',
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
        labels: {
          padding: isMobile ? 12 : 20,
          usePointStyle: true,
          boxWidth: isMobile ? 8 : 12,
          font: { size: isMobile ? 10 : 12 },
          generateLabels: goalLegendLabels,
        },
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
            if (label === 'Norm. FFMI') {
              return point.normalized_ffmi
                ? `Norm. FFMI: ${point.normalized_ffmi} (avg of ${point.count})`
                : 'Norm. FFMI: —'
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
        title: {
          display: !isMobile,
          text: 'Weight (lbs)',
          color: '#10b981',
          font: { size: isMobile ? 10 : 12 },
        },
        ticks: { color: '#10b981', font: { size: isMobile ? 10 : 12 }, maxTicksLimit: isMobile ? 5 : 8 },
        grid: { color: '#27272a' },
      },
      y1: {
        position: 'right' as const,
        offset: !isMobile,
        display: !isMobile || visibility.bodyFat || visibility.bfGoal,
        title: {
          display: !isMobile,
          text: 'Body Fat %',
          color: '#f59e0b',
          font: { size: isMobile ? 10 : 12 },
        },
        ticks: { color: '#f59e0b', font: { size: isMobile ? 10 : 12 }, maxTicksLimit: isMobile ? 4 : 8 },
        grid: { drawOnChartArea: false },
      },
      y2: {
        position: 'right' as const,
        offset: !isMobile,
        display:
          !isMobile ||
          visibility.ffmi ||
          visibility.normalizedFfmi ||
          visibility.ffmiGoal ||
          visibility.normalizedFfmiGoal,
        title: {
          display: !isMobile,
          text: 'FFMI',
          color: '#3b82f6',
          font: { size: isMobile ? 10 : 12 },
        },
        ticks: { color: '#3b82f6', stepSize: 1, font: { size: isMobile ? 10 : 12 }, maxTicksLimit: isMobile ? 4 : 8 },
        grid: { drawOnChartArea: false },
        beginAtZero: false,
      },
    },
  }

  const toggle = (key: keyof VisibilitySettings) =>
    setVisibility(v => ({ ...v, [key]: !v[key] }))

  return (
    <div className={`bg-zinc-900 border border-zinc-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold">Trends</h2>
          <p className="text-zinc-400 text-sm mt-1">{label}</p>
          <GoalWindowNotice profile={profile} className="mt-1.5" />
        </div>

        <div className="flex flex-col gap-2 sm:gap-0 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 -mx-1 px-1 sm:mx-0 sm:px-0">
            <button onClick={() => setOffset(o => o + 1)} className="shrink-0 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm">
              ← Prev
            </button>

            {(['week', 'month', 'quarter', 'year', 'all'] as TimePeriod[]).map(p => (
              <button
                key={p}
                onClick={() => { setPeriod(p); setOffset(0) }}
                className={`shrink-0 px-3 sm:px-4 py-1.5 rounded-2xl text-sm whitespace-nowrap ${period === p ? 'bg-cyan-500 text-white' : 'bg-zinc-800 hover:bg-zinc-700'}`}
              >
                {p[0].toUpperCase() + p.slice(1)}
              </button>
            ))}

            <button
              onClick={() => offset > 0 && setOffset(o => o - 1)}
              disabled={offset === 0}
              className="shrink-0 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 rounded-xl text-sm"
            >
              Next →
            </button>
          </div>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="sm:ml-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm flex items-center justify-center gap-x-1 w-full sm:w-auto"
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

      <div className="h-[260px] sm:h-[340px] lg:h-[420px]">
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
