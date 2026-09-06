import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
  theme: 'light' | 'dark'
  colorTheme: 'green' | 'blue' | 'purple'
  language: string
  fontSize: 'normal' | 'large' | 'xlarge'
  highContrast: boolean
  notifications: boolean
  sound: boolean
  familyCallNumber: string
  familyCallName: string
  setTheme: (theme: 'light' | 'dark') => void
  setColorTheme: (theme: 'green' | 'blue' | 'purple') => void
  setLanguage: (lang: string) => void
  setFontSize: (size: 'normal' | 'large' | 'xlarge') => void
  setHighContrast: (contrast: boolean) => void
  setNotifications: (enabled: boolean) => void
  setSound: (enabled: boolean) => void
  setFamilyCallNumber: (number: string) => void
  setFamilyCallName: (name: string) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'light',
      colorTheme: 'green',
      language: 'en',
      fontSize: 'large',
      highContrast: false,
      notifications: true,
      sound: true,
      familyCallNumber: '',
      familyCallName: '',
      setTheme: (theme) => set({ theme }),
      setColorTheme: (colorTheme) => set({ colorTheme }),
      setLanguage: (language) => set({ language }),
      setFontSize: (fontSize) => set({ fontSize }),
      setHighContrast: (highContrast) => set({ highContrast }),
      setNotifications: (notifications) => set({ notifications }),
      setSound: (sound) => set({ sound }),
      setFamilyCallNumber: (familyCallNumber) => set({ familyCallNumber }),
      setFamilyCallName: (familyCallName) => set({ familyCallName }),
    }),
    {
      name: 'memcall-app-storage',
    }
  )
)
