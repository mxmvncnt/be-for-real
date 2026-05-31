export const MAX_DURATION_SECONDS = 2

export const FILTERS = [
  { id: "clear", label: "Original", className: "" },
  { id: "aqua", label: "Filter A", className: "camera-preview--aqua" },
  { id: "sunset", label: "Filter B", className: "camera-preview--sunset" },
] as const;

export type FilterId = (typeof FILTERS)[number]['id']
