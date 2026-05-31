import type { Friend, RewindVideo } from '../../lib/api'
import type { DailyRewind, MultiRewind } from './types'

export function buildDailyRewinds(rewindFeed: RewindVideo[]): DailyRewind[] {
  const groups = new Map<string, DailyRewind>()

  for (const clip of rewindFeed) {
    const createdAt = new Date(clip.createdAt)
    const dateIsoString = createdAt.toISOString().slice(0, 10)
    const rewindKey = `${clip.userId}:${dateIsoString}`
    const dayTitle = createdAt.toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
    })

    if (!groups.has(rewindKey)) {
      groups.set(rewindKey, {
        id: rewindKey,
        dateIsoString: dateIsoString,
        title: `${clip.username}'s ${dayTitle} Rewind`,
        ownerId: clip.userId,
        ownerName: clip.isYou ? 'You' : clip.username,
        isYou: clip.isYou,
        clipCount: 0,
        clips: [],
      })
    }

    const rewind = groups.get(rewindKey)!
    rewind.clips.push({
      id: clip.id,
      createdAt: clip.createdAt,
      videoUrl: clip.videoUrl,
      timeLabel: createdAt.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      }),
    })
  }

  return Array.from(groups.values())
    .map((rewind) => ({
      ...rewind,
      clipCount: rewind.clips.length,
      clips: [...rewind.clips].sort(
        (left, right) =>
          new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
      ),
    }))
    .sort(
      (left, right) =>
        new Date(right.clips[right.clips.length - 1]?.createdAt ?? 0).getTime() -
        new Date(left.clips[left.clips.length - 1]?.createdAt ?? 0).getTime(),
    )
}

export function filterDailyRewinds(dailyRewinds: DailyRewind[], searchTerm: string) {
  const normalized = searchTerm.trim().toLowerCase()
  if (!normalized) {
    return dailyRewinds
  }

  return dailyRewinds.filter((rewind) =>
    rewind.ownerName.toLowerCase().includes(normalized),
  )
}

export function filterMultiRewinds(multiRewinds: MultiRewind[], searchTerm: string) {
  const normalized = searchTerm.trim().toLowerCase()
  if (!normalized) {
    return multiRewinds
  }

  return multiRewinds.filter((rewind) =>
    `${rewind.participants.map((participant) => participant.ownerName).join(' ')} ${rewind.title}`
      .toLowerCase()
      .includes(normalized),
  )
}

export function getFriendWithRewindForDay(
  friends: Friend[],
  dailyRewinds: DailyRewind[],
  selectedDay: DailyRewind | null,
) {
  if (!selectedDay) {
    return []
  }

  return friends
    .map((friend) => ({
      friend,
      rewind: dailyRewinds.find(
        (rewind) =>
          rewind.ownerId === friend.id && rewind.dateIsoString === selectedDay.dateIsoString,
      ),
    }))
    .filter((entry): entry is { friend: Friend; rewind: DailyRewind } => Boolean(entry.rewind))
}
