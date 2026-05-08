import { useState } from 'react'
import { APPS, addCustomShortcut } from '../data/index'

/**
 * AddShortcutModal — create a new shortcut stored in keydeck:custom.
 *
 * The shortcut is saved to localStorage and the page reloads so the new
 * entry appears immediately (same pattern as EditModal).
 */
export default function AddShortcutModal({ onClose, selectedApps = [] }) {
  const filteredApps = selectedApps.length > 0
    ? APPS.filter((a) => selectedApps.includes(a.id))
    : APPS
  const defaultApp = filteredApps[0]?.id ?? APPS[0].id
  const [app,     setApp]     = useState(defaultApp)
  const [cat,     setCat]     = useState('')
  const [action,  setAction]  = useState('')
  const [mac,     setMac]     = useState('')
  const [win,     setWin]     = useState('')
  const [context, setContext] = useState('')
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState('')

  function handleSave() {
    if (!action.trim()) {
      setError('Please enter a function / action description.')
      return
    }
    if (!mac.trim() && !win.trim()) {
      setError('Please enter at least one shortcut (Mac or Win).')
      return
    }
    setError('')

    addCustomShortcut({
      app,
      cat:     cat.trim()     || 'Custom',
      action:  action.trim(),
      mac:     mac.trim(),
      win:     win.trim(),
      context: context.trim(),
    })

    setSaved(true)
    setTimeout(() => {
      onClose()
      window.location.reload()
    }, 800)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h3 className="modal-title">➕ Add Shortcut</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <p className="modal-hint">
          New shortcuts are saved in your browser and included in exports.
        </p>

        <div className="modal-body">
          <label className="form-label">
            App
            <select
              className="form-input"
              value={app}
              onChange={(e) => setApp(e.target.value)}
            >
              {filteredApps.map((a) => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
          </label>

          <label className="form-label">
            Category
            <input
              className="form-input"
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              placeholder="e.g. Navigation, Editing…"
            />
          </label>

          <label className="form-label">
            Function / Action <span className="form-required">*</span>
            <input
              className="form-input"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="What this shortcut does"
              autoFocus
            />
          </label>

          <div className="form-row">
            <label className="form-label">
              Mac shortcut
              <input
                className="form-input form-input--mono"
                value={mac}
                onChange={(e) => setMac(e.target.value)}
                placeholder="e.g. ⌘⇧K"
              />
            </label>
            <label className="form-label">
              Win shortcut
              <input
                className="form-input form-input--mono"
                value={win}
                onChange={(e) => setWin(e.target.value)}
                placeholder="e.g. Ctrl+Shift+K"
              />
            </label>
          </div>

          <label className="form-label">
            Context note (optional)
            <input
              className="form-input"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Extra hint shown on the card"
            />
          </label>

          {error && <p className="form-error">{error}</p>}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={saved}>
            {saved ? '✅ Saved!' : 'Add shortcut'}
          </button>
        </div>
      </div>
    </div>
  )
}
