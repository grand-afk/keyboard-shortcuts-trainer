import { useState, useCallback, useEffect } from 'react'
import { APPS } from '../data/index'

const SETTINGS_KEY = 'keydeck:settings'

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveSettings(data) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(data))
  } catch (e) {
    console.warn('Could not save settings', e)
  }
}

// ── URL sync for platform — ?p=mac or ?p=win ───────────────────────────────
function getPlatformFromUrl() {
  try {
    return new URLSearchParams(window.location.search).get('p') || null
  } catch { return null }
}

function setPlatformInUrl(p) {
  try {
    const url = new URL(window.location.href)
    url.searchParams.set('p', p)
    window.history.replaceState({}, '', url.toString())
  } catch {}
}

export function useSettings() {
  const [settings, setSettings] = useState(() => {
    const saved = loadSettings()
    const urlPlatform = getPlatformFromUrl()
    if (urlPlatform === 'mac' || urlPlatform === 'win') saved.platform = urlPlatform
    return saved
  })

  const update = useCallback((patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      saveSettings(next)
      return next
    })
  }, [])

  const platform       = settings.platform       ?? 'mac'
  const selectedApps   = settings.selectedApps   ?? []
  const hiddenApps     = settings.hiddenApps      ?? []
  const showFavourites = settings.showFavourites  ?? false
  const darkMode       = settings.darkMode        ?? true   // default: dark
  const showRateCol    = settings.showRateCol     ?? true   // default: visible
  const keyOverrides   = settings.keyOverrides    ?? {}     // { appId: 'X' | '' }
  const sysKeyOverrides = settings.sysKeyOverrides ?? {}    // { add, favourites, search }
  const backupMeta     = settings.backupMeta      ?? {}     // { lastExport, lastImport }

  // Keep URL param in sync
  useEffect(() => { setPlatformInUrl(platform) }, [platform])

  const setPlatform = useCallback((p) => update({ platform: p }), [update])

  // Use functional setSettings to avoid stale-closure bugs on mobile (iOS touch events
  // can fire callbacks before React has flushed the previous state update).
  const toggleApp = useCallback((appId) => {
    setSettings((prev) => {
      const current = prev.selectedApps ?? []
      const next = {
        ...prev,
        selectedApps: current.includes(appId)
          ? current.filter((a) => a !== appId)
          : [...current, appId],
      }
      saveSettings(next)
      return next
    })
  }, []) // stable — no closure over selectedApps needed

  const setSelectedApps = useCallback((apps) => {
    setSettings((prev) => {
      const next = { ...prev, selectedApps: apps }
      saveSettings(next)
      return next
    })
  }, []) // stable

  // toggleHideApp: permanently remove/restore an app from the chip row + shortcuts.
  // Also removes the app from selectedApps so a hidden app can never be an active filter.
  const toggleHideApp = useCallback((appId) => {
    setSettings((prev) => {
      const hidden   = prev.hiddenApps   ?? []
      const selected = prev.selectedApps ?? []
      const newHidden   = hidden.includes(appId) ? hidden.filter((a) => a !== appId) : [...hidden, appId]
      const newSelected = selected.filter((a) => !newHidden.includes(a))
      const next = { ...prev, hiddenApps: newHidden, selectedApps: newSelected }
      saveSettings(next)
      return next
    })
  }, []) // stable

  const toggleShowFavourites = useCallback(
    () => update({ showFavourites: !showFavourites }),
    [showFavourites, update],
  )

  const toggleDarkMode = useCallback(
    () => update({ darkMode: !darkMode }),
    [darkMode, update],
  )

  const toggleRateCol = useCallback(
    () => update({ showRateCol: !showRateCol }),
    [showRateCol, update],
  )

  // ── Key overrides ─────────────────────────────────────────────────────────
  // keyOverrides maps appId → single uppercase letter ('' means no shortcut).
  // Missing key = use the APPS default.

  /** Set a custom key for an app.  Pass '' to remove the shortcut entirely. */
  const setKeyOverride = useCallback((appId, key) => {
    const upper = (key || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 1)
    const next = { ...keyOverrides }
    if (upper) {
      // Steal the key from whichever other app currently holds it
      APPS.forEach((a) => {
        if (a.id === appId) return
        const effective = next[a.id] !== undefined ? next[a.id] : (a.key || '')
        if (effective.toUpperCase() === upper) next[a.id] = ''
      })
    }
    next[appId] = upper  // '' = no shortcut, letter = custom key
    update({ keyOverrides: next })
  }, [keyOverrides, update])

  /** Set or clear a system shortcut key. Pass null to reset to default. */
  const setSysKeyOverride = useCallback((name, key) => {
    const next = { ...sysKeyOverrides }
    if (key === null || key === undefined) {
      delete next[name]
    } else {
      next[name] = key
    }
    update({ sysKeyOverrides: next })
  }, [sysKeyOverrides, update])

  /** Record last export or import metadata. */
  const setBackupMeta = useCallback((patch) => {
    update({ backupMeta: { ...backupMeta, ...patch } })
  }, [backupMeta, update])

  /** Remove override and revert to the APPS default key. */
  const resetKeyOverride = useCallback((appId) => {
    const next = { ...keyOverrides }
    const defaultKey = (APPS.find((a) => a.id === appId)?.key || '').toUpperCase()
    delete next[appId]
    // If reverting would create a conflict, clear the other app's key
    if (defaultKey) {
      APPS.forEach((a) => {
        if (a.id === appId) return
        const effective = next[a.id] !== undefined ? next[a.id] : (a.key || '')
        if (effective.toUpperCase() === defaultKey) next[a.id] = ''
      })
    }
    update({ keyOverrides: next })
  }, [keyOverrides, update])

  return {
    platform, setPlatform,
    selectedApps, toggleApp, setSelectedApps,
    hiddenApps, toggleHideApp,
    showFavourites, toggleShowFavourites,
    darkMode, toggleDarkMode,
    showRateCol, toggleRateCol,
    keyOverrides, setKeyOverride, resetKeyOverride,
    sysKeyOverrides, setSysKeyOverride,
    backupMeta, setBackupMeta,
  }
}
