import type { Measurement, Profile, ProgressPhoto } from '../types'
import { usePhotoSignedUrls } from '../hooks/usePhotoSignedUrls'
import ProgressPhotoCompare from './ProgressPhotoCompare'

interface ProgressPhotoCompareSectionProps {
  photos: ProgressPhoto[]
  measurements: Measurement[]
  profile: Profile | null
}

export default function ProgressPhotoCompareSection({
  photos,
  measurements,
  profile,
}: ProgressPhotoCompareSectionProps) {
  const { getUrl, isLoading } = usePhotoSignedUrls(photos)

  return (
    <ProgressPhotoCompare
      photos={photos}
      measurements={measurements}
      profile={profile}
      getPhotoUrl={getUrl}
      isPhotoLoading={isLoading}
    />
  )
}