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
import { calculateFFMI, calculateNormalizedFFMI } from '../lib/calculateFFMI'
import {
  computeSimpleMovingAverage,
  filterPointsByPeriod,
  getSmoothingWindow,
  getTrendPeriodLabel,
  TREND_PERIODS,
  type TrendPeriod,
} from '../lib/movingAverage'
import { goalLegendLabels } from '../lib/chartLegend'
import FfmiCalcInfo, { FfmiInfoButton } from './FfmiCalcInfo'

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
  title?: string
  subtitle?: string
  className?: string
}

interface DailyPoint {
  date: string
  weight: number
  body_fat: number | null
  ffmi: number | null
  normalized_ffmi: number | null
}

interface VisibilitySettings {
  rawWeight: boolean
  weightTrend: boolean
  rawBodyFat: boolean
  bodyFatTrend: boolean
  rawFfmi: boolean
  ffmiTrend: boolean
  rawNormalizedFfmi: boolean
  normalizedFfmiTrend: boolean
  weightGoal: boolean
  bodyFatGoal: boolean
  ffmiGoal: boolean
  normalizedFfmiGoal: boolean
}

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
    .map((measurement) => ({
      date: measurement.date,
      weight: measurement.weight,
      body_fat: measurement.body_fat,
      ffmi:
        heightInches != null
          ? calculateFFMI(measurement.weight, measurement.body_fat, heightInches)
          : null,
      normalized_ffmi:
        heightInches != null
          ? calculateNormalizedFFMI(measurement.weight, measurement.body_fat, heightInches)
          : null,
    }))
}

function latestTrendValue(values: (number | null)[]): number | null {
  return [...values].reverse().find((value) => value != null) ?? null
}

function periodDelta(values: (number | null)[]): number | null {
  const first = values.find((value) => value != null) ?? null
  const last = latestTrendValue(values)
  if (first == null || last == null) return null
  return parseFloat((last - first).toFixed(2))
}

