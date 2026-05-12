import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { buildExportPayload, applyImport, BACKUP_VERSION } from './backup'

// ─── Fixtures ──────────────────────────────────────────────────────────────

const makeShortcut = (overrides = {}) => ({
  id:       'ob-bold',
  action:   'Bold',
  cat:      'Editor',
  win:      'Ctrl + B',
  mac:      '⌘B',
  priority: 1,
  app:      'obsidian',
  ...overrides,
})

const makeProgress = (overrides = {}) => ({
  repetitions: 3,
  interval:    6,
  easeFactor:  2.5,
  nextReview:  '2026-06-01T00:00:00.000Z',
  lastQuality: 4,
  lastReviewed:'2026-05-01T00:00:00.000Z',
  favourite:   false,
  needsEdit:   false,
  ...overrides,
})

// ─── buildExportPayload ────────────────────────────────────────────────────

describe('buildExportPayload', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-12T10:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('sets exportedAt to current ISO timestamp', () => {
    const payload = buildExportPayload({}, [], {}, [])
    expect(payload.exportedAt).toBe('2026-05-12T10:00:00.000Z')
  })

  it('sets version to BACKUP_VERSION', () => {
    const payload = buildExportPayload({}, [], {}, [])
    expect(payload.version).toBe(BACKUP_VERSION)
  })

  it('includes full card attributes in shortcuts', () => {
    const s = makeShortcut()
    const payload = buildExportPayload({}, [s], {}, [])
    expect(payload.shortcuts['ob-bold']).toEqual({
      action:   'Bold',
      cat:      'Editor',
      win:      'Ctrl + B',
      mac:      '⌘B',
      priority: 1,
      app:      'obsidian',
    })
  })

  it('includes context when present', () => {
    const s = makeShortcut({ context: 'Works in editor mode' })
    const payload = buildExportPayload({}, [s], {}, [])
    expect(payload.shortcuts['ob-bold'].context).toBe('Works in editor mode')
  })

  it('omits context when absent', () => {
    const s = makeShortcut()
    const payload = buildExportPayload({}, [s], {}, [])
    expect(payload.shortcuts['ob-bold']).not.toHaveProperty('context')
  })

  it('excludes shortcuts with no win and no mac', () => {
    const s = makeShortcut({ win: '', mac: '' })
    const payload = buildExportPayload({}, [s], {}, [])
    expect(payload.shortcuts).not.toHaveProperty('ob-bold')
  })

  it('excludes custom shortcuts from the shortcuts map (they go in custom)', () => {
    const builtin = makeShortcut()
    const custom  = makeShortcut({ id: 'custom-123', app: 'custom', win: 'Ctrl + Z' })
    const payload = buildExportPayload({}, [builtin, custom], {}, [custom])
    expect(payload.shortcuts).toHaveProperty('ob-bold')
    expect(payload.shortcuts).not.toHaveProperty('custom-123')
  })

  it('puts custom shortcuts in the custom array', () => {
    const custom  = makeShortcut({ id: 'custom-123', app: 'custom', win: 'Ctrl + Z' })
    const payload = buildExportPayload({}, [custom], {}, [custom])
    expect(payload.custom).toHaveLength(1)
    expect(payload.custom[0].id).toBe('custom-123')
  })

  it('includes progress unchanged', () => {
    const prog = { 'ob-bold': makeProgress({ favourite: true }) }
    const payload = buildExportPayload(prog, [], {}, [])
    expect(payload.progress['ob-bold'].favourite).toBe(true)
    expect(payload.progress['ob-bold'].repetitions).toBe(3)
  })

  it('includes overrides unchanged', () => {
    const overrides = { 'ob-bold': { win: 'Ctrl + Shift + B' } }
    const payload = buildExportPayload({}, [], overrides, [])
    expect(payload.overrides['ob-bold'].win).toBe('Ctrl + Shift + B')
  })

  it('handles empty inputs gracefully', () => {
    const payload = buildExportPayload({}, [], {}, [])
    expect(payload.shortcuts).toEqual({})
    expect(payload.custom).toEqual([])
    expect(payload.progress).toEqual({})
    expect(payload.overrides).toEqual({})
  })

  it('includes all 53 Obsidian shortcuts with Windows combos', async () => {
    // Dynamic import to avoid circular deps / ESM issues in test env
    const obsidian = (await import('../data/obsidian.json', { assert: { type: 'json' } })).default
    const tagged   = obsidian.map((s) => ({ ...s, app: 'obsidian' }))
    const payload  = buildExportPayload({}, tagged, {}, [])
    const ids = Object.keys(payload.shortcuts)
    // All exported entries must have a Windows combo
    ids.forEach((id) => {
      expect(payload.shortcuts[id].win).toBeTruthy()
    })
    // At least 44 Obsidian shortcuts should be present (those with actual combos)
    expect(ids.filter((id) => id.startsWith('ob-')).length).toBeGreaterThanOrEqual(44)
  })
})

