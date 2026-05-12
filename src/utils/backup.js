/**
 * Pure functions for building and applying backup payloads.
 * No localStorage or React calls — all state is passed in and returned.
 *
 * Backup JSON schema v2:
 * {
 *   exportedAt: ISO string,
 *   version: 2,
 *   shortcuts: { [cardId]: { action, cat, win, mac, priority, app, ?context } },
 *   custom:    [ { id, action, cat, win, mac, app, ?priority, ?context } ],
 *   progress:  { [cardId]: SM-2 state + favourite + needsEdit },
 *   overrides: { [cardId]: { ?action, ?cat, ?win, ?mac, ?context } }
 * }
 *
 * Merge strategy on import:
 *   progress  — imported card wins per ID (merge) or full replace
 *   shortcuts — imported combo fills the gap UNLESS a local override already exists
 *   overrides — imported explicit overrides always win
 *   custom    — union of existing + imported (no duplicate IDs)
 */

export const BACKUP_VERSION = 2

/**
 * Build an export payload from current app state.
 *
 * @param {object} progress         - SM-2 + favourite + needsEdit per card ID
 * @param {Array}  allShortcuts     - from getAllShortcuts() — built-ins + user customs, overrides applied
 * @param {object} overrides        - keydeck:overrides (user edits)
 * @param {Array}  customShortcuts  - keydeck:custom (user-created shortcuts)
 * @returns {object} exportable payload
 */
export function buildExportPayload(progress, allShortcuts, overrides, customShortcuts = []) {
  const customIds = new Set(customShortcuts.map((s) => s.id))

  const shortcuts = {}
  allShortcuts.forEach((s) => {
    // Custom shortcuts travel in the dedicated `custom` array, not here
    if (customIds.has(s.id)) return
    // Only include built-ins that have at least one key combo defined
    if (!s.win && !s.mac) return

    const entry = {
      action:   s.action   || '',
      cat:      s.cat      || '',
      win:      s.win      || '',
      mac:      s.mac      || '',
      priority: s.priority ?? 2,
      app:      s.app      || 'custom',
    }
    if (s.context) entry.context = s.context
    shortcuts[s.id] = entry
  })

  return {
    exportedAt: new Date().toISOString(),
    version:    BACKUP_VERSION,
    shortcuts,
    custom:     customShortcuts,
    progress,
    overrides,
  }
}

/**
 * Apply an imported backup payload to the current app state.
 * Returns merged { progress, overrides, customShortcuts } — caller writes to storage.
 *
 * @param {object}          payload  - parsed JSON from imported file
 * @param {object}          existing - { progress, overrides, customShortcuts }
 * @param {'merge'|'replace'} mode
 * @returns {{ progress, overrides, customShortcuts }}
 */
export function applyImport(payload, existing, mode = 'merge') {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid backup: expected an object')
  }

  const existingProgress      = existing.progress       || {}
  const existingOverrides     = existing.overrides      || {}
  const existingCustom        = existing.customShortcuts || []

  // ── Progress ────────────────────────────────────────────────────────────────
  const importedProgress = (payload.progress && typeof payload.progress === 'object')
    ? payload.progress
    : {}

  const newProgress = mode === 'replace'
    ? { ...importedProgress }
    : { ...existingProgress, ...importedProgress }

  // ── Overrides + shortcuts merge ──────────────────────────────────────────────
  // Start from existing overrides (merge) or a clean slate (replace)
  let mergedOverrides = mode === 'replace' ? {} : { ...existingOverrides }

  // 1. Imported shortcuts at LOWER priority — only fills gaps where no local override exists
  if (payload.shortcuts && typeof payload.shortcuts === 'object') {
    Object.entries(payload.shortcuts).forEach(([id, data]) => {
      if (mergedOverrides[id]) return   // local override wins, skip

      const src = typeof data === 'string'
        ? { win: data, mac: '' }          // v1-style flat string
        : (data || {})

      const entry = {}
      if (src.win)     entry.win     = src.win
      if (src.mac)     entry.mac     = src.mac
      if (src.action)  entry.action  = src.action
      if (src.cat)     entry.cat     = src.cat
      if (src.context) entry.context = src.context

      if (Object.keys(entry).length > 0) mergedOverrides[id] = entry
    })
  }

  // 2. Imported explicit overrides at HIGHER priority — always win
  if (payload.overrides && typeof payload.overrides === 'object') {
    mergedOverrides = { ...mergedOverrides, ...payload.overrides }
  }

  // ── Custom shortcuts ─────────────────────────────────────────────────────────
  const importedCustom = Array.isArray(payload.custom) ? payload.custom : []

  let newCustom
  if (mode === 'replace') {
    newCustom = importedCustom
  } else {
    // Union: add imported entries not already present by ID
    const existingCustomIds = new Set(existingCustom.map((s) => s.id))
    const toAdd = importedCustom.filter((s) => s && s.id && !existingCustomIds.has(s.id))
    newCustom = [...existingCustom, ...toAdd]
  }

  return {
    progress:        newProgress,
    overrides:       mergedOverrides,
    customShortcuts: newCustom,
  }
}
