import { useRef, useEffect } from 'react'
import { APPS } from '../data/index'
import AppIcon from './AppIcon'

// Official brand icons via Google Favicon API
const APPLE_ICON = 'https://www.google.com/s2/favicons?domain=apple.com&sz=64'
const WIN_ICON   = 'https://www.google.com/s2/favicons?domain=microsoft.com&sz=64'

export default function TopBar({
  platform,
  setPlatform,
  selectedApps,
  toggleApp,
  clearAllApps,
  hiddenApps,
  showFavourites,
  toggleShowFavourites,
  keyOverrides = {},
  pendingPrefix,
  onExport,
  onImport,
  darkMode,
  onToggleDarkMode,
  searchOpen,
  searchQuery,
  onSearchChange,
  onToggleSearch,
  onOpenFlagged,
  onFavouriteFirst,
  sysKeys = { add: '+', favourites: 'F', search: '/' },
}) {
  const importRef = useRef(null)
  const searchRef = useRef(null)

  // Auto-focus the search input when it opens
  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus()
  }, [searchOpen])

  function handleImportFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const ok = onImport(ev.target.result, 'merge', file.name)
      alert(ok ? '✅ Data imported successfully!' : '❌ Import failed — check the file format.')
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // Desktop chip icon and label change with the active platform
  function resolveApp(app) {
    if (app.id === 'windows') {
      return {
        ...app,
        iconUrl: platform === 'mac' ? APPLE_ICON : WIN_ICON,
        icon: null,
        label: platform === 'mac' ? 'macOS' : 'Desktop',
      }
    }
    return app
  }

  return (
    <header className="top-bar">
      {/* ── Row 1: platform toggle + utility buttons ── */}
      <div className="top-bar__controls">
        <div className="platform-toggle" role="group" aria-label="Platform">
          <button
            className={`platform-btn ${platform === 'mac' ? 'platform-btn--active' : ''}`}
            onClick={() => setPlatform('mac')}
            aria-pressed={platform === 'mac'}
            title="Switch to Mac shortcuts [M]"
          >
            <img src={APPLE_ICON} className="platform-icon" alt="" />
            Mac<kbd className="kbd-hint">M</kbd>
          </button>
          <button
            className={`platform-btn ${platform === 'win' ? 'platform-btn--active' : ''}`}
            onClick={() => setPlatform('win')}
            aria-pressed={platform === 'win'}
            title="Switch to Windows shortcuts [W]"
          >
            <img src={WIN_ICON} className="platform-icon" alt="" />
            Win<kbd className="kbd-hint">W</kbd>
          </button>
        </div>

        <div className="top-bar__actions">
          {/* Search */}
          <button
            className={`icon-btn ${searchOpen ? 'icon-btn--active' : ''}`}
            onClick={onToggleSearch}
            title={`Search shortcuts [${sysKeys.search}]`}
            aria-pressed={searchOpen}
          >
            🔍<kbd className="kbd-hint">{sysKeys.search}</kbd>
          </button>

          {/* Favourites — left of the right-side cluster */}
          <button
            className={`icon-btn ${showFavourites ? 'icon-btn--active' : ''}`}
            onClick={toggleShowFavourites}
            title={`Toggle favourites filter [${sysKeys.favourites}]`}
            aria-pressed={showFavourites}
          >
            ⭐<kbd className="kbd-hint">{sysKeys.favourites}</kbd>
          </button>

          {/* Flagged shortcuts */}
          <button className="icon-btn" onClick={onOpenFlagged} title="View flagged shortcuts">
            🚩
          </button>

          {/* Dark / light mode */}
          <button
            className="icon-btn"
            onClick={onToggleDarkMode}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>

          {/* Export */}
          <button className="icon-btn" onClick={onExport} title="Export / backup your data">
            ⬇️
          </button>

          {/* Import */}
          <button className="icon-btn" onClick={() => importRef.current?.click()} title="Import backup">
            ⬆️
          </button>
          <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportFile} />
        </div>
      </div>

      {/* ── Row 2: app filter chips (all non-hidden apps; keyboard shortcuts toggle them) ── */}
      <div className="app-filters" role="group" aria-label="Filter by app">
        {/* Prefix indicator — shown while waiting for the second key of a 0-prefix sequence */}
        {pendingPrefix && (
          <span className="prefix-indicator" aria-live="polite">
            <kbd>{pendingPrefix}</kbd>+…
          </span>
        )}

        <button
          className={`app-chip ${selectedApps.length === 0 ? 'app-chip--active' : ''}`}
          onClick={clearAllApps}
          title="Show all apps [A]"
        >
          All<kbd className="kbd-hint">A</kbd>
        </button>

        {APPS.filter((a) => !hiddenApps.includes(a.id)).map((app) => {
          const resolved = resolveApp(app)
          // Effective key: custom override if set, otherwise the APPS default
          const effectiveKey = keyOverrides[app.id] !== undefined
            ? keyOverrides[app.id]
            : (app.key || '')
          return (
            <button
              key={app.id}
              className={`app-chip ${selectedApps.includes(app.id) ? 'app-chip--active' : ''}`}
              onClick={() => toggleApp(app.id)}
              title={`Filter by ${resolved.label}${effectiveKey ? ` [${effectiveKey}]` : ''}`}
            >
              <AppIcon app={resolved} />
              {' '}{resolved.label}
              {effectiveKey && <kbd className="kbd-hint">{effectiveKey}</kbd>}
            </button>
          )
        })}
      </div>

      {/* ── Row 3: inline search bar ── */}
      {searchOpen && (
        <div className="search-bar-row">
          <span className="search-bar-icon">🔍</span>
          <input
            ref={searchRef}
            className="search-bar-input"
            type="search"
            placeholder="Search shortcuts, apps, categories, key combos…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { onToggleSearch(); return }
              if (e.key === 'Tab' && searchQuery) { e.preventDefault(); onFavouriteFirst?.() }
            }}
            onBlur={() => {
              // iOS Safari stays zoomed after the keyboard dismisses.
              // Briefly adding maximum-scale=1 snaps it back without
              // permanently blocking pinch-to-zoom.
              const vp = document.querySelector('meta[name="viewport"]')
              if (!vp || vp.content.includes('maximum-scale')) return
              const orig = vp.content
              vp.content = orig + ', maximum-scale=1'
              setTimeout(() => { vp.content = orig }, 300)
            }}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {searchQuery && (
            <button className="search-bar-clear" onClick={() => onSearchChange('')} aria-label="Clear search">
              ✕
            </button>
          )}
        </div>
      )}
    </header>
  )
}
