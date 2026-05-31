import { Link } from 'react-router-dom'
import multiActionIcon from '../../../assets/action-multi.svg'
import recordActionIcon from '../../../assets/action-record.svg'

type RewindsFabProps = {
  onOpenComposer: () => void
}

export function RewindsFab({ onOpenComposer }: RewindsFabProps) {
  return (
    <aside className="rewinds-fab">
      <div className="rewinds-fab__bubble" />
      <Link className="rewinds-action rewinds-action--lime" to="/camera">
        <img className="rewinds-action__icon" src={recordActionIcon} alt="" aria-hidden="true" />
        <span>Record today&apos;s clip</span>
      </Link>
      <button className="rewinds-action rewinds-action--cyan" type="button" onClick={onOpenComposer}>
        <img className="rewinds-action__icon" src={multiActionIcon} alt="" aria-hidden="true" />
        <span>Make Multi-Rewind</span>
      </button>
    </aside>
  )
}
