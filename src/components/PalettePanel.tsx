import { useEffect, useState, type Dispatch } from 'react'
import { useTranslation } from 'react-i18next'
import { Wand2 } from 'lucide-react'
import type { PatternProject } from '../lib/types'
import type { ProjectAction } from '../lib/projectReducer'
import { FABRIC_COUNTS, computePhysicalSize, formatPhysicalSize, type SizeUnit } from '../lib/physicalSize'
import { estimateThreadUsage } from '../lib/threadEstimate'
import { confirmDestructiveEdit } from '../lib/confirmDestructive'
import { ALPHA_BACKGROUND_THRESHOLD } from '../lib/backgroundMask'
import posthog from '../lib/posthog'

interface Props {
  project: PatternProject
  dispatch: Dispatch<ProjectAction>
  sizeUnit: SizeUnit
}

/** Rebuilding the palette for a new target re-clusters every color in the image, which can take a
 * noticeable moment on a busy photo - debouncing keeps that off the critical path of every
 * keystroke, firing once typing actually pauses. */
const TARGET_COLOR_COUNT_DEBOUNCE_MS = 400

export function PalettePanel({ project, dispatch, sizeUnit }: Props) {
  const { t } = useTranslation()
  const grid = project.confirmedGrid!
  const size = computePhysicalSize(grid.cols, grid.rows, project.fabricCount)
  const threadEstimates = project.palette ? estimateThreadUsage(project.palette, project.fabricCount, project.strands) : []
  const totalSkeins = threadEstimates.reduce((sum, e) => sum + e.skeins, 0)
  const hasInventory = project.ownedThreadCodes.length > 0
  const notOwnedCount = project.palette?.filter((p) => !p.owned).length ?? 0
  const backgroundIsTransparent = (project.backgroundColor?.a ?? 255) < ALPHA_BACKGROUND_THRESHOLD

  // Local draft so every keystroke updates the field instantly, independent of the debounced
  // dispatch below - re-synced whenever the project's actual value changes from elsewhere (the
  // reset-to-auto button, a fresh image/grid/crop resample, undo, an imported project, ...).
  const [targetDraft, setTargetDraft] = useState(project.targetColorCount == null ? '' : String(project.targetColorCount))
  useEffect(() => {
    setTargetDraft(project.targetColorCount == null ? '' : String(project.targetColorCount))
  }, [project.targetColorCount])

  useEffect(() => {
    const parsed = targetDraft === '' ? null : Math.max(1, Math.round(Number(targetDraft)))
    if (parsed !== null && !Number.isFinite(parsed)) return
    if (parsed === project.targetColorCount) return
    const handle = setTimeout(() => {
      if (!confirmDestructiveEdit(project.history.past.length)) {
        // Cancelled - snap the field back to what's actually in effect instead of leaving it
        // showing a value that was never applied.
        setTargetDraft(project.targetColorCount == null ? '' : String(project.targetColorCount))
        return
      }
      dispatch({ type: 'SET_TARGET_COLOR_COUNT', targetColorCount: parsed })
      posthog?.capture('target_color_count_set', { target_color_count: parsed })
    }, TARGET_COLOR_COUNT_DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [targetDraft, project.targetColorCount, project.history.past.length, dispatch])

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <h2 className="text-sm font-semibold text-neutral-100">{t('palettePanel.title')}</h2>

      <label className="flex flex-col gap-1 text-sm text-neutral-300">
        {t('palettePanel.targetColorCount')}
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            step={1}
            placeholder={t('palettePanel.targetColorCountAuto', { count: project.palette?.length ?? 0 })}
            value={targetDraft}
            onChange={(e) => setTargetDraft(e.target.value)}
            className="w-full rounded-md border border-neutral-600 bg-neutral-900 px-2 py-1 text-neutral-100 placeholder:text-neutral-500"
          />
          {targetDraft !== '' && (
            <button
              type="button"
              title={t('palettePanel.targetColorCountReset')}
              onClick={() => setTargetDraft('')}
              className="shrink-0 rounded-md border border-neutral-600 p-1.5 text-neutral-300 hover:bg-neutral-800"
            >
              <Wand2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </label>

      {project.backgroundColor && (
        <label className="flex items-center gap-2 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={project.ignoreBackground}
            onChange={(e) => {
              if (!confirmDestructiveEdit(project.history.past.length)) return
              dispatch({ type: 'SET_IGNORE_BACKGROUND', ignore: e.target.checked })
              posthog?.capture('ignore_background_toggled', { ignore: e.target.checked })
            }}
            className="h-4 w-4 accent-indigo-500"
          />
          {backgroundIsTransparent ? (
            <span
              className="h-4 w-4 shrink-0 rounded-sm border border-black/20 bg-[repeating-conic-gradient(#3f3f46_0%_25%,#27272a_0%_50%)] bg-size-[6px_6px]"
              title={t('common.transparent')}
            />
          ) : (
            <span
              className="h-4 w-4 shrink-0 rounded-sm border border-black/20"
              style={{
                backgroundColor: `rgb(${project.backgroundColor.r}, ${project.backgroundColor.g}, ${project.backgroundColor.b})`,
              }}
            />
          )}
          {backgroundIsTransparent ? t('palettePanel.ignoreTransparentBackground') : t('palettePanel.ignoreBackgroundColor')}
        </label>
      )}

      <label className="flex flex-col gap-1 text-sm text-neutral-300">
        {t('palettePanel.colorsToUse')}
        <select
          value={project.paletteMode}
          onChange={(e) => {
            if (!confirmDestructiveEdit(project.history.past.length)) return
            dispatch({ type: 'SET_PALETTE_MODE', mode: e.target.value as 'best' | 'ownedOnly' })
            posthog?.capture('palette_mode_changed', { mode: e.target.value })
          }}
          className="rounded-md border border-neutral-600 bg-neutral-900 px-2 py-1 text-neutral-100"
        >
          <option value="best">{t('palettePanel.bestMatch')}</option>
          <option value="ownedOnly">{t('palettePanel.ownedOnlyMode')}</option>
        </select>
        {project.paletteMode === 'ownedOnly' && !hasInventory && (
          <span className="text-xs text-amber-400">{t('palettePanel.noInventoryWarning')}</span>
        )}
      </label>

      <label className="flex flex-col gap-1 text-sm text-neutral-300">
        {t('palettePanel.fabricCount')}
        <select
          value={project.fabricCount}
          onChange={(e) => dispatch({ type: 'SET_FABRIC_COUNT', stitchesPerInch: Number(e.target.value) })}
          className="rounded-md border border-neutral-600 bg-neutral-900 px-2 py-1 text-neutral-100"
        >
          {FABRIC_COUNTS.map((fc) => (
            <option key={fc.stitchesPerInch} value={fc.stitchesPerInch}>
              {t(`fabricCounts.${fc.labelKey}`)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-neutral-300">
        {t('palettePanel.strands')}
        <select
          value={project.strands}
          onChange={(e) => dispatch({ type: 'SET_STRANDS', strands: Number(e.target.value) })}
          className="rounded-md border border-neutral-600 bg-neutral-900 px-2 py-1 text-neutral-100"
        >
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {t('palettePanel.strandCount', { count: n })}
            </option>
          ))}
        </select>
      </label>

      <div className="border-t border-neutral-800 pt-4">
        <h3 className="mb-2 text-sm font-semibold text-neutral-100">{t('palettePanel.stats')}</h3>
        <dl className="flex flex-col gap-1.5 text-sm text-neutral-300">
          <div className="flex justify-between gap-2">
            <dt className="text-neutral-500">{t('palettePanel.dimensions')}</dt>
            <dd>{t('palettePanel.stitchesDimension', { cols: grid.cols, rows: grid.rows })}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-neutral-500">{t('palettePanel.approxSize')}</dt>
            <dd>{formatPhysicalSize(size, sizeUnit)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-neutral-500">{t('common.colors')}</dt>
            <dd>{threadEstimates.length}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-neutral-500">{t('palettePanel.threadNeeded')}</dt>
            <dd>{t('palettePanel.skeins', { count: totalSkeins })}</dd>
          </div>
          {hasInventory && (
            <div className="flex justify-between gap-2">
              <dt className="text-neutral-500">{t('palettePanel.needToBuy')}</dt>
              <dd>{t('common.colorsCount', { count: notOwnedCount })}</dd>
            </div>
          )}
        </dl>
        <p className="mt-2 text-xs text-neutral-500">{t('palettePanel.estimateNote')}</p>
      </div>
    </div>
  )
}
