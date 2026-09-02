import { describe, expect, it, vi } from 'vitest'
import {
  MOTION_MEDIA_QUERY,
  MOTION_OVERRIDE_FULL,
  MOTION_OVERRIDE_REDUCE,
  MOTION_OVERRIDE_SYSTEM,
  MOTION_STORAGE_KEY,
  getMotionMediaQuery,
  getSafeStorage,
  normalizeMotionOverride,
  persistMotionOverride,
  readMotionOverride,
  resolveReducedMotion,
  subscribeToMotionMediaQuery,
} from './motionPreference'

describe('motion preference helpers', () => {
  it('normalizes supported overrides and rejects stale storage values', () => {
    expect(normalizeMotionOverride(MOTION_OVERRIDE_SYSTEM)).toBe(MOTION_OVERRIDE_SYSTEM)
    expect(normalizeMotionOverride(MOTION_OVERRIDE_REDUCE)).toBe(MOTION_OVERRIDE_REDUCE)
    expect(normalizeMotionOverride(MOTION_OVERRIDE_FULL)).toBe(MOTION_OVERRIDE_FULL)
    expect(normalizeMotionOverride('unexpected')).toBe(MOTION_OVERRIDE_SYSTEM)
    expect(normalizeMotionOverride('unexpected', MOTION_OVERRIDE_REDUCE)).toBe(MOTION_OVERRIDE_REDUCE)
  })

  it('resolves system, forced-reduce, and forced-full behavior', () => {
    expect(resolveReducedMotion(MOTION_OVERRIDE_SYSTEM, true)).toBe(true)
    expect(resolveReducedMotion(MOTION_OVERRIDE_SYSTEM, false)).toBe(false)
    expect(resolveReducedMotion(MOTION_OVERRIDE_REDUCE, false)).toBe(true)
    expect(resolveReducedMotion(MOTION_OVERRIDE_FULL, true)).toBe(false)
  })

  it('reads and persists the Diana override without leaking storage failures', () => {
    const values = new Map([[MOTION_STORAGE_KEY, MOTION_OVERRIDE_REDUCE]])
    const storage = {
      getItem: vi.fn((key) => values.get(key) ?? null),
      setItem: vi.fn((key, value) => values.set(key, value)),
    }

    expect(readMotionOverride(storage)).toBe(MOTION_OVERRIDE_REDUCE)
    expect(persistMotionOverride(storage, MOTION_OVERRIDE_FULL)).toBe(true)
    expect(values.get(MOTION_STORAGE_KEY)).toBe(MOTION_OVERRIDE_FULL)

    const restrictedStorage = {
      getItem: () => { throw new Error('denied') },
      setItem: () => { throw new Error('denied') },
    }
    expect(readMotionOverride(restrictedStorage)).toBe(MOTION_OVERRIDE_SYSTEM)
    expect(persistMotionOverride(restrictedStorage, MOTION_OVERRIDE_REDUCE)).toBe(false)
  })

  it('safely handles unavailable browser APIs', () => {
    expect(getSafeStorage(null)).toBeNull()
    expect(getSafeStorage({
      get localStorage() { throw new Error('denied') },
    })).toBeNull()
    expect(getMotionMediaQuery(null)).toBeNull()
    expect(getMotionMediaQuery({ matchMedia: () => { throw new Error('unsupported') } })).toBeNull()
  })

  it('subscribes and cleans up modern and legacy media-query listeners', () => {
    const modernListeners = new Set()
    const modern = {
      matches: false,
      addEventListener: vi.fn((type, listener) => modernListeners.add(listener)),
      removeEventListener: vi.fn((type, listener) => modernListeners.delete(listener)),
    }
    const onModernChange = vi.fn()
    const unsubscribeModern = subscribeToMotionMediaQuery(modern, onModernChange)
    modernListeners.forEach((listener) => listener({ matches: true }))
    expect(onModernChange).toHaveBeenCalledWith(true)
    unsubscribeModern()
    expect(modernListeners.size).toBe(0)

    let legacyListener
    const legacy = {
      addListener: vi.fn((listener) => { legacyListener = listener }),
      removeListener: vi.fn((listener) => {
        if (legacyListener === listener) legacyListener = undefined
      }),
    }
    const onLegacyChange = vi.fn()
    const unsubscribeLegacy = subscribeToMotionMediaQuery(legacy, onLegacyChange)
    legacyListener({ matches: false })
    expect(onLegacyChange).toHaveBeenCalledWith(false)
    unsubscribeLegacy()
    expect(legacyListener).toBeUndefined()
  })

  it('requests the standard reduced-motion media query', () => {
    const matchMedia = vi.fn(() => ({ matches: true }))
    expect(getMotionMediaQuery({ matchMedia })).toEqual({ matches: true })
    expect(matchMedia).toHaveBeenCalledWith(MOTION_MEDIA_QUERY)
  })
})
