export { es, type Strings } from './es'
export { en } from './en'

import { es } from './es'
import { en } from './en'

export type Locale = 'es' | 'en'

const locales = { es, en } as const

/** Get strings for a locale. Defaults to Spanish. */
export function t(locale: Locale = 'es') {
  return locales[locale]
}

/** Spanish strings — use this in components for the default Spanish-first UX. */
export const strings = es
