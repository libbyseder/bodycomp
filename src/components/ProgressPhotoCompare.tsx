import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Columns2, SlidersHorizontal } from 'lucide-react'
import BeforeAfterSlider from './BeforeAfterSlider'
import ComparePhotoImage from './ComparePhotoImage'
import ComparePhotoTools from './ComparePhotoTools'
import {
  DEFAULT_COMPARE_TOOLS,
  compareBackgroundStyle,
  type CompareToolSettings,
} from '../lib/comparePhotoTools'
import type { Measurement, Profile, ProgressPhoto, ProgressPhotoPose } from '../types'
import { measurementOnDate } from '../lib/goalWindow'
import {
  compareDatesForPose,
  compareMetricDeltas,
  daysBetweenDates,
  defaultCompareDates,
  defaultComparePose,
  formatMeasurementSummary,
  posesWithMultiplePhotos,
  resolveComparePair,
} from '../lib/progressPhotoCompare'
import { formatPhotoDate, PHOTO_POSE_LABELS } from '../lib/progressPhotos'
import ProgressPhotoAnalysis from './ProgressPhotoAnalysis'

interface ProgressPhotoCompareProps {
  photos: ProgressPhoto[]
  measurements: Measurement[]
  profile: Profile | null
  getPhotoUrl: (storagePath: string) => string | null
  isPhotoLoading: (storagePath: string) => boolean
}

type CompareViewMode = 'split' | 'slider'

