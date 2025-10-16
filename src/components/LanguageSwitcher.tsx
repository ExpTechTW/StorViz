'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Languages } from 'lucide-react'
import { changeLanguage, getCurrentLanguage, getSupportedLanguages, languageConfig } from '@/i18n'

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  
  const currentLanguage = getCurrentLanguage()
  const supportedLanguages = getSupportedLanguages()
  const currentLanguageInfo = languageConfig[currentLanguage as keyof typeof languageConfig]

  const handleLanguageChange = (language: string) => {
    changeLanguage(language)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-md border border-border/60 bg-card/70 hover:bg-card transition-colors shadow-sm hover:shadow"
      >
        <Languages className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">{currentLanguageInfo?.name}</span>
        <svg
          className={`w-4 h-4 transition-transform text-muted-foreground ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-full min-w-[160px] max-h-60 overflow-y-auto overscroll-contain bg-background border border-border rounded-md shadow-lg z-50">
          {supportedLanguages.map((language) => {
            const languageInfo = languageConfig[language as keyof typeof languageConfig]
            const isSelected = language === currentLanguage
            const code = language === 'zh-Hant' ? 'ZH' : language === 'ja-JP' ? 'JA' : language === 'en-US' ? 'EN' : language
            
            return (
              <button
                key={language}
                onClick={() => handleLanguageChange(language)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent transition-colors first:rounded-t-md last:rounded-b-md ${
                  isSelected ? 'bg-accent' : ''
                }`}
              >
                <span className="px-1.5 py-0.5 text-[10px] font-mono tracking-wide rounded bg-muted text-foreground/80 border border-border/60">
                  {code}
                </span>
                <span className="text-sm font-medium">{languageInfo?.name}</span>
                {isSelected && (
                  <svg className="w-4 h-4 ml-auto text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
