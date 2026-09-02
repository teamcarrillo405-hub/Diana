export const LANDING_ANALYTICS_EVENT = 'diana:landing-event'

export const landingAnalyticsEvents = Object.freeze({
  ctaClicked: 'landing_cta_clicked',
  loginClicked: 'landing_login_clicked',
  sectionReached: 'landing_section_reached',
  videoEngaged: 'landing_video_engaged',
  waitlistStarted: 'landing_waitlist_started',
  waitlistSubmitted: 'landing_waitlist_submitted',
})

const EVENT_PROPERTIES = Object.freeze({
  [landingAnalyticsEvents.ctaClicked]: {
    location: new Set(['hero', 'header', 'mobile_navigation', 'final', 'footer']),
  },
  [landingAnalyticsEvents.loginClicked]: {
    location: new Set(['header', 'mobile_navigation', 'footer']),
  },
  [landingAnalyticsEvents.sectionReached]: {
    section: new Set([
      'hero',
      'workspace',
      'why_diana',
      'help_modes',
      'control',
      'early_access',
    ]),
  },
  [landingAnalyticsEvents.videoEngaged]: {
    action: new Set(['play', 'pause', 'complete', 'replay', 'mute']),
    video: new Set(['hero_product_walkthrough', 'ownership_film']),
  },
  [landingAnalyticsEvents.waitlistStarted]: {
    location: new Set(['final']),
  },
  [landingAnalyticsEvents.waitlistSubmitted]: {
    location: new Set(['final']),
  },
})

function safeProperties(eventName, properties) {
  const contract = EVENT_PROPERTIES[eventName]
  if (!contract || !properties || typeof properties !== 'object') return {}

  return Object.fromEntries(
    Object.entries(contract).flatMap(([property, allowedValues]) => {
      const value = properties[property]
      return typeof value === 'string' && allowedValues.has(value)
        ? [[property, value]]
        : []
    }),
  )
}

export function trackLandingEvent(
  eventName,
  properties = {},
  target = typeof window === 'undefined' ? null : window,
) {
  if (!Object.hasOwn(EVENT_PROPERTIES, eventName) || !target) return null

  const payload = Object.freeze({
    event: eventName,
    ...safeProperties(eventName, properties),
  })

  const CustomEventConstructor = target.CustomEvent ?? globalThis.CustomEvent
  if (
    typeof target.dispatchEvent === 'function'
    && typeof CustomEventConstructor === 'function'
  ) {
    target.dispatchEvent(new CustomEventConstructor(LANDING_ANALYTICS_EVENT, {
      detail: payload,
    }))
  }

  if (Array.isArray(target.dataLayer)) target.dataLayer.push(payload)
  return payload
}
