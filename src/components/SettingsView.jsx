import { useState, useEffect } from 'react'
import { APPS } from '../data/index'
import AppIcon from './AppIcon'

// Letters reserved for system-level shortcuts — cannot be assigned to app chips
// A = All filter, M = Mac platform, W = Win platform
const RESERVED_KEYS  = new Set(['A', 'M', 'W'])
const RESERVED_LABEL = 'A (All), M (Mac), W (Win)'

const SYS_SHORTCUTS = [
  { name: 'add',        label: '+ Add shortcut',    defaultKey: '+' },
  { name: 'favourites', label: '⭐ Favourites filter', defaultKey: 'F' },
  { name: 'search',     label: '🔍 Search',           defaultKey: '/' },
]

function SysKeyRow({ name, label, defaultKey, currentKey, onChange }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal]         = useState(currentKey ?? defaultKey)
  const isCustom = currentKey != null && currentKey !== defaultKey

  function save() {
    const k = val.trim()
    if (k) { onChange(name, k === defaultKey ? null : k) }
    setEditing(false)
  }

  return (
    <div className="key-remap-row">
      <span className="key-remap-label">{label}</span>
      {editing ? (
        <>
          <input
            className="sys-key-input"
            maxLength={2}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save()
              if (e.key === 'Escape') setEditing(false)
            }}
            autoFocus
          />
          <button className="key-remap-btn" onClick={save} title="Confirm">✓</button>
          <button className="key-remap-reset" onClick={() => setEditing(false)} title="Cancel">✕</button>
        </>
      ) : (
        <>
          <button
            className={`key-remap-btn${isCustom ? ' key-remap-btn--custom' : ''}`}
            onClick={() => { setVal(currentKey ?? defaultKey); setEditing(true) }}
            title="Click to reassign"
          >
            {currentKey ?? defaultKey}
          </button>
          {isCustom && (
            <button
              className="key-remap-reset"
              onClick={() => onChange(name, null)}
              title={`Reset to default (${defaultKey})`}
              aria-label="Reset to default"
            >
              ↺
            </button>
          )}
        </>
      )}
    </div>
  )
}

function fmtDate(iso) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium', timeStyle: 'short',
    })
  } catch { return iso }
}

