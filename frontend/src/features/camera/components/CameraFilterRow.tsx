import { FILTERS, type FilterId } from '../constants'

type CameraFilterRowProps = {
  selectedFilter: FilterId
  onSelectFilter: (filterId: FilterId) => void
}

export function CameraFilterRow({ selectedFilter, onSelectFilter }: CameraFilterRowProps) {
  return (
    <div className="camera-filter-row" aria-label="Filter shortcuts">
      {FILTERS.map((filter) => (
        <button
          key={filter.id}
          className={`filter-pill ${selectedFilter === filter.id ? 'filter-pill--active' : ''}`}
          type="button"
          onClick={() => onSelectFilter(filter.id)}
        >
          <span>{filter.label}</span>
        </button>
      ))}
    </div>
  )
}
