/** Public routes that must not 404/500 in CI smoke checks. */
export const PUBLIC_ROUTE_CHECKS = [
  { path: '/', name: 'landing' },
  { path: '/login', name: 'login alias', allowRedirect: true },
  { path: '/auth/login', name: 'auth login' },
  { path: '/marketplace', name: 'marketplace' },
  { path: '/faq', name: 'faq' },
  { path: '/about', name: 'about' },
  { path: '/legal/terms', name: 'terms' },
  { path: '/legal/privacy', name: 'privacy' },
  { path: '/legal/offer', name: 'offer' },
  { path: '/legal/refunds', name: 'refunds' },
] as const

/** Footer / nav links on the landing page worth checking. */
export const LANDING_INTERNAL_LINKS = [
  '/faq',
  '/about',
  '/legal/terms',
  '/legal/privacy',
  '/legal/offer',
  '/legal/refunds',
  '/marketplace',
  '/auth/login',
] as const
