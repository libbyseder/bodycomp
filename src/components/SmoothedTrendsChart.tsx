import { useMemo, useState, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import type { Measurement, Profile } from '../types'
import { calculateFFMI } from '../lib/calculateFFMI'
import {
  computeSimpleMovingAverage,
  getAverageWindowLabel,
  type AverageWindow,
} from '../lib/movingAverage'

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

interface SmoothedTrendsChartProps {
  measurements: Measurement[]
  profile: Profile | null
}

interface DailyPoint {
  date: string
  weight: number
  body_fat: number | null
  ffmi: number | null
}

interface VisibilitySettings {
  rawWeight: boolean
  weightTrend: boolean
  rawBodyFat: boolean
  bodyFatTrend: boolean
  rawFfmi: boolean
  ffmiTrend: boolean
  weightGoal: boolean
  bodyFatGoal: boolean
  ffmiGoal: boolean
}

const AVERAGE_WINDOWS: AverageWindow[] = [7, 30, 90, 'all']

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < breakpoint
  )

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const handler = (event: MediaQueryListEvent) => setIsMobile(event.matches)
    setIsMobile(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [breakpoint])

  return isMobile
}

function buildDailyPoints(
  measurements: Measurement[],
  heightInches: number | null | undefined
): DailyPoint[] {
  return [...measurements]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((measurement) => {
      const ffmi =
        heightInches != null
          ? calculateFFMI(measurement.weight, measurement.body_fat, heightInches)
          : null

      return {
        date: measurement.date,
        weight: measurement.weight,
        body_fat: measurement.body_fat,
        ffmi,
      }
    })
}

