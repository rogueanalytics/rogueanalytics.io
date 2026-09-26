import { DROP_SCHEDULE } from '../config.js'

export function ScheduleChips() {
  return (
    <div className="sched-chips">
      {DROP_SCHEDULE.map((s) => (
        <span key={s.label} className="chip">
          {s.label}: {s.time}
          {s.when === 'Friday before' ? ' Friday' : ''}
        </span>
      ))}
    </div>
  )
}

export function ScheduleCards() {
  return (
    <div className="sched-cards">
      {DROP_SCHEDULE.map((s) => (
        <div key={s.label} className="panel sched-card">
          <strong>{s.label}</strong>
          <span className="mono small soft">
            {s.time}, {s.when}
          </span>
        </div>
      ))}
    </div>
  )
}
