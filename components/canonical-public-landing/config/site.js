const UNSAFE_PROTOCOL = /^(?:javascript|data):/i
const EXPLICIT_PROTOCOL = /^[a-z][a-z\d+.-]*:/i
const DIANA_APP_ORIGIN = 'https://diana-umber.vercel.app'
const LOCAL_ACCOUNT_HOST = /^(?:localhost|127(?:\.\d{1,3}){3}|\[?::1\]?)$/i

function normalizeUrl(value, fallback) {
  if (typeof value !== 'string') return fallback

  const candidate = value.trim()
  if (!candidate || UNSAFE_PROTOCOL.test(candidate) || candidate.startsWith('//')) return fallback

  if (EXPLICIT_PROTOCOL.test(candidate)) {
    try {
      const url = new URL(candidate)
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : fallback
    } catch {
      return fallback
    }
  }

  return candidate
}

function normalizeAccountUrl(value, fallback, isProduction) {
  const normalized = normalizeUrl(value, fallback)
  if (!isProduction || !EXPLICIT_PROTOCOL.test(normalized)) return normalized

  try {
    const url = new URL(normalized)
    if (url.protocol !== 'https:' || LOCAL_ACCOUNT_HOST.test(url.hostname)) return fallback
    return url.href
  } catch {
    return fallback
  }
}

function isProductionEnvironment(env, options) {
  if (typeof options.isProduction === 'boolean') return options.isProduction
  if (typeof options.mode === 'string') return options.mode === 'production'
  if (typeof env.PROD === 'boolean') return env.PROD
  return env.MODE === 'production'
}

export function createSiteConfig(env = {}, options = {}) {
  const isProduction = isProductionEnvironment(env, options)
  const signupFallback = isProduction ? `${DIANA_APP_ORIGIN}/signup` : 'http://localhost:3000/signup'
  const loginFallback = isProduction ? `${DIANA_APP_ORIGIN}/login` : 'http://localhost:3000/login'

  return Object.freeze({
    signupUrl: normalizeAccountUrl(env.VITE_DIANA_SIGNUP_URL, signupFallback, isProduction),
    loginUrl: normalizeAccountUrl(env.VITE_DIANA_LOGIN_URL, loginFallback, isProduction),
    publicSiteUrl: normalizeUrl(env.VITE_PUBLIC_SITE_URL, '/'),
    privacyUrl: normalizeUrl(env.VITE_DIANA_PRIVACY_URL, '/privacy.html#privacy'),
    termsUrl: normalizeUrl(env.VITE_DIANA_TERMS_URL, '/privacy.html#terms'),
    safetyUrl: normalizeUrl(env.VITE_DIANA_SAFETY_URL, '/privacy.html#safety'),
    accessibilityUrl: normalizeUrl(env.VITE_DIANA_ACCESSIBILITY_URL, '/privacy.html#accessibility'),
  })
}

export const siteConfig = createSiteConfig(
  typeof process === 'undefined' ? {} : process.env,
  { isProduction: process.env.NODE_ENV === 'production' },
)
