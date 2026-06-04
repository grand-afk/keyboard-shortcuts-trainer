import { useState, useEffect, useCallback, useMemo } from 'react'
import { getShortcuts, getAllShortcuts, APPS } from './data/index'
import { useProgress } from './hooks/useProgress'
import { useSettings } from './hooks/useSettings'
import TopBar from './components/TopBar'
import BottomNav from './components/BottomNav'
import ShortcutsView from './components/ShortcutsView'
import StudyView from './components/StudyView'
import DiscoverView from './components/DiscoverView'
import HelpView from './components/HelpView'
import SettingsView from './components/SettingsView'
import FlaggedModal from './components/FlaggedModal'

// Search tab removed — search is now an inline overlay via 🔍 in TopBar
// 'study' renamed to 'practise' throughout
const VIEWS = ['shortcuts', 'practise', 'discover', 'help', 'settings']

// ── iOS zoom reset ────────────────────────────────────────────────────────
// iOS Safari stays zoomed after an input is dismissed. Briefly adding
// maximum-scale=1 forces it to snap back, then we remove the restriction
// so pinch-to-zoom still works normally.
function resetIOSZoom() {
  const viewport = document.querySelector('meta[name="viewport"]')
  if (!viewport) return
  const orig = viewport.content
  if (orig.includes('maximum-scale')) return   // already set externally
  viewport.content = orig + ', maximum-scale=1'
  setTimeout(() => { viewport.content = orig }, 300)
}

