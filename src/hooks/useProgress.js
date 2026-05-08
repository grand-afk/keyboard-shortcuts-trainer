import { useState, useCallback } from 'react'
import { calculateNextReview, defaultCardState } from '../utils/sm2'
import { getAllShortcuts } from '../data/index'

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
   * Export ALL progress + overrides + shortcuts as a JSON blob the user can save.
   * Shortcuts map lets the full deck definition travel with the backup.
   */
  const exportData = useCallback(() => {
    try {
      const overridesRaw = localStorage.getItem('keydeck:overrides')
      const allShortcuts = getAllShortcuts()
      const shortcutsMap = {}
      allShortcuts.forEach((s) => {
        if (s.win || s.mac) {
          shortcutsMap[s.id] = { win: s.win || '', mac: s.mac || '' }
        }
      })
      const payload = {
        exportedAt: new Date().toISOString(),
        progress,
        overrides: overridesRaw ? JSON.parse(overridesRaw) : {},
        shortcuts: shortcutsMap,
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `keydeck-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Export failed', e)
    }
  }, [progress])

  /**
   * Import a previously exported JSON file.
   * Merges (or replaces) progress, overrides, and shortcuts.
   *
   * Merge strategy for shortcuts: imported shortcut wins unless the user
   * already has a local keydeck:overrides entry for that card.
   * Explicit overrides always win over shortcuts.
   */
  const importData = useCallback((jsonText, mode = 'merge') => {
    try {
      const payload = JSON.parse(jsonText)

      // Progress
      setProgress((prev) => {
        const newProgress = mode === 'replace'
          ? payload.progress
          : { ...prev, ...payload.progress }
        saveProgress(newProgress)
        return newProgress
      })

      // Overrides + shortcuts
      const existingRaw = localStorage.getItem('keydeck:overrides')
      const existing = existingRaw ? JSON.parse(existingRaw) : {}

      // Start from existing (merge) or empty (replace)
      let merged = mode === 'replace' ? {} : { ...existing }

      // Apply shortcuts at lower priority — only fill gaps
      if (payload.shortcuts && typeof payload.shortcuts === 'object') {
        Object.entries(payload.shortcuts).forEach(([id, combo]) => {
          if (!merged[id]) {
            const { win, mac } = typeof combo === 'object' ? combo : { win: combo, mac: '' }
            if (win || mac) merged[id] = { win: win || '', mac: mac || '' }
          }
        })
      }

      // Apply explicit overrides at higher priority — always win
      if (payload.overrides && typeof payload.overrides === 'object') {
        merged = { ...merged, ...payload.overrides }
      }

      localStorage.setItem('keydeck:overrides', JSON.stringify(merged))
      return true
    } catch (e) {
      console.error('Import failed', e)
      return false
    }
  }, [])

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
