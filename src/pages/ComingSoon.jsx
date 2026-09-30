export default function ComingSoon({ sport, title }) {
  return (
    <section className="dark hero hero--tall">
      <div className="wrap hero-in">
        <span className="eb">{sport}</span>
        <h1 className="disp h1">{title}</h1>
        <p className="lede">Coming soon.</p>
      </div>
    </section>
  )
}
