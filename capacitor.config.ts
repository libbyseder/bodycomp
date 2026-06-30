import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.recomptrack.app',
  appName: 'RecompTrack',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
    scheme: 'recomptrack',
  },
}

export default config