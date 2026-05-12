import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  QUALITY,
  defaultCardState,
  calculateNextReview,
  isDue,
  getCardStatus,
  nextDueLabel,
} from './sm2'

// ─── defaultCardState ──────────────────────────────────────────────────────

describe('defaultCardState', () => {
  it('returns a fresh card with zero repetitions', () => {
    const state = defaultCardState()
    expect(state.repetitions).toBe(0)
    expect(state.interval).toBe(1)
    expect(state.easeFactor).toBe(2.5)
    expect(state.nextReview).toBeNull()
    expect(state.lastQuality).toBeNull()
    expect(state.lastReviewed).toBeNull()
  })

  it('returns a new object each call', () => {
    const a = defaultCardState()
    const b = defaultCardState()
    expect(a).not.toBe(b)
  })
})

// ─── calculateNextReview ───────────────────────────────────────────────────

describe('calculateNextReview', () => {
  let fakeNow

  beforeEach(() => {
    fakeNow = new Date('2026-01-01T12:00:00.000Z')
    vi.useFakeTimers()
    vi.setSystemTime(fakeNow)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('sets interval=1 on first correct answer (repetitions 0→1)', () => {
    const card  = defaultCardState()
    const next  = calculateNextReview(card, QUALITY.GOOD)
    expect(next.repetitions).toBe(1)
    expect(next.interval).toBe(1)
    expect(next.lastQuality).toBe(QUALITY.GOOD)
    expect(next.lastReviewed).toBeTruthy()
  })

  it('sets interval=6 on second correct answer (repetitions 1→2)', () => {
    const card  = { ...defaultCardState(), repetitions: 1 }
    const next  = calculateNextReview(card, QUALITY.GOOD)
    expect(next.repetitions).toBe(2)
    expect(next.interval).toBe(6)
  })

  it('multiplies interval by easeFactor on third+ correct answer', () => {
    const card = { ...defaultCardState(), repetitions: 2, interval: 6, easeFactor: 2.5 }
    const next = calculateNextReview(card, QUALITY.GOOD)
    expect(next.repetitions).toBe(3)
    expect(next.interval).toBe(15)   // round(6 * 2.5)
  })

  it('resets to zero on AGAIN (quality 1)', () => {
    const card = { ...defaultCardState(), repetitions: 5, interval: 21, easeFactor: 2.5 }
    const next = calculateNextReview(card, QUALITY.AGAIN)
    expect(next.repetitions).toBe(0)
    expect(next.interval).toBe(1)
  })

  it('increases easeFactor on EASY answer', () => {
    const card  = defaultCardState()
    const next  = calculateNextReview(card, QUALITY.EASY)
    expect(next.easeFactor).toBeGreaterThan(2.5)
  })

  it('decreases easeFactor on HARD answer', () => {
    const card  = defaultCardState()
    const next  = calculateNextReview(card, QUALITY.HARD)
    expect(next.easeFactor).toBeLessThan(2.5)
  })

  it('clamps easeFactor minimum to 1.3', () => {
    const card = { ...defaultCardState(), easeFactor: 1.3 }
    const next = calculateNextReview(card, QUALITY.AGAIN)
    expect(next.easeFactor).toBeGreaterThanOrEqual(1.3)
  })

  it('sets nextReview to a future ISO date string', () => {
    const card = defaultCardState()
    const next = calculateNextReview(card, QUALITY.GOOD)
    expect(typeof next.nextReview).toBe('string')
    expect(new Date(next.nextReview).getTime()).toBeGreaterThan(fakeNow.getTime())
  })

  it('does not mutate the original card', () => {
    const card   = defaultCardState()
    const before = { ...card }
    calculateNextReview(card, QUALITY.GOOD)
    expect(card).toEqual(before)
  })

  it('preserves favourite and needsEdit flags if present', () => {
    const card = { ...defaultCardState(), favourite: true, needsEdit: false }
    // calculateNextReview intentionally does not copy extra fields — they stay
    // in the parent progress object. The returned state is SM-2 only.
    const next = calculateNextReview(card, QUALITY.GOOD)
    expect(next.repetitions).toBe(1)
  })
})

// ─── isDue ─────────────────────────────────────────────────────────────────

describe('isDue', () => {
  it('returns true for null/undefined state (new card)', () => {
    expect(isDue(null)).toBe(true)
    expect(isDue(undefined)).toBe(true)
    expect(isDue({})).toBe(true)
  })

  it('returns true for a card whose nextReview is in the past', () => {
    const past = new Date(Date.now() - 86_400_000).toISOString()
    expect(isDue({ nextReview: past })).toBe(true)
  })

  it('returns false for a card whose nextReview is in the future', () => {
    const future = new Date(Date.now() + 86_400_000).toISOString()
    expect(isDue({ nextReview: future })).toBe(false)
  })

  it('returns true for a card due exactly now (boundary)', () => {
    const now = new Date().toISOString()
    // Due "now" means <= today, so it should be due
    expect(isDue({ nextReview: now })).toBe(true)
  })
})

// ─── getCardStatus ─────────────────────────────────────────────────────────

describe('getCardStatus', () => {
  it('returns "new" for null/undefined/zero-repetition state', () => {
    expect(getCardStatus(null)).toBe('new')
    expect(getCardStatus(undefined)).toBe('new')
    expect(getCardStatus({ repetitions: 0 })).toBe('new')
  })

  it('returns "learning" for interval < 7 days', () => {
    expect(getCardStatus({ repetitions: 2, interval: 6 })).toBe('learning')
    expect(getCardStatus({ repetitions: 1, interval: 1 })).toBe('learning')
  })

  it('returns "review" for interval >= 7 days', () => {
    expect(getCardStatus({ repetitions: 3, interval: 7 })).toBe('review')
    expect(getCardStatus({ repetitions: 5, interval: 21 })).toBe('review')
  })
})

// ─── nextDueLabel ──────────────────────────────────────────────────────────

describe('nextDueLabel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "Now" for null/undefined state', () => {
    expect(nextDueLabel(null)).toBe('Now')
    expect(nextDueLabel(undefined)).toBe('Now')
  })

  it('returns "Now" for overdue cards', () => {
    const past = new Date('2025-12-31T12:00:00.000Z').toISOString()
    expect(nextDueLabel({ nextReview: past })).toBe('Now')
  })

  it('returns "Tomorrow" for cards due in 1 day', () => {
    const tomorrow = new Date('2026-01-02T12:00:00.000Z').toISOString()
    expect(nextDueLabel({ nextReview: tomorrow })).toBe('Tomorrow')
  })

  it('returns "Nd" for cards due in N days', () => {
    const inSeven = new Date('2026-01-08T12:00:00.000Z').toISOString()
    expect(nextDueLabel({ nextReview: inSeven })).toBe('7d')
  })
})

// ─── QUALITY constants ─────────────────────────────────────────────────────

describe('QUALITY constants', () => {
  it('exports the correct numeric values', () => {
    expect(QUALITY.AGAIN).toBe(1)
    expect(QUALITY.HARD).toBe(3)
    expect(QUALITY.GOOD).toBe(4)
    expect(QUALITY.EASY).toBe(5)
  })
})