// ─── applyImport ──────────────────────────────────────────────────────────

describe('applyImport — input validation', () => {
  it('throws on null payload', () => {
    expect(() => applyImport(null, {})).toThrow()
  })

  it('throws on non-object payload', () => {
    expect(() => applyImport('bad', {})).toThrow()
  })
})

describe('applyImport — progress', () => {
  it('merges imported progress on top of existing (mode=merge)', () => {
    const existing = { progress: { 'ob-bold': makeProgress({ repetitions: 2 }) }, overrides: {}, customShortcuts: [] }
    const payload  = { progress: { 'ob-bold': makeProgress({ repetitions: 5 }), 'ob-italic': makeProgress() } }
    const result   = applyImport(payload, existing, 'merge')
    expect(result.progress['ob-bold'].repetitions).toBe(5)     // imported wins
    expect(result.progress['ob-italic']).toBeTruthy()           // new card added
  })

  it('replaces all progress in replace mode', () => {
    const existing = { progress: { 'ob-bold': makeProgress() }, overrides: {}, customShortcuts: [] }
    const payload  = { progress: { 'ob-italic': makeProgress() } }
    const result   = applyImport(payload, existing, 'replace')
    expect(result.progress).not.toHaveProperty('ob-bold')
    expect(result.progress).toHaveProperty('ob-italic')
  })

  it('handles missing progress key in payload', () => {
    const existing = { progress: { 'ob-bold': makeProgress() }, overrides: {}, customShortcuts: [] }
    const result   = applyImport({}, existing, 'merge')
    expect(result.progress).toHaveProperty('ob-bold')  // kept from existing
  })

  it('preserves favourite flag from imported progress', () => {
    const existing = { progress: {}, overrides: {}, customShortcuts: [] }
    const payload  = { progress: { 'ob-bold': makeProgress({ favourite: true }) } }
    const result   = applyImport(payload, existing, 'merge')
    expect(result.progress['ob-bold'].favourite).toBe(true)
  })
})

describe('applyImport — shortcuts merge strategy', () => {
  it('imports shortcut combo when no local override exists', () => {
    const existing = { progress: {}, overrides: {}, customShortcuts: [] }
    const payload  = { shortcuts: { 'ob-bold': { win: 'Ctrl + B', mac: '⌘B', action: 'Bold', cat: 'Editor' } } }
    const result   = applyImport(payload, existing, 'merge')
    expect(result.overrides['ob-bold'].win).toBe('Ctrl + B')
    expect(result.overrides['ob-bold'].action).toBe('Bold')
  })

  it('skips imported shortcut when a local override already exists (local wins)', () => {
    const existing = {
      progress: {},
      overrides: { 'ob-bold': { win: 'Ctrl + Shift + B' } },
      customShortcuts: [],
    }
    const payload = { shortcuts: { 'ob-bold': { win: 'Ctrl + B' } } }
    const result  = applyImport(payload, existing, 'merge')
    expect(result.overrides['ob-bold'].win).toBe('Ctrl + Shift + B')  // local wins
  })

  it('handles v1 flat-string shortcut format', () => {
    const existing = { progress: {}, overrides: {}, customShortcuts: [] }
    const payload  = { shortcuts: { 'ob-bold': 'Ctrl + B' } }
    const result   = applyImport(payload, existing, 'merge')
    expect(result.overrides['ob-bold'].win).toBe('Ctrl + B')
    expect(result.overrides['ob-bold'].mac).toBeUndefined()
  })

  it('does not create override for empty shortcut entries', () => {
    const existing = { progress: {}, overrides: {}, customShortcuts: [] }
    const payload  = { shortcuts: { 'ob-empty': { win: '', mac: '' } } }
    const result   = applyImport(payload, existing, 'merge')
    expect(result.overrides).not.toHaveProperty('ob-empty')
  })

  it('clears existing overrides on replace mode before applying shortcuts', () => {
    const existing = {
      progress: {},
      overrides: { 'ob-save': { win: 'Ctrl + S' } },
      customShortcuts: [],
    }
    const payload = { shortcuts: { 'ob-bold': { win: 'Ctrl + B' } } }
    const result  = applyImport(payload, existing, 'replace')
    expect(result.overrides).not.toHaveProperty('ob-save')  // existing cleared
    expect(result.overrides).toHaveProperty('ob-bold')
  })
})

