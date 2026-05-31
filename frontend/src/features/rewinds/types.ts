export type RewindClip = {
  id: string
  createdAt: string
  videoUrl: string
  timeLabel: string
}

export type DailyRewind = {
  id: string
  dateIsoString: string
  title: string
  ownerId: string
  ownerName: string
  isYou: boolean
  clipCount: number
  clips: RewindClip[]
}

export type MultiRewindParticipant = {
  ownerId: string
  ownerName: string
  clips: RewindClip[]
}

export type MultiRewind = {
  id: string
  title: string
  dateIsoString: string
  participants: MultiRewindParticipant[]
  createdBy: string
  videoUrl: string | null
}