const ALL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export default function SettingsView({
  hiddenApps,
  toggleHideApp,
  platform,
  setPlatform,
  darkMode,
  toggleDarkMode,
  showRateCol,
  toggleRateCol,
  keyOverrides = {},
  setKeyOverride,
  resetKeyOverride,
  sysKeyOverrides = {},
  setSysKeyOverride,
  backupMeta = {},
}) {
  // Custom (Bookmarks) shortcuts are managed via Add Shortcut — exclude from grids
  const filterableApps = APPS.filter((a) => a.id !== 'custom')
  const visibleCount   = filterableApps.length - hiddenApps.length

  // ── Key remapping state ─────────────────────────────────────────────────
  const [remappingId, setRemappingId] = useState(null)

  // Keyboard shortcut for the picker: pressing a letter while grid is open assigns it
  useEffect(() => {
    if (!remappingId) return

    function handleKey(e) {
      e.preventDefault()
      e.stopPropagation()
      const key = e.key.toUpperCase()

      if (e.key === 'Escape') { setRemappingId(null); return }
      if (!/^[A-Z]$/.test(key)) return
      if (RESERVED_KEYS.has(key)) return   // silently ignore; grid cell is also disabled

      setKeyOverride(remappingId, key)
      setRemappingId(null)
    }

    window.addEventListener('keydown', handleKey, { capture: true })
    return () => window.removeEventListener('keydown', handleKey, { capture: true })
  }, [remappingId, setKeyOverride])

  return (
    <div className="settings-view">
      <h2 className="settings-title">⚙️ Settings</h2>

      {/* ── App visibility ─────────────────────────────────────── */}
      <section className="settings-section">
        <div className="settings-section-header">
          <div>
            <h3 className="settings-section-title">Apps</h3>
            <p className="settings-hint">
              Hide apps you don't use to keep the filter bar tidy.
              Hidden apps won't appear in the filter bar, Shortcuts, Practise or Discover.{' '}
              {hiddenApps.length > 0
                ? `${visibleCount} of ${filterableApps.length} shown.`
                : 'All apps shown.'}
            </p>
          </div>
          {hiddenApps.length > 0 && (
            <button
              className="btn-secondary"
              onClick={() => hiddenApps.forEach((id) => toggleHideApp(id))}
            >
              Show all
            </button>
          )}
        </div>

        <div className="settings-app-grid">
          {filterableApps.map((app) => {
            const hidden = hiddenApps.includes(app.id)
            return (
              <button
                key={app.id}
                className={`settings-app-card ${hidden ? 'settings-app-card--hidden' : 'settings-app-card--visible'}`}
                onClick={() => toggleHideApp(app.id)}
                title={hidden ? `Show ${app.label} in filter bar` : `Hide ${app.label} from filter bar`}
              >
                <AppIcon app={app} size={28} />
                <span className="settings-app-name">{app.label}</span>
                <span className="settings-app-status">{hidden ? 'Hidden' : 'Visible'}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* ── App keyboard shortcuts ─────────────────────────────── */}
      <section className="settings-section">
        <h3 className="settings-section-title">App keyboard shortcuts</h3>
        <p className="settings-hint">
          Each filter chip has a keyboard shortcut. Single letters toggle that app instantly;
          shortcuts starting with <kbd style={{ fontSize: '0.75rem' }}>0</kbd> use a two-key sequence
          (press <kbd style={{ fontSize: '0.75rem' }}>0</kbd> then the letter).
          Click a badge to reassign it — the picker shows which letters are free.
          Reserved: {RESERVED_LABEL}.
        </p>

        {/* Per-app key rows */}
        <div className="key-remap-grid">
          {filterableApps.map((app) => {
            const defaultKey   = app.key || ''
            const effectiveKey = keyOverrides[app.id] !== undefined
              ? keyOverrides[app.id]
              : defaultKey
            const isCustom     = keyOverrides[app.id] !== undefined
            const isOpen       = remappingId === app.id

            return (
              <div key={app.id} className="key-remap-row">
                <AppIcon app={app} size={18} />
                <span className="key-remap-label">{app.label}</span>

                <button
                  className={[
                    'key-remap-btn',
                    isOpen    ? 'key-remap-btn--listening' : '',
                    isCustom && !isOpen ? 'key-remap-btn--custom' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={(e) => {
                    e.stopPropagation()
                    setRemappingId(isOpen ? null : app.id)
                  }}
                  title={isOpen ? 'Pick a letter below (Esc to cancel)' : `${effectiveKey || '—'} · Click to remap`}
                >
                  {effectiveKey || '—'}
                </button>

                {isCustom && !isOpen && (
                  <button
                    className="key-remap-reset"
                    onClick={(e) => { e.stopPropagation(); resetKeyOverride(app.id) }}
                    title={`Reset to default (${defaultKey || 'none'})`}
                    aria-label="Reset to default"
                  >
                    ↺
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* A–Z letter picker — appears when a row is open */}
        {remappingId && (() => {
          const remappingApp = filterableApps.find((a) => a.id === remappingId)
          return (
            <div className="key-picker">
              <div className="key-picker-header">
                <span>Pick a key for <strong>{remappingApp?.label}</strong></span>
                <button className="key-picker-close" onClick={() => setRemappingId(null)} aria-label="Cancel">✕</button>
              </div>
              <div className="key-picker-grid">
                {ALL_LETTERS.map((letter) => {
                  const isReserved = RESERVED_KEYS.has(letter)
                  // Which app currently holds this single letter (override or default)?
                  const takenBy = filterableApps.find((a) => {
                    if (a.id === remappingId) return false
                    const ek = keyOverrides[a.id] !== undefined ? keyOverrides[a.id] : (a.key || '')
                    return ek === letter   // single-char match only
                  })
                  const isFree = !isReserved && !takenBy

                  return (
                    <button
                      key={letter}
                      className={[
                        'key-picker-cell',
                        isReserved ? 'key-picker-cell--reserved' : '',
                        takenBy    ? 'key-picker-cell--taken'    : '',
                        isFree     ? 'key-picker-cell--free'     : '',
                      ].filter(Boolean).join(' ')}
                      disabled={isReserved}
                      onClick={(e) => {
                        e.stopPropagation()
                        setKeyOverride(remappingId, letter)
                        setRemappingId(null)
                      }}
                      title={
                        isReserved ? `Reserved system key`
                        : takenBy  ? `Steal from ${takenBy.label}`
                        : `Assign ${letter}`
                      }
                    >
                      <span className="key-picker-letter">{letter}</span>
                      <span className="key-picker-sub">
                        {isReserved ? 'system' : takenBy ? takenBy.label.slice(0, 6) : 'free'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })()}
      </section>

      {/* ── System shortcuts ──────────────────────────────────── */}
      <section className="settings-section">
        <h3 className="settings-section-title">System shortcuts</h3>
        <p className="settings-hint">
          Click a key badge to reassign it. Press the new key and hit Enter, or Escape to cancel.
        </p>
        <div className="key-remap-grid">
          {SYS_SHORTCUTS.map(({ name, label, defaultKey }) => (
            <SysKeyRow
              key={name}
              name={name}
              label={label}
              defaultKey={defaultKey}
              currentKey={sysKeyOverrides[name] ?? null}
              onChange={setSysKeyOverride}
            />
          ))}
        </div>
      </section>

      {/* ── Preferences ───────────────────────────────────────── */}
      <section className="settings-section">
        <h3 className="settings-section-title">Preferences</h3>

        <div className="settings-prefs">

          <div className="settings-pref-row">
            <div className="settings-pref-text">
              <span className="settings-pref-label">Platform</span>
              <span className="settings-pref-desc">Which keyboard shortcuts to show by default</span>
            </div>
            <div className="platform-toggle">
              <button
                className={`platform-btn ${platform === 'mac' ? 'platform-btn--active' : ''}`}
                onClick={() => setPlatform('mac')}
              >
                <img
                  src="https://www.google.com/s2/favicons?domain=apple.com&sz=64"
                  alt=""
                  className="platform-icon"
                />
                macOS <kbd className="kbd-hint">M</kbd>
              </button>
              <button
                className={`platform-btn ${platform === 'win' ? 'platform-btn--active' : ''}`}
                onClick={() => setPlatform('win')}
              >
                <img
                  src="https://www.google.com/s2/favicons?domain=microsoft.com&sz=64"
                  alt=""
                  className="platform-icon"
                />
                Windows <kbd className="kbd-hint">W</kbd>
              </button>
            </div>
          </div>

          <div className="settings-pref-row">
            <div className="settings-pref-text">
              <span className="settings-pref-label">Theme</span>
              <span className="settings-pref-desc">Toggle between dark and light mode</span>
            </div>
            <button className="settings-toggle-btn" onClick={toggleDarkMode}>
              {darkMode ? '🌙 Dark' : '☀️ Light'}
            </button>
          </div>

          <div className="settings-pref-row">
            <div className="settings-pref-text">
              <span className="settings-pref-label">Rate column</span>
              <span className="settings-pref-desc">Show or hide rating buttons in the Shortcuts table</span>
            </div>
            <button className="settings-toggle-btn" onClick={toggleRateCol}>
              {showRateCol ? '✅ Visible' : '⬜ Hidden'}
            </button>
          </div>

        </div>
      </section>

      {/* ── Backup ────────────────────────────────────────────── */}
      <section className="settings-section">
        <h3 className="settings-section-title">Backup</h3>
        <p className="settings-hint">
          Use ⬇️ to export and ⬆️ to import in the toolbar. Importing always <strong>merges</strong> —
          imported data fills in gaps without overwriting local progress or favourites.
        </p>
        <div className="settings-prefs">
          <div className="settings-pref-row">
            <div className="settings-pref-text">
              <span className="settings-pref-label">Last exported</span>
              <span className="settings-pref-desc">
                {backupMeta.lastExport
                  ? `${backupMeta.lastExport.filename} · ${fmtDate(backupMeta.lastExport.timestamp)}`
                  : 'Never'}
              </span>
            </div>
          </div>
          <div className="settings-pref-row">
            <div className="settings-pref-text">
              <span className="settings-pref-label">Last imported</span>
              <span className="settings-pref-desc">
                {backupMeta.lastImport
                  ? `${backupMeta.lastImport.filename} · ${fmtDate(backupMeta.lastImport.timestamp)}`
                  : 'Never'}
              </span>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
