import { createI18n } from 'vue-i18n'
import { messages } from './messages'

export type AppLocale = keyof typeof messages
export type LanguageSetting = 'system' | AppLocale

const SUPPORTED_LOCALES = Object.keys(messages) as AppLocale[]

export const LANGUAGE_SETTING_OPTIONS: Array<{ value: LanguageSetting; labelKey: string }> = [
  { value: 'system', labelKey: 'common.system' },
  { value: 'en', labelKey: 'common.english' },
  { value: 'zh-CN', labelKey: 'common.simplifiedChinese' },
]

export function resolveLocale(setting: unknown, systemLanguage = navigator.language): AppLocale {
  if (setting === 'en' || setting === 'zh-CN') {
    return setting
  }

  const normalized = systemLanguage.toLowerCase()
  if (normalized === 'zh' || normalized.startsWith('zh-')) {
    return 'zh-CN'
  }

  return 'en'
}

export function isLanguageSetting(value: unknown): value is LanguageSetting {
  return value === 'system' || SUPPORTED_LOCALES.includes(value as AppLocale)
}

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: resolveLocale('system'),
  fallbackLocale: 'en',
  messages,
})

export function applyLanguageSetting(setting: unknown): void {
  i18n.global.locale.value = resolveLocale(isLanguageSetting(setting) ? setting : 'system')
}
