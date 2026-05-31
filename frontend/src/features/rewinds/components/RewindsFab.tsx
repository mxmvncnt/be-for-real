import { Link } from 'react-router-dom'

type RewindsFabProps = {
  onOpenComposer: () => void
}

export function RewindsFab({ onOpenComposer }: RewindsFabProps) {
  return (
    <aside className="rewinds-fab">
      <div className="rewinds-fab__bubble" />
      <Link className="rewinds-action rewinds-action--lime" to="/camera">
        <span className="rewinds-action__icon">REC</span>
        <span>Record today&apos;s clip</span>
      </Link>
      <button className="rewinds-action rewinds-action--cyan" type="button" onClick={onOpenComposer}>
        <span className="rewinds-action__icon">MIX</span>
        <span>Make Multi-Rewind</span>
      </button>
    </aside>
  )
}