describe('applyImport — explicit overrides priority', () => {
  it('imported overrides win over imported shortcuts for the same card', () => {
    const existing = { progress: {}, overrides: {}, customShortcuts: [] }
    const payload  = {
      shortcuts: { 'ob-bold': { win: 'Ctrl + B' } },
      overrides: { 'ob-bold': { win: 'Ctrl + Shift + B' } },
    }
    const result = applyImport(payload, existing, 'merge')
    expect(result.overrides['ob-bold'].win).toBe('Ctrl + Shift + B')
  })

  it('imported overrides win over existing local overrides', () => {
    const existing = {
      progress: {},
      overrides: { 'ob-bold': { win: 'Local override' } },
      customShortcuts: [],
    }
    const payload = { overrides: { 'ob-bold': { win: 'Imported override' } } }
    const result  = applyImport(payload, existing, 'merge')
    expect(result.overrides['ob-bold'].win).toBe('Imported override')
  })
})

describe('applyImport — custom shortcuts', () => {
  it('adds imported custom shortcuts to existing (merge)', () => {
    const existingCustom = [{ id: 'custom-100', action: 'Old', cat: 'X', win: 'Alt + A', app: 'custom' }]
    const existing = { progress: {}, overrides: {}, customShortcuts: existingCustom }
    const payload  = { custom: [{ id: 'custom-200', action: 'New', cat: 'Y', win: 'Alt + B', app: 'custom' }] }
    const result   = applyImport(payload, existing, 'merge')
    expect(result.customShortcuts).toHaveLength(2)
    expect(result.customShortcuts.map((s) => s.id)).toContain('custom-100')
    expect(result.customShortcuts.map((s) => s.id)).toContain('custom-200')
  })

  it('does not duplicate custom shortcuts with the same ID (merge)', () => {
    const custom   = { id: 'custom-100', action: 'Same', cat: 'X', win: 'Alt + A', app: 'custom' }
    const existing = { progress: {}, overrides: {}, customShortcuts: [custom] }
    const payload  = { custom: [custom] }
    const result   = applyImport(payload, existing, 'merge')
    expect(result.customShortcuts).toHaveLength(1)
  })

  it('replaces all custom shortcuts in replace mode', () => {
    const existing = {
      progress: {},
      overrides: {},
      customShortcuts: [{ id: 'custom-100', action: 'Old', app: 'custom' }],
    }
    const payload = { custom: [{ id: 'custom-200', action: 'New', app: 'custom' }] }
    const result  = applyImport(payload, existing, 'replace')
    expect(result.customShortcuts).toHaveLength(1)
    expect(result.customShortcuts[0].id).toBe('custom-200')
  })

  it('handles missing custom key in payload gracefully', () => {
    const existingCustom = [{ id: 'custom-100', action: 'Keep me', app: 'custom' }]
    const existing = { progress: {}, overrides: {}, customShortcuts: existingCustom }
    const result   = applyImport({}, existing, 'merge')
    expect(result.customShortcuts).toHaveLength(1)
  })

  it('handles null/undefined entries in imported custom array', () => {
    const existing = { progress: {}, overrides: {}, customShortcuts: [] }
    const payload  = { custom: [null, undefined, { id: 'custom-1', action: 'OK', app: 'custom' }] }
    const result   = applyImport(payload, existing, 'merge')
    // null/undefined entries have no id, filtered by the `s && s.id` guard
    expect(result.customShortcuts.filter(Boolean)).toHaveLength(1)
  })
})

// ─── Round-trip: build then apply ─────────────────────────────────────────

describe('round-trip: buildExportPayload → applyImport', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-12T10:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('restores progress, overrides, and custom shortcuts intact', () => {
    const shortcuts = [makeShortcut(), makeShortcut({ id: 'ob-italic', action: 'Italic', win: 'Ctrl + I', mac: '⌘I' })]
    const custom    = [{ id: 'custom-1', action: 'Mine', cat: 'X', win: 'Alt + A', app: 'custom' }]
    const prog      = { 'ob-bold': makeProgress({ favourite: true }), 'ob-italic': makeProgress() }
    const overrides = { 'ob-bold': { win: 'Ctrl + Shift + B' } }

    const payload  = buildExportPayload(prog, shortcuts, overrides, custom)
    const existing = { progress: {}, overrides: {}, customShortcuts: [] }
    const result   = applyImport(payload, existing, 'replace')

    // Progress restored
    expect(result.progress['ob-bold'].favourite).toBe(true)
    expect(result.progress['ob-italic'].repetitions).toBe(3)

    // Overrides restored (explicit overrides always win)
    expect(result.overrides['ob-bold'].win).toBe('Ctrl + Shift + B')

    // Custom shortcuts restored
    expect(result.customShortcuts).toHaveLength(1)
    expect(result.customShortcuts[0].id).toBe('custom-1')
  })
})
