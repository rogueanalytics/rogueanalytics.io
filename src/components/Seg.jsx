// Segmented button group. options: [id, text] pairs.
export default function Seg({ label, options, value, onChange, small = false }) {
  return (
    <div className={`seg${small ? ' seg--sm' : ''}`} role="group" aria-label={label}>
      {options.map(([id, text]) => (
        <button
          key={id}
          type="button"
          aria-pressed={value === id}
          className={`seg-btn${value === id ? ' on' : ''}`}
          onClick={() => onChange(id)}
        >
          {text}
        </button>
      ))}
    </div>
  )
}
