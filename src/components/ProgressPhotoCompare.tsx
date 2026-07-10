import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Columns2, SlidersHorizontal } from 'lucide-react'
import toast from 'react-hot-toast'
import BeforeAfterSlider from './BeforeAfterSlider'
import ComparePhotoImage from './ComparePhotoImage'
import ComparePhotoTools from './ComparePhotoTools'
import {
  DEFAULT_COMPARE_TOOLS,
  DEFAULT_IMAGE_ADJUST,
  applyPairEdits,
  clearPairEdits,
  compareBackgroundStyle,
  doneEditingPatch,
  getLayerAdjust,
  loadPairEdits,
  patchLayerAdjust,
  resetAllToolsPatch,
  savePairEdits,
  toPairEdits,
  type CompareAdjustLayer,
  type CompareToolSettings,
  type ImageAdjustSettings,
} from '../lib/comparePhotoTools'
import { removePhotoBackground, revokeObjectUrl } from '../lib/removePhotoBackground'
import { usePinchPanZoom } from '../hooks/usePinchPanZoom'
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

function SplitPhotoPane({
  photo,
  url,
  displayUrl,
  caption,
  measurement,
  measurementSummary,
  layer,
  settings,
  onSettingsChange,
  removing,
}: {
  photo: ProgressPhoto
  url: string
  displayUrl?: string | null
  caption: string
  measurement: Measurement | null | undefined
  measurementSummary: string | null
  layer: CompareAdjustLayer
  settings: CompareToolSettings
  onSettingsChange: (patch: Partial<CompareToolSettings>) => void
  removing?: boolean
}) {
  const paneRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const lastTapRef = useRef(0)

  const alignThisLayer = settings.alignMode && settings.activeLayer === layer

  const { attach } = usePinchPanZoom({
    enabled: alignThisLayer,
    getAdjust: () => getLayerAdjust(settingsRef.current, layer),
    onAdjust: (patch: Partial<ImageAdjustSettings>) => {
      onSettingsChange(patchLayerAdjust(settingsRef.current, layer, patch))
    },
  })

  useEffect(() => {
    return attach(paneRef.current)
  }, [attach, alignThisLayer])

  const selectLayer = () => {
    if (settings.alignMode && settings.activeLayer !== layer) {
      onSettingsChange({ activeLayer: layer })
    }
  }

  const handleDoubleReset = () => {
    if (!alignThisLayer) return
    const now = Date.now()
    if (now - lastTapRef.current < 320) {
      const current = getLayerAdjust(settingsRef.current, layer)
      onSettingsChange(
        patchLayerAdjust(settingsRef.current, layer, {
          scale: 1,
          offsetX: 0,
          offsetY: 0,
          brightness: current.brightness,
          contrast: current.contrast,
        })
      )
    }
    lastTapRef.current = now
  }

  return (
    <article
      className={`overflow-hidden rounded-2xl border ${
        alignThisLayer ? 'border-violet-500/60 ring-1 ring-violet-500/30' : 'border-zinc-700'
      }`}
      style={compareBackgroundStyle(settings.background)}
      onPointerDown={selectLayer}
    >
      <div className="px-3 py-2 border-b border-zinc-800/80 bg-black/20">
        <p className="text-sm font-medium text-white">
          {caption} · {formatPhotoDate(photo.date)}
          {displayUrl ? ' · cutout' : ''}
        </p>
        {measurementSummary ? (
          <p className="text-xs text-zinc-500 mt-0.5">{measurementSummary}</p>
        ) : (
          <p className="text-xs text-zinc-600 mt-0.5">No scale log this day</p>
        )}
      </div>
      <div
        ref={paneRef}
        onPointerDown={handleDoubleReset}
        className={`relative aspect-[3/4] touch-none ${
          alignThisLayer ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
      >
        <ComparePhotoImage
          url={url}
          displayUrl={displayUrl}
          alt={`${caption} ${PHOTO_POSE_LABELS[photo.pose]} photo`}
          settings={settings}
          layer={layer}
          forceContain
        />
        {alignThisLayer && (
          <span className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-md bg-violet-600/90 px-2 py-0.5 text-[10px] font-medium text-white">
            Pinch / drag · double-tap reset
          </span>
        )}
        {removing && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
            <p className="text-xs text-white bg-zinc-950/90 border border-zinc-700 rounded-lg px-3 py-2">
              Removing background…
            </p>
          </div>
        )}
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
}

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
  const [hasSavedEdits, setHasSavedEdits] = useState(false)

  const [bgRemovedByPath, setBgRemovedByPath] = useState<Record<string, string>>({})
  const [removingLayer, setRemovingLayer] = useState<CompareAdjustLayer | 'both' | null>(
    null
  )
  const bgRemovedByPathRef = useRef(bgRemovedByPath)
  bgRemovedByPathRef.current = bgRemovedByPath
  const appliedPairKeyRef = useRef<string | null>(null)
  const reapplyingCutoutsRef = useRef(false)

  const updateTools = useCallback((patch: Partial<CompareToolSettings>) => {
    setToolSettings((current) => ({ ...current, ...patch }))
  }, [])

  useEffect(() => {
    return () => {
      for (const url of Object.values(bgRemovedByPathRef.current)) {
        revokeObjectUrl(url)
      }
    }
  }, [])

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

  const clearCutouts = useCallback((paths: string[]) => {
    setBgRemovedByPath((prev) => {
      const next = { ...prev }
      for (const path of paths) {
        if (next[path]) {
          revokeObjectUrl(next[path])
          delete next[path]
        }
      }
      return next
    })
  }, [])

  const runCutout = useCallback(
    async (
      targets: { layer: CompareAdjustLayer; path: string; url: string }[],
      layer: CompareAdjustLayer | 'both',
      options?: { silent?: boolean }
    ) => {
      if (targets.length === 0) {
        if (!options?.silent) toast.error('Photo URL not ready')
        return false
      }

      setRemovingLayer(layer)
      const toastId = options?.silent
        ? null
        : toast.loading(
            targets.length > 1
              ? 'Removing backgrounds (first run downloads AI model)…'
              : 'Removing background (first run downloads AI model)…'
          )

      try {
        for (const target of targets) {
          if (bgRemovedByPathRef.current[target.path]) continue
          const blobUrl = await removePhotoBackground(target.url)
          setBgRemovedByPath((prev) => {
            const old = prev[target.path]
            if (old) revokeObjectUrl(old)
            return { ...prev, [target.path]: blobUrl }
          })
        }
        // Cutouts need a visible stage backdrop + contain fit
        setToolSettings((current) => ({
          ...current,
          fitContain: true,
          background:
            current.background === 'dark' || current.background === 'black'
              ? 'checkered'
              : current.background,
        }))
        if (toastId) {
          toast.success(
            targets.length > 1 ? 'Backgrounds removed' : 'Background removed',
            { id: toastId }
          )
        }
        return true
      } catch (err) {
        console.error(err)
        if (toastId) {
          toast.error(
            err instanceof Error ? err.message : 'Background removal failed',
            { id: toastId }
          )
        }
        return false
      } finally {
        setRemovingLayer(null)
      }
    },
    []
  )

  // Load saved edits when the photo pair changes
  useEffect(() => {
    if (!pair) {
      appliedPairKeyRef.current = null
      return
    }

    const key = `${pair.before.id}:${pair.after.id}`
    if (appliedPairKeyRef.current === key) return
    appliedPairKeyRef.current = key

    // Drop cutouts from the previous pair so state matches this selection
    setBgRemovedByPath((prev) => {
      for (const url of Object.values(prev)) revokeObjectUrl(url)
      return {}
    })

    const saved = loadPairEdits(pair.before.id, pair.after.id)
    if (saved) {
      setToolSettings(applyPairEdits(saved))
      setHasSavedEdits(true)
      setSliderResetToken((v) => v + 1)

      // Re-apply cutouts if they were saved for this pair
      if (saved.beforeCutout || saved.afterCutout) {
        const targets: { layer: CompareAdjustLayer; path: string; url: string }[] = []
        if (saved.beforeCutout) {
          const url = getPhotoUrl(pair.before.storage_path)
          if (url) {
            targets.push({
              layer: 'before',
              path: pair.before.storage_path,
              url,
            })
          }
        }
        if (saved.afterCutout) {
          const url = getPhotoUrl(pair.after.storage_path)
          if (url) {
            targets.push({
              layer: 'after',
              path: pair.after.storage_path,
              url,
            })
          }
        }
        if (targets.length > 0 && !reapplyingCutoutsRef.current) {
          reapplyingCutoutsRef.current = true
          const layer: CompareAdjustLayer | 'both' =
            targets.length === 2 ? 'both' : targets[0].layer
          void runCutout(targets, layer, { silent: true }).finally(() => {
            reapplyingCutoutsRef.current = false
          })
        }
      }
    } else {
      setToolSettings({
        ...resetAllToolsPatch(),
        beforeAdjust: { ...DEFAULT_IMAGE_ADJUST },
        afterAdjust: { ...DEFAULT_IMAGE_ADJUST },
      })
      setHasSavedEdits(false)
      setSliderResetToken((v) => v + 1)
    }
  }, [pair, getPhotoUrl, runCutout])

  const handleRemoveBackground = useCallback(
    async (layer: CompareAdjustLayer | 'both') => {
      if (!pair) return

      const targets: { layer: CompareAdjustLayer; path: string; url: string }[] = []

      if (layer === 'before' || layer === 'both') {
        const url = getPhotoUrl(pair.before.storage_path)
        if (url && !bgRemovedByPathRef.current[pair.before.storage_path]) {
          targets.push({
            layer: 'before',
            path: pair.before.storage_path,
            url,
          })
        }
      }
      if (layer === 'after' || layer === 'both') {
        const url = getPhotoUrl(pair.after.storage_path)
        if (url && !bgRemovedByPathRef.current[pair.after.storage_path]) {
          targets.push({
            layer: 'after',
            path: pair.after.storage_path,
            url,
          })
        }
      }

      // If everything already cut out, treat as no-op success
      if (targets.length === 0) {
        const already =
          (layer === 'before' && bgRemovedByPathRef.current[pair.before.storage_path]) ||
          (layer === 'after' && bgRemovedByPathRef.current[pair.after.storage_path]) ||
          (layer === 'both' &&
            bgRemovedByPathRef.current[pair.before.storage_path] &&
            bgRemovedByPathRef.current[pair.after.storage_path])
        if (already) {
          toast.success('Cutout already applied')
          setToolSettings((current) => ({ ...current, fitContain: true }))
          return
        }
        toast.error('Photo URL not ready')
        return
      }

      await runCutout(targets, layer)
    },
    [pair, getPhotoUrl, runCutout]
  )

  const handleRestoreBackground = useCallback(
    (layer: CompareAdjustLayer | 'both') => {
      if (!pair) return
      const paths: string[] = []
      if (layer === 'before' || layer === 'both') paths.push(pair.before.storage_path)
      if (layer === 'after' || layer === 'both') paths.push(pair.after.storage_path)
      clearCutouts(paths)
      toast.success(paths.length > 1 ? 'Cutouts restored' : 'Original photo restored')
    },
    [pair, clearCutouts]
  )

  const handleDone = useCallback(() => {
    if (!pair) {
      updateTools(doneEditingPatch())
      return
    }

    const beforeCutout = Boolean(bgRemovedByPathRef.current[pair.before.storage_path])
    const afterCutout = Boolean(bgRemovedByPathRef.current[pair.after.storage_path])
    const edits = toPairEdits(toolSettings, beforeCutout, afterCutout)
    savePairEdits(pair.before.id, pair.after.id, edits)
    setHasSavedEdits(true)
    updateTools(doneEditingPatch())
    toast.success('Adjustments saved for this pair')
  }, [pair, toolSettings, updateTools])

  const handleResetAll = useCallback(() => {
    if (pair) {
      clearPairEdits(pair.before.id, pair.after.id)
      clearCutouts([pair.before.storage_path, pair.after.storage_path])
    }
    setToolSettings(resetAllToolsPatch())
    setSliderResetToken((v) => v + 1)
    setHasSavedEdits(false)
    toast.success('Compare tools reset')
  }, [pair, clearCutouts])

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
            Align, match lighting, cut out backgrounds, then tap Done to save.
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
            const beforeDisplayUrl = bgRemovedByPath[pair.before.storage_path] ?? null
            const afterDisplayUrl = bgRemovedByPath[pair.after.storage_path] ?? null
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
            const leftDisplayUrl = toolSettings.swapped ? afterDisplayUrl : beforeDisplayUrl
            const rightDisplayUrl = toolSettings.swapped ? beforeDisplayUrl : afterDisplayUrl
            const leftMeasurement = toolSettings.swapped ? afterMeasurement : beforeMeasurement
            const rightMeasurement = toolSettings.swapped ? beforeMeasurement : afterMeasurement
            const leftPhoto = toolSettings.swapped ? pair.after : pair.before
            const rightPhoto = toolSettings.swapped ? pair.before : pair.after
            const leftCaption = toolSettings.swapped ? 'After' : 'Before'
            const rightCaption = toolSettings.swapped ? 'Before' : 'After'
            const leftLayer: CompareAdjustLayer = toolSettings.swapped ? 'after' : 'before'
            const rightLayer: CompareAdjustLayer = toolSettings.swapped ? 'before' : 'after'

            const toolsProps = {
              settings: toolSettings,
              onChange: updateTools,
              onResetAll: handleResetAll,
              onResetSlider: () => setSliderResetToken((value) => value + 1),
              onDone: handleDone,
              beforeUrl,
              afterUrl,
              beforeBgRemoved: Boolean(beforeDisplayUrl),
              afterBgRemoved: Boolean(afterDisplayUrl),
              removingLayer,
              onRemoveBackground: handleRemoveBackground,
              onRestoreBackground: handleRestoreBackground,
              hasSavedEdits,
            }

            if (viewMode === 'slider') {
              return (
                <div className="max-w-lg mx-auto space-y-4">
                  <ComparePhotoTools {...toolsProps} showOverlayControls />
                  <BeforeAfterSlider
                    beforeUrl={beforeUrl}
                    afterUrl={afterUrl}
                    beforeDisplayUrl={beforeDisplayUrl}
                    afterDisplayUrl={afterDisplayUrl}
                    beforeLabel={`Before · ${formatPhotoDate(pair.before.date)}`}
                    afterLabel={`After · ${formatPhotoDate(pair.after.date)}`}
                    settings={toolSettings}
                    onSettingsChange={updateTools}
                    resetToken={sliderResetToken}
                    removingLayer={removingLayer}
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
                <ComparePhotoTools {...toolsProps} showOverlayControls={false} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SplitPhotoPane
                    photo={leftPhoto}
                    url={leftUrl}
                    displayUrl={leftDisplayUrl}
                    caption={leftCaption}
                    measurement={leftMeasurement}
                    measurementSummary={formatMeasurementSummary(
                      leftMeasurement,
                      heightInches
                    )}
                    layer={leftLayer}
                    settings={toolSettings}
                    onSettingsChange={updateTools}
                    removing={
                      removingLayer === 'both' || removingLayer === leftLayer
                    }
                  />
                  <SplitPhotoPane
                    photo={rightPhoto}
                    url={rightUrl}
                    displayUrl={rightDisplayUrl}
                    caption={rightCaption}
                    measurement={rightMeasurement}
                    measurementSummary={formatMeasurementSummary(
                      rightMeasurement,
                      heightInches
                    )}
                    layer={rightLayer}
                    settings={toolSettings}
                    onSettingsChange={updateTools}
                    removing={
                      removingLayer === 'both' || removingLayer === rightLayer
                    }
                  />
                </div>
              </div>
            )
          })()}
        </>
      )}
    </div>
  )
}