export default function SmoothedTrendsChart({
  measurements,
  profile,
}: SmoothedTrendsChartProps) {
  const [averageWindow, setAverageWindow] = useState<AverageWindow>(7)
  const [showSettings, setShowSettings] = useState(false)
  const isMobile = useIsMobile()

  const [visibility, setVisibility] = useState<VisibilitySettings>({
    rawWeight: true,
    weightTrend: true,
    rawBodyFat: false,
    bodyFatTrend: true,
    rawFfmi: false,
    ffmiTrend: true,
    weightGoal: true,
    bodyFatGoal: true,
    ffmiGoal: true,
  })

  const dailyPoints = useMemo(
    () => buildDailyPoints(measurements, profile?.height_inches),
    [measurements, profile?.height_inches]
  )

  const {
    weightTrend,
    bodyFatTrend,
    ffmiTrend,
    latestWeightTrend,
    weightDelta,
  } = useMemo(() => {
    const weights = dailyPoints.map((point) => point.weight)
    const bodyFats = dailyPoints.map((point) => point.body_fat)
    const ffmis = dailyPoints.map((point) => point.ffmi)

    const nextWeightTrend = computeSimpleMovingAverage(weights, averageWindow)
    const nextBodyFatTrend = computeSimpleMovingAverage(bodyFats, averageWindow)
    const nextFfmiTrend = computeSimpleMovingAverage(ffmis, averageWindow)

    const latestTrend = [...nextWeightTrend]
      .reverse()
      .find((value) => value != null) ?? null

    const firstTrend = nextWeightTrend.find((value) => value != null) ?? null
    const delta =
      latestTrend != null && firstTrend != null
        ? parseFloat((latestTrend - firstTrend).toFixed(1))
        : null

    return {
      weightTrend: nextWeightTrend,
      bodyFatTrend: nextBodyFatTrend,
      ffmiTrend: nextFfmiTrend,
      latestWeightTrend: latestTrend,
      weightDelta: delta,
    }
  }, [dailyPoints, averageWindow])

  const labels = dailyPoints.map((point) => point.date)
  const weightGoal = profile?.target_weight ?? null
  const bodyFatGoal = profile?.target_body_fat ?? null
  const ffmiGoal = profile?.target_ffmi ?? null

  const chartData = {
    labels,
    datasets: [
      visibility.rawWeight && {
        label: 'Daily Weight',
        data: dailyPoints.map((point) => point.weight),
        borderColor: 'rgba(16, 185, 129, 0.35)',
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        borderWidth: 1.5,
        pointRadius: isMobile ? 2 : 3,
        pointHoverRadius: 5,
        tension: 0.1,
        yAxisID: 'y',
      },
      visibility.weightTrend && {
        label: `${getAverageWindowLabel(averageWindow)} (Weight)`,
        data: weightTrend,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        borderWidth: 3,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.35,
        fill: false,
        spanGaps: true,
        yAxisID: 'y',
      },
      visibility.rawBodyFat && {
        label: 'Daily Body Fat %',
        data: dailyPoints.map((point) => point.body_fat),
        borderColor: 'rgba(245, 158, 11, 0.35)',
        backgroundColor: 'rgba(245, 158, 11, 0.12)',
        borderWidth: 1.5,
        pointRadius: isMobile ? 2 : 3,
        pointHoverRadius: 5,
        tension: 0.1,
        spanGaps: true,
        yAxisID: 'y1',
      },
      visibility.bodyFatTrend && {
        label: `${getAverageWindowLabel(averageWindow)} (Body Fat)`,
        data: bodyFatTrend,
        borderColor: '#f59e0b',
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.35,
        spanGaps: true,
        yAxisID: 'y1',
      },
      visibility.rawFfmi && {
        label: 'Daily FFMI',
        data: dailyPoints.map((point) => point.ffmi),
        borderColor: 'rgba(59, 130, 246, 0.35)',
        backgroundColor: 'rgba(59, 130, 246, 0.12)',
        borderWidth: 1.5,
        pointRadius: isMobile ? 2 : 3,
        pointHoverRadius: 5,
        tension: 0.1,
        spanGaps: true,
        yAxisID: 'y2',
      },
      visibility.ffmiTrend && {
        label: `${getAverageWindowLabel(averageWindow)} (FFMI)`,
        data: ffmiTrend,
        borderColor: '#3b82f6',
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.35,
        spanGaps: true,
        yAxisID: 'y2',
      },
      visibility.weightGoal &&
        weightGoal != null && {
          label: 'Weight Goal',
          data: Array(labels.length).fill(weightGoal),
          borderColor: '#34d399',
          borderDash: [6, 4],
          borderWidth: 2,
          pointRadius: 0,
          yAxisID: 'y',
        },
      visibility.bodyFatGoal &&
        bodyFatGoal != null && {
          label: 'Body Fat Goal',
          data: Array(labels.length).fill(bodyFatGoal),
          borderColor: '#fbbf24',
          borderDash: [6, 4],
          borderWidth: 2,
          pointRadius: 0,
          yAxisID: 'y1',
        },
      visibility.ffmiGoal &&
        ffmiGoal != null && {
          label: 'FFMI Goal',
          data: Array(labels.length).fill(ffmiGoal),
          borderColor: '#60a5fa',
          borderDash: [6, 4],
          borderWidth: 2,
          pointRadius: 0,
          yAxisID: 'y2',
        },
    ].filter(Boolean),
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: isMobile ? 10 : 18,
          usePointStyle: true,
          boxWidth: isMobile ? 8 : 12,
          font: { size: isMobile ? 10 : 12 },
        },
      },
      tooltip: {
        filter: (item: { dataset: { label?: string } }) =>
          !item.dataset.label?.includes('Goal'),
        callbacks: {
          label: (context: {
            dataset: { label?: string }
            parsed: { y: number | null }
          }) => {
            const value = context.parsed.y
            if (value == null) return `${context.dataset.label}: —`
            if (context.dataset.label?.includes('Weight')) {
              return `${context.dataset.label}: ${value} lbs`
            }
            if (context.dataset.label?.includes('Body Fat')) {
              return `${context.dataset.label}: ${value}%`
            }
            if (context.dataset.label?.includes('FFMI')) {
              return `${context.dataset.label}: ${value}`
            }
            return `${context.dataset.label}: ${value}`
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: '#27272a' },
        ticks: {
          color: '#71717a',
          maxTicksLimit: isMobile ? 5 : 8,
          font: { size: isMobile ? 10 : 11 },
        },
      },
      y: {
        position: 'left' as const,
        title: {
          display: !isMobile,
          text: 'Weight (lbs)',
          color: '#10b981',
        },
        ticks: {
          color: '#10b981',
          font: { size: isMobile ? 10 : 12 },
          maxTicksLimit: isMobile ? 5 : 8,
        },
        grid: { color: '#27272a' },
      },
      y1: {
        position: 'right' as const,
        display:
          visibility.rawBodyFat ||
          visibility.bodyFatTrend ||
          visibility.bodyFatGoal,
        title: {
          display: !isMobile,
          text: 'Body Fat %',
          color: '#f59e0b',
        },
        ticks: {
          color: '#f59e0b',
          font: { size: isMobile ? 10 : 12 },
          maxTicksLimit: isMobile ? 4 : 8,
        },
        grid: { drawOnChartArea: false },
      },
      y2: {
        position: 'right' as const,
        display: visibility.rawFfmi || visibility.ffmiTrend || visibility.ffmiGoal,
        title: {
          display: !isMobile,
          text: 'FFMI',
          color: '#3b82f6',
        },
        ticks: {
          color: '#3b82f6',
          stepSize: 0.5,
          font: { size: isMobile ? 10 : 12 },
          maxTicksLimit: isMobile ? 4 : 8,
        },
        grid: { drawOnChartArea: false },
        offset: true,
      },
    },
  }

  const toggle = (key: keyof VisibilitySettings) =>
    setVisibility((current) => ({ ...current, [key]: !current[key] }))

  if (dailyPoints.length === 0) return null

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8">
      <div className="flex flex-col gap-4 mb-4 sm:mb-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold">Smoothed Weight Trend</h2>
            <p className="text-zinc-400 text-sm mt-1">
              Happy Scale-style moving averages to smooth daily fluctuations
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {AVERAGE_WINDOWS.map((window) => (
              <button
                key={window}
                type="button"
                onClick={() => setAverageWindow(window)}
                className={`px-3 sm:px-4 py-1.5 rounded-2xl text-sm whitespace-nowrap transition-colors ${
                  averageWindow === window
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-800 hover:bg-zinc-700'
                }`}
              >
                {window === 'all' ? 'All-Time' : `${window}-Day`}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-zinc-800/70 border border-zinc-700 rounded-2xl px-4 py-3">
            <p className="text-xs text-zinc-400 uppercase tracking-wide">Trend Weight</p>
            <p className="text-2xl font-semibold text-emerald-400 mt-1">
              {latestWeightTrend != null ? `${latestWeightTrend} lbs` : '—'}
            </p>
            <p className="text-xs text-zinc-500 mt-1">{getAverageWindowLabel(averageWindow)}</p>
          </div>

          <div className="bg-zinc-800/70 border border-zinc-700 rounded-2xl px-4 py-3">
            <p className="text-xs text-zinc-400 uppercase tracking-wide">Vs Weight Goal</p>
            <p className="text-2xl font-semibold text-white mt-1">
              {latestWeightTrend != null && weightGoal != null
                ? `${parseFloat((latestWeightTrend - weightGoal).toFixed(1))} lbs`
                : '—'}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              {weightGoal != null ? `Goal: ${weightGoal} lbs` : 'Set a weight goal in Profile'}
            </p>
          </div>

          <div className="bg-zinc-800/70 border border-zinc-700 rounded-2xl px-4 py-3">
            <p className="text-xs text-zinc-400 uppercase tracking-wide">Trend Change</p>
            <p
              className={`text-2xl font-semibold mt-1 ${
                weightDelta == null
                  ? 'text-zinc-400'
                  : weightDelta <= 0
                    ? 'text-emerald-400'
                    : 'text-orange-400'
              }`}
            >
              {weightDelta != null
                ? `${weightDelta > 0 ? '+' : ''}${weightDelta} lbs`
                : '—'}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Since first logged entry</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={() => setShowSettings((open) => !open)}
          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm"
        >
          {showSettings ? 'Hide Chart Options' : 'Chart Options'}
        </button>
      </div>

      {showSettings && (
        <div className="mb-6 p-4 bg-zinc-800 rounded-2xl border border-zinc-700">
          <div className="text-sm font-medium mb-3">Toggle Series & Goals</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
            {(
              [
                ['rawWeight', 'Daily weight'],
                ['weightTrend', 'Weight trend line'],
                ['weightGoal', 'Weight goal'],
                ['rawBodyFat', 'Daily body fat'],
                ['bodyFatTrend', 'Body fat trend line'],
                ['bodyFatGoal', 'Body fat goal'],
                ['rawFfmi', 'Daily FFMI'],
                ['ffmiTrend', 'FFMI trend line'],
                ['ffmiGoal', 'FFMI goal'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibility[key]}
                  onChange={() => toggle(key)}
                  className="accent-emerald-500"
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="h-[280px] sm:h-[360px] lg:h-[440px]">
        <Line data={chartData as never} options={options} />
      </div>
    </div>
  )
}