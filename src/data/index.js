import excel        from './excel.json'
import powerpoint   from './powerpoint.json'
import onenote      from './onenote.json'
import gmail        from './gmail.json'
import googleChat   from './google-chat.json'
import googleCal    from './google-calendar.json'
import googleTasks  from './google-tasks.json'
import googleDocs   from './google-docs.json'
import googleSheets from './google-sheets.json'
import googleSlides from './google-slides.json'
import googleDrive  from './google-drive.json'
import googleMeet   from './google-meet.json'
import googleKeep   from './google-keep.json'
import gemini       from './gemini.json'
import notebooklm   from './notebooklm.json'
import windows      from './windows.json'
import word         from './word.json'
import outlook      from './outlook.json'
import teams        from './teams.json'
import powertoys    from './powertoys.json'
import slack        from './slack.json'
import vimium       from './vimium.json'
import obsidian     from './obsidian.json'
import chrome       from './chrome.json'
import claude       from './claude.json'
import custom       from './custom.json'

// ─── Icon helpers ───────────────────────────────────────────────────────────
// Microsoft Office / 365 product icons — PNG from the Office brand CDN
const MS = (name) =>
  `https://res.cdn.office.net/assets/brand-icons/product/png/${name}_48x1.png`

// Google Workspace product icons — SVGs served directly from Google's brand CDN
// URLs sourced live from workspace.google.com/intl/en_uk/features/
const GWS = (slug) =>
  `https://www.gstatic.com/images/branding/productlogos/${slug}/192px.svg`

// Gemini has a different URL structure (PNG, not SVG)
const GEMINI_ICON =
  'https://www.gstatic.com/images/branding/productlogos/gemini_2025/v1/web-96dp/logo_gemini_2025_color_2x_web_96dp.png'

// ─── App metadata ───────────────────────────────────────────────────────────
export const APPS = [
  // ── Google Workspace ──────────────────────────────────────────────────────
  // Single-char: first letter of label (G, C, D, S, T, K, N)
  // Two-char 0-prefix: where first letter conflicts (0M=Meet, 0C=Calendar, 0D=Docs, 0G=Gemini, 0S=Slides)
  { id: 'gmail',           iconUrl: GWS('gmail_2020q4/v11'),          icon: '📧', label: 'Gmail',       key: 'G'  },
  { id: 'google-meet',     iconUrl: GWS('meet_2020q4/v8'),            icon: '📹', label: 'Meet',        key: '0M' },  // M = Mac platform
  { id: 'google-chat',     iconUrl: GWS('chat_2023q4/v2'),            icon: '💬', label: 'Chat',        key: 'C'  },
  { id: 'google-calendar', iconUrl: GWS('calendar_2020q4/v13'),       icon: '📅', label: 'Calendar',    key: '0C' },  // C = Chat
  { id: 'google-drive',    iconUrl: GWS('drive_2020q4/v10'),          icon: '💾', label: 'Drive',       key: 'D'  },
  { id: 'google-docs',     iconUrl: GWS('docs_2020q4/v12'),           icon: '📄', label: 'Docs',        key: '0D' },  // D = Drive
  { id: 'google-sheets',   iconUrl: GWS('sheets_2020q4/v11'),         icon: '📊', label: 'Sheets',      key: 'S'  },
  { id: 'google-slides',   iconUrl: GWS('slides_2020q4/v12'),         icon: '📽️', label: 'Slides',      key: '0S' },  // S = Sheets
  { id: 'google-tasks',    iconUrl: GWS('tasks/v10'),                 icon: '✅', label: 'Tasks',       key: 'T'  },
  { id: 'google-keep',     iconUrl: GWS('keep_2020q4/v8'),            icon: '🟡', label: 'Keep',        key: 'K'  },
  { id: 'gemini',          iconUrl: GEMINI_ICON,                      icon: '✨', label: 'Gemini',      key: '0G' },  // G = Gmail
  { id: 'notebooklm',      iconUrl: GWS('notebooklm/v1'),             icon: '📓', label: 'NotebookLM',  key: 'N'  },

  // ── Microsoft 365 ─────────────────────────────────────────────────────────
  // Single-char: P, X (kept); two-char 0-prefix: 0W=Word (W=Win platform), 0T=Teams (T=Tasks), 0P=PowerToys (P=PowerPoint)
  { id: 'excel',           iconUrl: MS('excel'),                      icon: '📗', label: 'Excel',       key: 'X'  },  // kept X
  { id: 'powerpoint',      iconUrl: MS('powerpoint'),                 icon: '📕', label: 'PowerPoint',  key: 'P'  },
  { id: 'word',            iconUrl: MS('word'),                       icon: '📘', label: 'Word',        key: '0W' },  // W = Win platform
  { id: 'onenote',         iconUrl: MS('onenote'),                    icon: '📒', label: 'OneNote',     key: '0E' },  // E = OneNote
  { id: 'outlook',         iconUrl: MS('outlook'),                    icon: '📨', label: 'Outlook',     key: 'O'  },
  { id: 'teams',           iconUrl: MS('teams'),                      icon: '👥', label: 'Teams',       key: '0T' },  // T = Tasks

  // ── Other apps ────────────────────────────────────────────────────────────
  { id: 'windows',         iconUrl: MS('windows'),                    icon: '🪟', label: 'Desktop',     key: 'Z'  },
  { id: 'powertoys',       icon: '⚙️',                                            label: 'PowerToys',   key: '0P' },  // P = PowerPoint
  { id: 'slack',           iconUrl: GWS('slack.com'),                 icon: '💼', label: 'Slack',       key: 'L'  },  // sLack
  { id: 'vimium',          icon: '🌐',                                            label: 'Vimium',      key: 'V'  },
  { id: 'obsidian',        iconUrl: 'https://www.google.com/s2/favicons?domain=obsidian.md&sz=128', icon: '🔮', label: 'Obsidian', key: '0O' },  // O = Outlook
  { id: 'chrome',          iconUrl: 'https://www.google.com/s2/favicons?domain=google.com/chrome&sz=128', icon: '🌐', label: 'Chrome', key: 'R' },  // chRome
  { id: 'claude',          iconUrl: 'https://www.google.com/s2/favicons?domain=claude.ai&sz=128', icon: '🤖', label: 'Claude',      key: 'U'  },
  { id: 'custom',          icon: '🔖',                                            label: 'Bookmarks',   key: 'B'  },
]

