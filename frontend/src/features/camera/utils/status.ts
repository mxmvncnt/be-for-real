type CameraStatusArgs = {
  cameraError: string | null
  clipUrl: string | null
  recording: boolean
  secondsLeft: number
  cameraReady: boolean
}

export function getCameraStatusMessage({
  cameraError,
  clipUrl,
  recording,
  secondsLeft,
  cameraReady,
}: CameraStatusArgs) {
  if (cameraError) {
    return cameraError
  }

  if (clipUrl) {
    return 'Clip recorded. Replay it or shoot again.'
  }

  if (recording) {
    return `Recording... ${secondsLeft}s`
  }

  if (cameraReady) {
    return 'Camera Preview'
  }

  return 'Opening camera...'
}