export default function App() {
  const [view, setView] = useState('shortcuts')

  // Pending 0-prefix for two-char app shortcuts (e.g. 0M = Meet, 0W = Word)
  const [pendingPrefix, setPendingPrefix] = useState(null)

  // Search overlay state
  const [searchOpen,  setSearchOpen]  = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Flagged modal state
  const [flaggedOpen, setFlaggedOpen] = useState(false)

  // Add-shortcut modal state (lifted so keyboard shortcut can open it)
  const [addShortcutOpen, setAddShortcutOpen] = useState(false)

  // Clear pending prefix after 1.5 s if no second key arrives
  useEffect(() => {
    if (!pendingPrefix) return
    const t = setTimeout(() => setPendingPrefix(null), 1500)
    return () => clearTimeout(t)
  }, [pendingPrefix])

  const {
    platform, setPlatform,
    selectedApps, toggleApp, setSelectedApps,
    hiddenApps, toggleHideApp,
    showFavourites, toggleShowFavourites,
    darkMode, toggleDarkMode,
    showRateCol, toggleRateCol,
    keyOverrides, setKeyOverride, resetKeyOverride,
    sysKeyOverrides, setSysKeyOverride,
    backupMeta, setBackupMeta,
  } = useSettings()

  const {
    progress, getCard, rateCard,
    toggleFavourite, toggleNeedsEdit,
    exportData, importData,
  } = useProgress()

  // Apply dark / light mode class to root element
  useEffect(() => {
    document.documentElement.classList.toggle('light', !darkMode)
  }, [darkMode])

  const shortcuts    = getShortcuts(selectedApps, hiddenApps)
  const allShortcuts = useMemo(() => getAllShortcuts(), [])  // for flagged modal

  // Visible shortcuts: search → fav filter → all
  const visibleShortcuts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      return shortcuts.filter((s) =>
        s.action.toLowerCase().includes(q) ||
        s.cat.toLowerCase().includes(q) ||
        (s.mac  || '').toLowerCase().includes(q) ||
        (s.win  || '').toLowerCase().includes(q) ||
        (s.context || '').toLowerCase().includes(q)
      )
    }
    return showFavourites
      ? shortcuts.filter((s) => progress[s.id]?.favourite)
      : shortcuts
  }, [shortcuts, searchQuery, showFavourites, progress])

  // Favourite the first visible result while search is active
  const handleFavouriteFirst = useCallback(() => {
    if (visibleShortcuts[0]) toggleFavourite(visibleShortcuts[0].id)
  }, [visibleShortcuts, toggleFavourite])

  // ── Close search + reset iOS zoom ─────────────────────────────────────
  const closeSearch = useCallback(() => {
    setSearchOpen(false)
    setSearchQuery('')
    resetIOSZoom()
  }, [])

  // Navigate to a view — always clears search so the tab switch is visible
  const navigateTo = useCallback((v) => {
    closeSearch()
    setView(v)
  }, [closeSearch])

  // ── Effective system keys (configurable, with defaults) ──────────────────
  const sysKeys = {
    add:        sysKeyOverrides.add        ?? '+',
    favourites: sysKeyOverrides.favourites ?? 'F',
    search:     sysKeyOverrides.search     ?? '/',
  }

  // ── Global keyboard shortcuts ─────────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      const tag = e.target.tagName
      // Allow Escape everywhere (closes search/modals, also cancels pending prefix)
      if (e.key === 'Escape') {
        if (pendingPrefix) { setPendingPrefix(null); return }
        if (searchOpen) { closeSearch(); return }
        if (flaggedOpen) { setFlaggedOpen(false); return }
        if (addShortcutOpen) { setAddShortcutOpen(false); return }
        return
      }
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      // Search key (default /)
      if (e.key === sysKeys.search) { e.preventDefault(); setSearchOpen(true); return }

      // ── Two-char 0-prefix sequences (e.g. 0M = Meet, 0W = Word) ──────────
      if (pendingPrefix === '0') {
        setPendingPrefix(null)
        const twoKey = '0' + e.key.toUpperCase()
        const appByTwoKey = APPS.find((a) => {
          const effectiveKey = keyOverrides[a.id] !== undefined ? keyOverrides[a.id] : (a.key || '')
          return effectiveKey === twoKey
        })
        if (appByTwoKey) { toggleApp(appByTwoKey.id) }
        // Whether matched or not, second key is consumed — don't fall through
        return
      }

      // '0' starts a two-char prefix sequence
      if (e.key === '0') {
        e.preventDefault()
        setPendingPrefix('0')
        return
      }

      // ── Single-char app filter shortcuts ──────────────────────────────────
      const appByKey = APPS.find((a) => {
        const effectiveKey = keyOverrides[a.id] !== undefined ? keyOverrides[a.id] : (a.key || '')
        // Only match single-char keys here (two-char keys handled above)
        return effectiveKey.length === 1 && effectiveKey.toUpperCase() === e.key.toUpperCase()
      })
      if (appByKey) { toggleApp(appByKey.id); return }

      // ── Configurable system shortcuts ─────────────────────────────────────
      if (e.key === sysKeys.add) {
        e.preventDefault(); navigateTo('shortcuts'); setAddShortcutOpen(true); return
      }
      if (e.key.toUpperCase() === sysKeys.favourites.toUpperCase()) {
        toggleShowFavourites(); return
      }

      // ── Static system shortcuts ────────────────────────────────────────────
      switch (e.key) {
        case 'a': case 'A': setSelectedApps([]); break          // A = All (clear filter)
        case 'm': case 'M': setPlatform('mac'); break            // M = Mac platform
        case 'w': case 'W': setPlatform('win'); break            // W = Win platform
        case '1': navigateTo(VIEWS[0]); break
        case '2': navigateTo(VIEWS[1]); break
        case '3': navigateTo(VIEWS[2]); break
        case '4': navigateTo(VIEWS[3]); break
        case '5': navigateTo(VIEWS[4]); break
        default: break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setPlatform, toggleShowFavourites, toggleApp, setSelectedApps, searchOpen, flaggedOpen, addShortcutOpen, closeSearch, navigateTo, keyOverrides, pendingPrefix, sysKeys.add, sysKeys.favourites, sysKeys.search])

  // ── Export/import wrappers that record backup metadata ────────────────────
  const handleExport = useCallback(() => {
    exportData()
    const filename = `keydeck-backup-${new Date().toISOString().slice(0, 10)}.json`
    setBackupMeta({ lastExport: { timestamp: new Date().toISOString(), filename } })
  }, [exportData, setBackupMeta])

  const handleImport = useCallback((jsonText, mode = 'merge', filename = '') => {
    const ok = importData(jsonText, mode)
    if (ok) setBackupMeta({ lastImport: { timestamp: new Date().toISOString(), filename } })
    return ok
  }, [importData, setBackupMeta])

  // Common props shared by all table views
  const tableProps = {
    platform,
    progress,
    rateCard,
    toggleFavourite,
    toggleNeedsEdit,
    showRateCol,
    toggleRateCol,
  }

  const isSearchActive = searchQuery.trim().length > 0
  // While search is active highlight the Shortcuts tab in the nav
  const activeView = isSearchActive ? 'shortcuts' : view

  return (
    <div className="app">
      <TopBar
        platform={platform}
        setPlatform={setPlatform}
        selectedApps={selectedApps}
        toggleApp={toggleApp}
        clearAllApps={() => setSelectedApps([])}
        hiddenApps={hiddenApps}
        showFavourites={showFavourites}
        toggleShowFavourites={toggleShowFavourites}
        keyOverrides={keyOverrides}
        pendingPrefix={pendingPrefix}
        onExport={handleExport}
        onImport={handleImport}
        sysKeys={sysKeys}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        searchOpen={searchOpen}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onToggleSearch={() => {
          if (searchOpen) closeSearch()
          else setSearchOpen(true)
        }}
        onOpenFlagged={() => setFlaggedOpen(true)}
        onFavouriteFirst={handleFavouriteFirst}
      />

      <main className="main-content">
        {isSearchActive ? (
          <ShortcutsView
            {...tableProps}
            shortcuts={visibleShortcuts}
            showFavourites={showFavourites}
            toggleShowFavourites={toggleShowFavourites}
            searchQuery={searchQuery}
            selectedApps={selectedApps}
            addOpen={addShortcutOpen}
            setAddOpen={setAddShortcutOpen}
            addKey={sysKeys.add}
          />
        ) : (
          <>
            {view === 'shortcuts' && (
              <ShortcutsView
                {...tableProps}
                shortcuts={visibleShortcuts}
                showFavourites={showFavourites}
                toggleShowFavourites={toggleShowFavourites}
                selectedApps={selectedApps}
                addOpen={addShortcutOpen}
                setAddOpen={setAddShortcutOpen}
                addKey={sysKeys.add}
              />
            )}
            {view === 'practise' && (
              <StudyView
                {...tableProps}
                shortcuts={visibleShortcuts}
              />
            )}
            {view === 'discover' && (
              <DiscoverView
                {...tableProps}
                shortcuts={visibleShortcuts}
                getCard={getCard}
              />
            )}
            {view === 'help' && <HelpView />}
            {view === 'settings' && (
              <SettingsView
                hiddenApps={hiddenApps}
                toggleHideApp={toggleHideApp}
                platform={platform}
                setPlatform={setPlatform}
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
                showRateCol={showRateCol}
                toggleRateCol={toggleRateCol}
                keyOverrides={keyOverrides}
                setKeyOverride={setKeyOverride}
                resetKeyOverride={resetKeyOverride}
                sysKeyOverrides={sysKeyOverrides}
                setSysKeyOverride={setSysKeyOverride}
                backupMeta={backupMeta}
              />
            )}
          </>
        )}
      </main>

      {/* navigateTo clears search before switching view */}
      <BottomNav view={activeView} setView={navigateTo} />

      {flaggedOpen && (
        <FlaggedModal
          shortcuts={allShortcuts}
          progress={progress}
          platform={platform}
          toggleNeedsEdit={toggleNeedsEdit}
          toggleFavourite={toggleFavourite}
          onClose={() => setFlaggedOpen(false)}
        />
      )}
    </div>
  )
}