export default function ProgressPhotoCompare({
  photos,
  measurements,
  profile,
  getPhotoUrl,
  isPhotoLoading,
}: ProgressPhotoCompareProps) {
  const availablePoses = useMemo(() => posesWithMultiplePhotos(photos), [photos])
  const initialPose = useMemo(() => defaultComparePose(photos), [photos])
  const heightInches = profile?.height_inches ?? null

  const [pose, setPose] = useState<ProgressPhotoPose | null>(initialPose)
  const [beforeDate, setBeforeDate] = useState<string | null>(null)
  const [afterDate, setAfterDate] = useState<string | null>(null)
  const previousPoseRef = useRef<ProgressPhotoPose | null>(null)
  const [viewMode, setViewMode] = useState<CompareViewMode>('slider')
  const [toolSettings, setToolSettings] = useState<CompareToolSettings>(
    DEFAULT_COMPARE_TOOLS
  )
  const [sliderResetToken, setSliderResetToken] = useState(0)

  const updateTools = (patch: Partial<CompareToolSettings>) => {
    setToolSettings((current) => ({ ...current, ...patch }))
  }

  useEffect(() => {
    if (!initialPose) {
      setPose(null)
      return
    }
    if (!pose || !availablePoses.includes(pose)) {
      setPose(initialPose)
    }
  }, [initialPose, pose, availablePoses])

  const activePose = pose && availablePoses.includes(pose) ? pose : initialPose

  const datesForPose = useMemo(
    () => (activePose ? compareDatesForPose(photos, activePose) : []),
    [photos, activePose]
  )

  const defaultDates = useMemo(
    () => (activePose ? defaultCompareDates(photos, activePose) : null),
    [photos, activePose]
  )

  useEffect(() => {
    if (!defaultDates) {
      setBeforeDate(null)
      setAfterDate(null)
      previousPoseRef.current = null
      return
    }

    const poseChanged = previousPoseRef.current !== activePose
    previousPoseRef.current = activePose

    if (poseChanged) {
      setBeforeDate(defaultDates.beforeDate)
      setAfterDate(defaultDates.afterDate)
      return
    }

    setBeforeDate((current) =>
      current && datesForPose.includes(current) ? current : defaultDates.beforeDate
    )
    setAfterDate((current) =>
      current && datesForPose.includes(current) ? current : defaultDates.afterDate
    )
  }, [activePose, defaultDates?.beforeDate, defaultDates?.afterDate, datesForPose])

  const resolvedBeforeDate =
    beforeDate && datesForPose.includes(beforeDate)
      ? beforeDate
      : defaultDates?.beforeDate ?? null

  const resolvedAfterDate =
    afterDate && datesForPose.includes(afterDate)
      ? afterDate
      : defaultDates?.afterDate ?? null

  const pair = useMemo(() => {
    if (!activePose || !resolvedBeforeDate || !resolvedAfterDate) return null
    return resolveComparePair(photos, activePose, resolvedBeforeDate, resolvedAfterDate)
  }, [photos, activePose, resolvedBeforeDate, resolvedAfterDate])

  if (!initialPose || !activePose || !defaultDates || !resolvedBeforeDate || !resolvedAfterDate) {
    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
        <h2 className="text-lg font-semibold mb-1">Compare</h2>
        <p className="text-sm text-zinc-400">
          Upload the same pose (e.g. front) on at least two different dates to compare your
          visual progress.
        </p>
      </div>
    )
  }

  const beforeMeasurement = measurementOnDate(measurements, resolvedBeforeDate)
  const afterMeasurement = measurementOnDate(measurements, resolvedAfterDate)

  const metricDeltas =
    pair != null
      ? compareMetricDeltas(
          beforeMeasurement,
          afterMeasurement,
          pair.before,
          pair.after,
          heightInches
        )
      : []

  const spanDays = daysBetweenDates(resolvedBeforeDate, resolvedAfterDate)

  const beforeOptions = datesForPose.filter((date) => date < resolvedAfterDate)
  const afterOptions = datesForPose.filter((date) => date > resolvedBeforeDate)

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold">Compare</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Drag the slider or view side-by-side — same pose, two dates.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-zinc-700 bg-zinc-800 p-1">
            <button
              type="button"
              onClick={() => setViewMode('slider')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'slider'
                  ? 'bg-violet-500 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <SlidersHorizontal size={14} />
              Slider
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'split'
                  ? 'bg-violet-500 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Columns2 size={14} />
              Side by side
            </button>
          </div>
          <span className="text-xs text-zinc-500 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-1.5">
            {spanDays} day{spanDays === 1 ? '' : 's'} apart
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <label className="block text-sm">
          <span className="text-zinc-400 mb-1.5 block">Pose</span>
          <select
            value={activePose}
            onChange={(e) => setPose(e.target.value as ProgressPhotoPose)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-violet-500"
          >
            {availablePoses.map((value) => (
              <option key={value} value={value}>
                {PHOTO_POSE_LABELS[value]}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-zinc-400 mb-1.5 block">Before</span>
          <select
            value={resolvedBeforeDate}
            onChange={(e) => setBeforeDate(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-violet-500"
          >
            {beforeOptions.map((date) => (
              <option key={date} value={date}>
                {formatPhotoDate(date)}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-zinc-400 mb-1.5 block">After</span>
          <select
            value={resolvedAfterDate}
            onChange={(e) => setAfterDate(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-violet-500"
          >
            {afterOptions.map((date) => (
              <option key={date} value={date}>
                {formatPhotoDate(date)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!pair ? (
        <p className="text-sm text-amber-400 mb-4">
          Choose a before date earlier than the after date to compare photos.
        </p>
      ) : (
        <>
          {metricDeltas.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
              {metricDeltas.map((metric) => (
                <div
                  key={metric.label}
                  className="bg-zinc-800/70 border border-zinc-700 rounded-2xl px-4 py-3"
                >
                  <p className="text-xs text-zinc-400 uppercase tracking-wide">
                    {metric.label}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-sm">
                    <span className="text-zinc-300">{metric.before}</span>
                    <ArrowRight size={14} className="text-zinc-500 shrink-0" />
                    <span className="text-white font-medium">{metric.after}</span>
                  </div>
                  {metric.delta && (
                    <p className="text-xs text-violet-300 mt-1">{metric.delta}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500 mb-5">
              No scale measurements on these dates yet — photos still compare below.
            </p>
          )}

          {(() => {
            const beforeUrl = getPhotoUrl(pair.before.storage_path)
            const afterUrl = getPhotoUrl(pair.after.storage_path)
            const eitherLoading =
              isPhotoLoading(pair.before.storage_path) ||
              isPhotoLoading(pair.after.storage_path)

            if (eitherLoading) {
              return (
                <div className="aspect-[3/4] max-w-lg mx-auto flex items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-950 text-xs text-zinc-500">
                  Loading comparison…
                </div>
              )
            }

            if (!beforeUrl || !afterUrl) {
              return (
                <p className="text-sm text-zinc-500">
                  Preview unavailable for one or both photos.
                </p>
              )
            }

            const leftUrl = toolSettings.swapped ? afterUrl : beforeUrl
            const rightUrl = toolSettings.swapped ? beforeUrl : afterUrl
            const leftLabel = toolSettings.swapped
              ? `After · ${formatPhotoDate(pair.after.date)}`
              : `Before · ${formatPhotoDate(pair.before.date)}`
            const rightLabel = toolSettings.swapped
              ? `Before · ${formatPhotoDate(pair.before.date)}`
              : `After · ${formatPhotoDate(pair.after.date)}`
            const leftMeasurement = toolSettings.swapped ? afterMeasurement : beforeMeasurement
            const rightMeasurement = toolSettings.swapped ? beforeMeasurement : afterMeasurement
            const leftPhoto = toolSettings.swapped ? pair.after : pair.before
            const rightPhoto = toolSettings.swapped ? pair.before : pair.after
            const leftCaption = toolSettings.swapped ? 'After' : 'Before'
            const rightCaption = toolSettings.swapped ? 'Before' : 'After'

            if (viewMode === 'slider') {
              return (
                <div className="max-w-lg mx-auto space-y-4">
                  <ComparePhotoTools
                    settings={toolSettings}
                    onChange={updateTools}
                    onResetSlider={() => setSliderResetToken((value) => value + 1)}
                    showOverlayControls
                  />
                  <BeforeAfterSlider
                    beforeUrl={beforeUrl}
                    afterUrl={afterUrl}
                    beforeLabel={`Before · ${formatPhotoDate(pair.before.date)}`}
                    afterLabel={`After · ${formatPhotoDate(pair.after.date)}`}
                    settings={toolSettings}
                    resetToken={sliderResetToken}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[leftMeasurement, rightMeasurement].map((measurement, index) => {
                      const photo = index === 0 ? leftPhoto : rightPhoto
                      const caption = index === 0 ? leftCaption : rightCaption
                      const summary = formatMeasurementSummary(measurement, heightInches)
                      return (
                        <div
                          key={photo.id}
                          className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3"
                        >
                          <p className="text-xs font-medium text-white mb-1">
                            {caption} · {formatPhotoDate(photo.date)}
                          </p>
                          {summary ? (
                            <p className="text-[11px] text-zinc-500 mb-2">{summary}</p>
                          ) : null}
                          <ProgressPhotoAnalysis
                            photo={photo}
                            measurement={measurement ?? undefined}
                            compact
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            }

            return (
              <div className="space-y-4">
                <ComparePhotoTools
                  settings={toolSettings}
                  onChange={updateTools}
                  onResetSlider={() => setSliderResetToken((value) => value + 1)}
                  showOverlayControls={false}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {([
                    { photo: leftPhoto, url: leftUrl, caption: leftCaption, measurement: leftMeasurement, layer: 'before' as const },
                    { photo: rightPhoto, url: rightUrl, caption: rightCaption, measurement: rightMeasurement, layer: 'after' as const },
                  ] as const).map(({ photo, url, caption, measurement, layer }) => {
                    const measurementSummary = formatMeasurementSummary(
                      measurement,
                      heightInches
                    )

                    return (
                      <article
                        key={photo.id}
                        className="overflow-hidden rounded-2xl border border-zinc-700"
                        style={compareBackgroundStyle(toolSettings.background)}
                      >
                        <div className="px-3 py-2 border-b border-zinc-800/80 bg-black/20">
                          <p className="text-sm font-medium text-white">
                            {caption} · {formatPhotoDate(photo.date)}
                          </p>
                          {measurementSummary ? (
                            <p className="text-xs text-zinc-500 mt-0.5">{measurementSummary}</p>
                          ) : (
                            <p className="text-xs text-zinc-600 mt-0.5">No scale log this day</p>
                          )}
                        </div>
                        <div className="relative aspect-[3/4]">
                          <ComparePhotoImage
                            url={url}
                            alt={`${caption} ${PHOTO_POSE_LABELS[photo.pose]} photo`}
                            settings={toolSettings}
                            layer={layer}
                          />
                        </div>
                        <div className="p-3 bg-zinc-950/90">
                          <ProgressPhotoAnalysis
                            photo={photo}
                            measurement={measurement ?? undefined}
                            compact
                          />
                        </div>
                      </article>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </>
      )}
    </div>
  )
}