import { create } from 'zustand'

interface AppState {
  theme: 'light' | 'dark'
  language: string
  fontSize: 'normal' | 'large' | 'xlarge'
  highContrast: boolean
  setTheme: (theme: 'light' | 'dark') => void
  setLanguage: (lang: string) => void
  setFontSize: (size: 'normal' | 'large' | 'xlarge') => void
  setHighContrast: (contrast: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  theme: 'light',
  language: 'en',
  fontSize: 'large', // Default large for elderly
  highContrast: false,
  setTheme: (theme) => set({ theme }),
  setLanguage: (language) => set({ language }),
  setFontSize: (fontSize) => set({ fontSize }),
  setHighContrast: (highContrast) => set({ highContrast }),
}))
