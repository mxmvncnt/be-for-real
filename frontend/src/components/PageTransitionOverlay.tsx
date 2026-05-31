type PageTransitionOverlayProps = {
  active: boolean
}

export function PageTransitionOverlay({ active }: PageTransitionOverlayProps) {
  return (
    <div className={`page-transition-overlay${active ? ' is-active' : ''}`}>
      <span className="transition-loading">
        Loading<span className="transition-loading__dots" />
      </span>
      {Array.from({ length: 14 }).map((_, index) => (
        <span key={`sparkle-${index}`} className="transition-sparkle" />
      ))}
      {Array.from({ length: 10 }).map((_, index) => (
        <span key={`bubble-${index}`} className="bubble" />
      ))}
    </div>
  )
}
