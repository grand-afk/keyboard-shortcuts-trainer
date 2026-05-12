import { useState, useCallback } from 'react'
import { calculateNextReview, defaultCardState } from '../utils/sm2'
import { getAllShortcuts } from '../data/index'
import { buildExportPayload, applyImport } from '../utils/backup'

const STORAGE_KEY = 'keydeck:progress'

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveProgress(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.warn('Could not save progress to localStorage', e)
  }
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

/**
 * Manages SM-2 card state for every shortcut.
 * Progress is persisted to localStorage under the key "keydeck:progress".
 *
 * Each card entry may include:
 *   { repetitions, interval, easeFactor, nextReview,   ← SM-2 fields
 *     favourite: bool,                                  ← starred by user
 *     needsEdit: bool }                                 ← flagged for correction
 */
export function useProgress() {
  const [progress, setProgress] = useState(() => loadProgress())

  /** Get SM-2 state for a single shortcut ID. */
  const getCard = useCallback(
    (id) => progress[id] || defaultCardState(),
    [progress],
  )

  /** Record a rating (1/3/4/5) for a shortcut and advance its SM-2 state. */
  const rateCard = useCallback(
    (id, quality) => {
      setProgress((prev) => {
        const current = prev[id] || defaultCardState()
        const updated = { ...prev, [id]: calculateNextReview(current, quality) }
        saveProgress(updated)
        return updated
      })
    },
    [],
  )

  /** Toggle the ⭐ favourite flag on a shortcut. */
  const toggleFavourite = useCallback((id) => {
    setProgress((prev) => {
      const current = prev[id] || defaultCardState()
      const updated = { ...prev, [id]: { ...current, favourite: !current.favourite } }
      saveProgress(updated)
      return updated
    })
  }, [])

  /** Toggle the 🚩 needs-edit flag on a shortcut. */
  const toggleNeedsEdit = useCallback((id) => {
    setProgress((prev) => {
      const current = prev[id] || defaultCardState()
      const updated = { ...prev, [id]: { ...current, needsEdit: !current.needsEdit } }
      saveProgress(updated)
      return updated
    })
  }, [])

  /** Reset all progress for a specific app (or all apps if appId is undefined). */
  const resetProgress = useCallback(
    (appId, allShortcuts) => {
      setProgress((prev) => {
        let updated
        if (!appId) {
          updated = {}
        } else {
          updated = { ...prev }
          allShortcuts
            .filter((s) => s.app === appId)
            .forEach((s) => delete updated[s.id])
        }
        saveProgress(updated)
        return updated
      })
    },
    [],
  )

  /** Summary counts — useful for stats display. */
  const getStats = useCallback(
    (shortcuts) => {
      const now = new Date()
      let newCards = 0, learning = 0, review = 0, due = 0

      shortcuts.forEach((s) => {
        const card = progress[s.id]
        if (!card || card.repetitions === 0) {
          newCards++
          due++
        } else {
          if (card.interval < 7) learning++
          else review++
          if (new Date(card.nextReview) <= now) due++
        }
      })

      return { newCards, learning, review, due, total: shortcuts.length }
    },
    [progress],
  )

  /**
   * Export ALL progress + overrides + shortcuts + custom as a JSON blob the user can save.
   * Shortcuts include full card attributes (action, cat, win, mac, priority, app) for
   * complete deck portability across browsers.
   */
  const exportData = useCallback(() => {
    try {
      const overrides       = readJSON('keydeck:overrides', {})
      const customShortcuts = readJSON('keydeck:custom', [])
      const allShortcuts    = getAllShortcuts()

      const payload = buildExportPayload(progress, allShortcuts, overrides, customShortcuts)

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `keydeck-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Export failed', e)
    }
  }, [progress])

  /**
   * Import a previously exported JSON file.
   *
   * Merge strategy:
   *   progress  — imported card wins per ID; full replace in 'replace' mode
   *   shortcuts — imported combo fills gaps UNLESS a local override already exists
   *   overrides — imported explicit overrides always win
   *   custom    — union of existing + imported (no duplicate IDs); replace in 'replace' mode
   *
   * Returns true on success, false on parse/apply error.
   */
  const importData = useCallback((jsonText, mode = 'merge') => {
    try {
      const payload = JSON.parse(jsonText)

      const existing = {
        progress:        progress,
        overrides:       readJSON('keydeck:overrides', {}),
        customShortcuts: readJSON('keydeck:custom', []),
      }

      const result = applyImport(payload, existing, mode)

      // Write progress to React state + localStorage
      setProgress(() => {
        saveProgress(result.progress)
        return result.progress
      })

      // Write overrides + custom shortcuts directly to localStorage.
      // The next render of getShortcuts() will pick up the new custom shortcuts
      // automatically since it reads keydeck:custom fresh on each call.
      localStorage.setItem('keydeck:overrides', JSON.stringify(result.overrides))
      localStorage.setItem('keydeck:custom', JSON.stringify(result.customShortcuts))

      return true
    } catch (e) {
      console.error('Import failed', e)
      return false
    }
  }, [progress])

  return {
    progress,
    getCard,
    rateCard,
    resetProgress,
    getStats,
    toggleFavourite,
    toggleNeedsEdit,
    exportData,
    importData,
  }
}