// ─── Tag each shortcut with its app id ─────────────────────────────────────
const tag = (appId, arr) => arr.map((s) => ({ ...s, app: appId }))

const ALL_SHORTCUTS = [
  ...tag('excel',            excel),
  ...tag('powerpoint',       powerpoint),
  ...tag('gmail',            gmail),
  ...tag('google-meet',      googleMeet),
  ...tag('google-chat',      googleChat),
  ...tag('google-calendar',  googleCal),
  ...tag('google-tasks',     googleTasks),
  ...tag('google-docs',      googleDocs),
  ...tag('google-sheets',    googleSheets),
  ...tag('google-slides',    googleSlides),
  ...tag('google-drive',     googleDrive),
  ...tag('google-keep',      googleKeep),
  ...tag('gemini',           gemini),
  ...tag('notebooklm',       notebooklm),
  ...tag('word',             word),
  ...tag('onenote',          onenote),
  ...tag('outlook',          outlook),
  ...tag('teams',            teams),
  ...tag('windows',          windows),
  ...tag('powertoys',        powertoys),
  ...tag('slack',            slack),
  ...tag('vimium',           vimium),
  ...tag('obsidian',         obsidian),
  ...tag('chrome',           chrome),
  ...tag('claude',           claude),
  ...tag('custom',           custom),
]

// ─── User-created shortcuts stored in localStorage ─────────────────────────
function getCustomShortcuts() {
  try {
    const raw = localStorage.getItem('keydeck:custom')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/** Add a new user-created shortcut to localStorage. */
export function addCustomShortcut(shortcut) {
  try {
    const existing = getCustomShortcuts()
    const newEntry = { ...shortcut, id: `custom-${Date.now()}` }
    localStorage.setItem('keydeck:custom', JSON.stringify([...existing, newEntry]))
    return newEntry
  } catch (e) {
    console.warn('Could not save custom shortcut', e)
    return null
  }
}

/** Delete a user-created shortcut by id. */
export function deleteCustomShortcut(id) {
  try {
    const existing = getCustomShortcuts()
    localStorage.setItem('keydeck:custom', JSON.stringify(existing.filter((s) => s.id !== id)))
  } catch (e) {
    console.warn('Could not delete custom shortcut', e)
  }
}

// ─── Apply any in-browser user overrides from localStorage ─────────────────
function applyOverrides(shortcuts) {
  try {
    const raw = localStorage.getItem('keydeck:overrides')
    if (!raw) return shortcuts
    const overrides = JSON.parse(raw)           // { [id]: { action, mac, win, cat, context } }
    return shortcuts.map((s) =>
      overrides[s.id] ? { ...s, ...overrides[s.id] } : s
    )
  } catch {
    return shortcuts
  }
}

/**
 * Return all shortcuts (optionally filtered by app), with user overrides applied.
 * Includes user-created custom shortcuts from localStorage.
 * Pass an empty array or undefined to get every shortcut.
 */
export function getShortcuts(selectedApps, hiddenApps = []) {
  const custom = getCustomShortcuts()
  const combined = [...ALL_SHORTCUTS, ...custom]
  // Always exclude hidden apps first
  const visible = hiddenApps.length > 0
    ? combined.filter((s) => !hiddenApps.includes(s.app))
    : combined
  // Then apply the active filter (selectedApps)
  const base =
    !selectedApps || selectedApps.length === 0
      ? visible
      : visible.filter((s) => selectedApps.includes(s.app))
  return applyOverrides(base)
}

/** Return every shortcut regardless of filter (used by export / edit). */
export function getAllShortcuts() {
  return applyOverrides([...ALL_SHORTCUTS, ...getCustomShortcuts()])
}
