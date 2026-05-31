export const MAX_DURATION_SECONDS = 2

export const FILTERS = [
  { id: 'clear', label: 'A', className: '' },
  { id: 'aqua', label: 'A', className: 'camera-preview--aqua' },
  { id: 'sunset', label: 'A', className: 'camera-preview--sunset' },
] as const

export type FilterId = (typeof FILTERS)[number]['id']
