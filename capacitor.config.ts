import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.recomptrack.app',
  appName: 'BodyTrend',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
    scheme: 'recomptrack',
  },
  android: {
    backgroundColor: '#09090b',
    allowMixedContent: false,
  },
  plugins: {
    App: {
      urlScheme: 'recomptrack',
    },
  },
}

export default config