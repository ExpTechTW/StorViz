'use client'

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// 靜態導入翻譯資源
import zhHantTranslation from '../public/locales/zh-Hant/translation.json'
import jaJPTranslation from '../public/locales/ja-JP/translation.json'
import enUSTranslation from '../public/locales/en-US/translation.json'

// 支援的語言
const supportedLanguages = ['zh-Hant', 'ja-JP', 'en-US']
const defaultLanguage = 'zh-Hant'

// 從 localStorage 讀取保存的語言
const getStoredLanguage = (): string => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('storviz-language')
    if (stored && supportedLanguages.includes(stored)) {
      return stored
    }
  }
  return defaultLanguage
}

// 初始化 i18n
i18n
  .use(initReactI18next)
  .init({
    lng: getStoredLanguage(),
    fallbackLng: defaultLanguage,
    supportedLngs: supportedLanguages,
    
    // 靜態資源
    resources: {
      'zh-Hant': {
        translation: zhHantTranslation
      },
      'ja-JP': {
        translation: jaJPTranslation
      },
      'en-US': {
        translation: enUSTranslation
      }
    },
    
    // 命名空間
    defaultNS: 'translation',
    ns: ['translation'],
    
    // 插值配置
    interpolation: {
      escapeValue: false, // React 已經處理了 XSS
    },
    
    // 開發模式配置
    debug: process.env.NODE_ENV === 'development',
    
    // 服務器端渲染配置
    react: {
      useSuspense: false, // 禁用 Suspense，避免 SSR 問題
    },
  })

// 語言切換函數
export const changeLanguage = (language: string) => {
  if (supportedLanguages.includes(language)) {
    i18n.changeLanguage(language)
    if (typeof window !== 'undefined') {
      localStorage.setItem('storviz-language', language)
    }
  }
}

// 獲取當前語言
export const getCurrentLanguage = () => i18n.language

// 獲取支援的語言列表
export const getSupportedLanguages = () => supportedLanguages

// 語言配置
export const languageConfig = {
  'zh-Hant': { name: '繁體中文', flag: '🇹🇼' },
  'ja-JP': { name: '日本語', flag: '🇯🇵' },
  'en-US': { name: 'English', flag: '🇺🇸' }
}

export default i18n