export default function SmoothedTrendsChart({
  measurements,
  profile,
  title = 'Smoothed Trends',
  subtitle,
  className = 'mb-6 sm:mb-8',
}: SmoothedTrendsChartProps) {
  const [period, setPeriod] = useState<TrendPeriod>(7)
  const [showSettings, setShowSettings] = useState(false)
  const [showFfmiInfo, setShowFfmiInfo] = useState(false)
  const isMobile = useIsMobile()

  const [visibility, setVisibility] = useState<VisibilitySettings>({
    rawWeight: false,
    weightTrend: true,
    rawBodyFat: false,
    bodyFatTrend: true,
    rawFfmi: false,
    ffmiTrend: true,
    rawNormalizedFfmi: false,
    normalizedFfmiTrend: false,
    weightGoal: true,
    bodyFatGoal: true,
    ffmiGoal: true,
    normalizedFfmiGoal: true,
  })

  const allDailyPoints = useMemo(
    () => buildDailyPoints(measurements, profile?.height_inches),
    [measurements, profile?.height_inches]
  )

  const periodPoints = useMemo(
    () => filterPointsByPeriod(allDailyPoints, period),
    [allDailyPoints, period]
  )

  const {
    weightTrend,
    bodyFatTrend,
    ffmiTrend,
    normalizedFfmiTrend,
    latestWeightTrend,
    latestBodyFatTrend,
    latestFfmiTrend,
    latestNormalizedFfmiTrend,
    weightDelta,
    bodyFatDelta,
    ffmiDelta,
    normalizedFfmiDelta,
  } = useMemo(() => {
    const smoothingWindow = getSmoothingWindow(periodPoints.length)
    const weights = periodPoints.map((point) => point.weight)
    const bodyFats = periodPoints.map((point) => point.body_fat)
    const ffmis = periodPoints.map((point) => point.ffmi)
    const normalizedFfmis = periodPoints.map((point) => point.normalized_ffmi)

    const nextWeightTrend = computeSimpleMovingAverage(weights, smoothingWindow)
    const nextBodyFatTrend = computeSimpleMovingAverage(bodyFats, smoothingWindow)
    const nextFfmiTrend = computeSimpleMovingAverage(ffmis, smoothingWindow)
    const nextNormalizedFfmiTrend = computeSimpleMovingAverage(normalizedFfmis, smoothingWindow)

    return {
      weightTrend: nextWeightTrend,
      bodyFatTrend: nextBodyFatTrend,
      ffmiTrend: nextFfmiTrend,
      normalizedFfmiTrend: nextNormalizedFfmiTrend,
      latestWeightTrend: latestTrendValue(nextWeightTrend),
      latestBodyFatTrend: latestTrendValue(nextBodyFatTrend),
      latestFfmiTrend: latestTrendValue(nextFfmiTrend),
      latestNormalizedFfmiTrend: latestTrendValue(nextNormalizedFfmiTrend),
      weightDelta: periodDelta(nextWeightTrend),
      bodyFatDelta: periodDelta(nextBodyFatTrend),
      ffmiDelta: periodDelta(nextFfmiTrend),
      normalizedFfmiDelta: periodDelta(nextNormalizedFfmiTrend),
    }
  }, [periodPoints])

  const labels = periodPoints.map((point) => point.date)
  const weightGoal = profile?.target_weight ?? null
  const bodyFatGoal = profile?.target_body_fat ?? null
  const ffmiGoal = profile?.target_ffmi ?? null
  const normalizedFfmiGoal = profile?.target_normalized_ffmi ?? null

  const chartData = {
    labels,
    datasets: [
      visibility.rawWeight && {
        label: 'Daily Weight',
        data: periodPoints.map((point) => point.weight),
        borderColor: 'rgba(16, 185, 129, 0.35)',
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        borderWidth: 1.5,
        pointRadius: isMobile ? 2 : 3,
        pointHoverRadius: 5,
        tension: 0.1,
        yAxisID: 'y',
      },
      visibility.weightTrend && {
        label: 'Weight Trend',
        data: weightTrend,
        borderColor: '#10b981',
        borderWidth: 3,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.35,
        spanGaps: true,
        yAxisID: 'y',
      },
      visibility.rawBodyFat && {
        label: 'Daily Body Fat %',
        data: periodPoints.map((point) => point.body_fat),
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
        label: 'Body Fat Trend',
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
        data: periodPoints.map((point) => point.ffmi),
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
        label: 'FFMI Trend',
        data: ffmiTrend,
        borderColor: '#3b82f6',
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.35,
        spanGaps: true,
        yAxisID: 'y2',
      },
      visibility.rawNormalizedFfmi && {
        label: 'Daily Norm. FFMI',
        data: periodPoints.map((point) => point.normalized_ffmi),
        borderColor: 'rgba(129, 140, 248, 0.35)',
        backgroundColor: 'rgba(129, 140, 248, 0.12)',
        borderWidth: 1.5,
        pointRadius: isMobile ? 2 : 3,
        pointHoverRadius: 5,
        tension: 0.1,
        spanGaps: true,
        yAxisID: 'y2',
      },
      visibility.normalizedFfmiTrend && {
        label: 'Norm. FFMI Trend',
        data: normalizedFfmiTrend,
        borderColor: '#818cf8',
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
          pointStyle: 'circle',
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
          pointStyle: 'circle',
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
          pointStyle: 'circle',
          yAxisID: 'y2',
        },
      visibility.normalizedFfmiGoal &&
        normalizedFfmiGoal != null && {
          label: 'Norm. FFMI Goal',
          data: Array(labels.length).fill(normalizedFfmiGoal),
          borderColor: '#a78bfa',
          borderDash: [6, 4],
          borderWidth: 2,
          pointRadius: 0,
          pointStyle: 'circle',
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
          generateLabels: goalLegendLabels,
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
        ticks: { display: false },
      },
      y: {
        position: 'left' as const,
        display:
          visibility.rawWeight || visibility.weightTrend || visibility.weightGoal,
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
        display:
          visibility.rawFfmi ||
          visibility.ffmiTrend ||
          visibility.rawNormalizedFfmi ||
          visibility.normalizedFfmiTrend ||
          visibility.ffmiGoal ||
          visibility.normalizedFfmiGoal,
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

  const allDataOn =
    visibility.rawWeight && visibility.rawBodyFat && visibility.rawFfmi
  const allGoalsOn =
    visibility.weightGoal &&
    visibility.bodyFatGoal &&
    visibility.ffmiGoal &&
    visibility.normalizedFfmiGoal

  const setAllData = (enabled: boolean) =>
    setVisibility((current) => ({
      ...current,
      rawWeight: enabled,
      rawBodyFat: enabled,
      rawFfmi: enabled,
      rawNormalizedFfmi: enabled,
    }))

  const setAllGoals = (enabled: boolean) =>
    setVisibility((current) => ({
      ...current,
      weightGoal: enabled,
      bodyFatGoal: enabled,
      ffmiGoal: enabled,
      normalizedFfmiGoal: enabled,
    }))

  if (allDailyPoints.length === 0) return null

  return (
    <div className={`bg-zinc-900 border border-zinc-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 ${className}`}>
      <div className="flex flex-col gap-4 mb-4 sm:mb-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold">{title}</h2>
            <p className="text-zinc-400 text-sm mt-1">
              {subtitle ?? `Moving averages for weight, body fat, and FFMI — ${getTrendPeriodLabel(period)}`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {TREND_PERIODS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setPeriod(value)}
                className={`px-3 sm:px-4 py-1.5 rounded-2xl text-sm whitespace-nowrap transition-colors ${
                  period === value
                    ? 'bg-cyan-500 text-white'
                    : 'bg-zinc-800 hover:bg-zinc-700'
                }`}
              >
                {value === 'all' ? 'All-Time' : `${value}-Day`}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-zinc-800/70 border border-zinc-700 rounded-2xl px-4 py-3">
            <p className="text-xs text-zinc-400 uppercase tracking-wide">Weight Trend</p>
            <p className="text-2xl font-semibold text-emerald-400 mt-1">
              {latestWeightTrend != null ? `${latestWeightTrend} lbs` : '—'}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              {weightDelta != null
                ? `${weightDelta > 0 ? '+' : ''}${weightDelta} lbs in period`
                : 'No change in period'}
            </p>
          </div>

          <div className="bg-zinc-800/70 border border-zinc-700 rounded-2xl px-4 py-3">
            <p className="text-xs text-zinc-400 uppercase tracking-wide">Body Fat Trend</p>
            <p className="text-2xl font-semibold text-orange-400 mt-1">
              {latestBodyFatTrend != null ? `${latestBodyFatTrend}%` : '—'}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              {bodyFatDelta != null
                ? `${bodyFatDelta > 0 ? '+' : ''}${bodyFatDelta}% in period`
                : 'No change in period'}
            </p>
          </div>

          <div className="bg-zinc-800/70 border border-zinc-700 rounded-2xl px-4 py-3">
            <p className="text-xs text-zinc-400 uppercase tracking-wide flex items-center">
              FFMI Trend
              <FfmiInfoButton onClick={() => setShowFfmiInfo((v) => !v)} />
            </p>
            <p className="text-2xl font-semibold text-blue-400 mt-1">
              {latestFfmiTrend != null ? latestFfmiTrend : '—'}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              {ffmiDelta != null
                ? `${ffmiDelta > 0 ? '+' : ''}${ffmiDelta} in period`
                : 'No change in period'}
            </p>
            {latestNormalizedFfmiTrend != null && (
              <p className="text-xs text-indigo-300/80 mt-2">
                Norm. {latestNormalizedFfmiTrend}
                {normalizedFfmiDelta != null && (
                  <span className="text-zinc-500">
                    {' '}({normalizedFfmiDelta > 0 ? '+' : ''}{normalizedFfmiDelta})
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        <FfmiCalcInfo
          open={showFfmiInfo}
          onToggle={() => setShowFfmiInfo((v) => !v)}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allDataOn}
              onChange={(e) => setAllData(e.target.checked)}
              className="accent-emerald-500"
            />
            All daily data
          </label>
          <label className="flex items-center gap-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allGoalsOn}
              onChange={(e) => setAllGoals(e.target.checked)}
              className="accent-emerald-500"
            />
            All goals
          </label>
        </div>

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
                ['weightTrend', 'Weight trend'],
                ['weightGoal', 'Weight goal'],
                ['rawBodyFat', 'Daily body fat'],
                ['bodyFatTrend', 'Body fat trend'],
                ['bodyFatGoal', 'Body fat goal'],
                ['rawFfmi', 'Daily FFMI'],
                ['ffmiTrend', 'FFMI trend'],
                ['rawNormalizedFfmi', 'Daily norm. FFMI'],
                ['normalizedFfmiTrend', 'Norm. FFMI trend'],
                ['ffmiGoal', 'FFMI goal'],
                ['normalizedFfmiGoal', 'Norm. FFMI goal'],
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
        {periodPoints.length > 0 ? (
          <Line data={chartData as never} options={options} />
        ) : (
          <div className="h-full flex items-center justify-center text-zinc-400">
            No data in this period
          </div>
        )}
      </div>
    </div>
  )
}