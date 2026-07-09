import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import type { Measurement, ProgressPhoto, ProgressPhotoPose } from '../types'
import { usePhotoSignedUrls } from '../hooks/usePhotoSignedUrls'
import {
  compareDatesForPose,
  compareMetricDeltas,
  daysBetweenDates,
  defaultCompareDates,
  defaultComparePose,
  posesWithMultiplePhotos,
  resolveComparePair,
} from '../lib/progressPhotoCompare'
import { formatPhotoDate, PHOTO_POSE_LABELS } from '../lib/progressPhotos'
import ProgressPhotoAnalysis from './ProgressPhotoAnalysis'

interface ProgressPhotoCompareProps {
  photos: ProgressPhoto[]
  measurements: Measurement[]
}

export default function ProgressPhotoCompare({
  photos,
  measurements,
}: ProgressPhotoCompareProps) {
  const availablePoses = useMemo(() => posesWithMultiplePhotos(photos), [photos])
  const initialPose = useMemo(() => defaultComparePose(photos), [photos])

  const [pose, setPose] = useState<ProgressPhotoPose | null>(initialPose)
  const [beforeDate, setBeforeDate] = useState<string | null>(null)
  const [afterDate, setAfterDate] = useState<string | null>(null)
  const previousPoseRef = useRef<ProgressPhotoPose | null>(null)

  useEffect(() => {
    if (!initialPose) {
      setPose(null)
      setBeforeDate(null)
      setAfterDate(null)
      previousPoseRef.current = null
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
    if (!activePose || !defaultDates) {
      setBeforeDate(null)
      setAfterDate(null)
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
  }, [activePose, defaultDates, datesForPose])

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

  const { getUrl, isLoading } = usePhotoSignedUrls(pair ? [pair.before, pair.after] : [])

  if (!initialPose || !activePose || !defaultDates || !resolvedBeforeDate || !resolvedAfterDate) {
    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
        <h2 className="text-lg font-semibold mb-1">Before & after</h2>
        <p className="text-sm text-zinc-400">
          Upload at least two photos in the same pose (e.g. front) on different dates to
          compare your visual progress.
        </p>
      </div>
    )
  }

  const beforeMeasurement = measurements.find((m) => m.date === resolvedBeforeDate)
  const afterMeasurement = measurements.find((m) => m.date === resolvedAfterDate)
  const metricDeltas =
    pair != null
      ? compareMetricDeltas(
          beforeMeasurement,
          afterMeasurement,
          pair.before,
          pair.after
        )
      : []

  const spanDays = daysBetweenDates(resolvedBeforeDate, resolvedAfterDate)

  const beforeOptions = datesForPose.filter((date) => date !== resolvedAfterDate)
  const afterOptions = datesForPose.filter((date) => date !== resolvedBeforeDate)

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold">Before & after</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Compare the same pose across two check-in dates.
          </p>
        </div>
        <span className="text-xs text-zinc-500 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-1.5">
          {spanDays} day{spanDays === 1 ? '' : 's'} apart
        </span>
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

      {pair && (
        <>
          {metricDeltas.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
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
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {([pair.before, pair.after] as const).map((photo, index) => {
              const measurement = index === 0 ? beforeMeasurement : afterMeasurement
              const signedUrl = getUrl(photo.storage_path)
              const photoLoading = isLoading(photo.storage_path)
              const caption = index === 0 ? 'Before' : 'After'

              return (
                <article
                  key={photo.id}
                  className="overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950"
                >
                  <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between">
                    <p className="text-sm font-medium text-white">
                      {caption} · {formatPhotoDate(photo.date)}
                    </p>
                    {measurement && (
                      <p className="text-xs text-zinc-500">
                        {measurement.weight} lbs
                        {measurement.body_fat != null
                          ? ` · ${measurement.body_fat}% BF`
                          : ''}
                      </p>
                    )}
                  </div>
                  <div className="relative">
                    {photoLoading && !signedUrl ? (
                      <div className="aspect-[3/4] flex items-center justify-center text-xs text-zinc-500">
                        Loading…
                      </div>
                    ) : signedUrl ? (
                      <img
                        src={signedUrl}
                        alt={`${caption} ${PHOTO_POSE_LABELS[photo.pose]} photo`}
                        className="aspect-[3/4] w-full object-cover"
                      />
                    ) : (
                      <div className="aspect-[3/4] flex items-center justify-center text-xs text-zinc-500">
                        Preview unavailable
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <ProgressPhotoAnalysis
                      photo={photo}
                      measurement={measurement}
                      compact
                    />
                  </div>
                </article>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}