type RewindsFilterBarProps = {
  activeTab: 'rewinds' | 'multi'
  searchTerm: string
  onTabChange: (tab: 'rewinds' | 'multi') => void
  onSearchTermChange: (value: string) => void
}

export function RewindsFilterBar({
  activeTab,
  searchTerm,
  onTabChange,
  onSearchTermChange,
}: RewindsFilterBarProps) {
  return (
    <>
      <div className="rewinds-tabs">
        <button
          className={`rewinds-tab ${activeTab === 'rewinds' ? 'rewinds-tab--pink' : ''}`}
          type="button"
          onClick={() => onTabChange('rewinds')}
        >
          Rewinds
        </button>
        <button
          className={`rewinds-tab ${activeTab === 'multi' ? 'rewinds-tab--green' : ''}`}
          type="button"
          onClick={() => onTabChange('multi')}
        >
          Multi-Rewinds
        </button>
      </div>

      <label className="rewinds-search">
        <span>Search Friend :</span>
        <input
          placeholder={
            activeTab === 'rewinds' ? 'Search by rewind owner' : 'Search by participant'
          }
          type="text"
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
        />
      </label>
    </>
  )
}
