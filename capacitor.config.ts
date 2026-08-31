import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.memcall.app',
  appName: 'MemCall',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    backgroundColor: '#FFFFFF',
    // CRITICAL: Do NOT use fullscreen.
    // Status bar and navigation buttons must remain visible.
  },
  plugins: {
    StatusBar: {
      style: 'Default',         // Black text on light background
      backgroundColor: '#FFFFFF',
      overlaysWebView: false     // Status bar does NOT overlay content
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#FFFFFF',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_memcall',
      iconColor: '#000000'
    }
  }
};

export default config;
