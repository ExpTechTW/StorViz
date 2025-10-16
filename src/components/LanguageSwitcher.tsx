'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
        className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-background hover:bg-accent transition-colors"
      >
        <span className="text-lg">{currentLanguageInfo?.flag}</span>
        <span className="text-sm font-medium">{currentLanguageInfo?.name}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full min-w-[160px] bg-background border border-border rounded-md shadow-lg z-50">
          {supportedLanguages.map((language) => {
            const languageInfo = languageConfig[language as keyof typeof languageConfig]
            const isSelected = language === currentLanguage
            
            return (
              <button
                key={language}
                onClick={() => handleLanguageChange(language)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent transition-colors first:rounded-t-md last:rounded-b-md ${
                  isSelected ? 'bg-accent' : ''
                }`}
              >
                <span className="text-lg">{languageInfo?.flag}</span>
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
