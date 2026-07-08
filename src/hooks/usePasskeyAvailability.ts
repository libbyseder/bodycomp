import { useEffect, useState } from 'react'
import { checkPasskeyServerEnabled, isPasskeySupported, isSecurePasskeyContext } from '../lib/passkey'

export function usePasskeyAvailability() {
  const [serverEnabled, setServerEnabled] = useState<boolean | null>(null)
  const browserSupported = isPasskeySupported()
  const secureContext = isSecurePasskeyContext()

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      const enabled = await checkPasskeyServerEnabled()
      if (!cancelled) setServerEnabled(enabled)
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return {
    browserSupported,
    secureContext,
    serverEnabled,
    ready: browserSupported && secureContext && serverEnabled === true,
    loading: serverEnabled === null,
  }
}