import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { SubscribeButton } from './Buttons.jsx'
import { IconCheck, IconDash } from './Icons.jsx'
import { COMPARE_GROUPS, PRODUCTS } from '../config.js'
import { perText, priceText } from '../lib/products.js'
import '../styles/home.css'

// Product comparison, lowest price first. A table on wide screens, one stacked card per
// product on phones (both rendered; CSS picks one). Rows come from COMPARE_GROUPS.

function Cell({ value }) {
  if (value === true)
    return (
      <span className="pt-yes">
        <IconCheck size={16} />
        <span className="sr-only">Included</span>
      </span>
    )
  if (value === false)
    return (
      <span className="pt-no">
        <IconDash size={16} />
        <span className="sr-only">Not included</span>
      </span>
    )
  return <span className="pt-text">{value}</span>
}

function Action({ product }) {
  if (product.status === 'live') return <SubscribeButton className="btn-sm btn-block" />
  if (product.id === 'ncaab_projections')
    return (
      <Link className="btn btn-line btn-sm btn-block" to={product.cta.to}>
        Get launch details
      </Link>
    )
  return (
    <span className="btn btn-soon btn-sm btn-block" aria-disabled="true">
      Coming soon
    </span>
  )
}

const Status = ({ product }) =>
  product.status === 'live' ? <span className="hm-status hm-status--live">Live</span> : <span className="hm-status">Coming soon</span>

export default function PricingTable() {
  return (
    <>
      <div className="table-wrap pt-table">
        <table className="pt">
          <thead>
            <tr>
              <th scope="col">What's included</th>
              {PRODUCTS.map((p) => (
                <th scope="col" key={p.id} className={p.status === 'live' ? 'pt-hl' : ''}>
                  <span className="pt-name">{p.name}</span>
                  <span className="pt-price">
                    {priceText(p)}
                    {perText(p)}
                  </span>
                  <span className="pt-status">
                    <Status product={p} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARE_GROUPS.map((g) => (
              <Fragment key={g.label}>
                {g.rows.map((label) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    {g.values.map((v, i) => (
                      <td key={PRODUCTS[i].id} className={PRODUCTS[i].status === 'live' ? 'pt-hl' : ''}>
                        <Cell value={v} />
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td />
              {PRODUCTS.map((p) => (
                <td key={p.id} className={p.status === 'live' ? 'pt-hl' : ''}>
                  <Action product={p} />
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="pt-cards">
        {PRODUCTS.map((p) => (
          <div key={p.id} className={`pt-card${p.status === 'live' ? ' pt-card--live' : ''}`}>
            <div className="pt-card-top">
              <h3 className="pt-name">{p.name}</h3>
              <Status product={p} />
            </div>
            <span className="pt-price">
              {priceText(p)}
              {perText(p)}
            </span>
            <dl>
              {/* Included groups list every feature; a group the plan lacks is one dash row. */}
              {COMPARE_GROUPS.flatMap((g) =>
                g.values[PRODUCTS.indexOf(p)]
                  ? g.rows.map((label) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>
                          <Cell value />
                        </dd>
                      </div>
                    ))
                  : [
                      <div key={g.label}>
                        <dt>{g.label}</dt>
                        <dd>
                          <Cell value={false} />
                        </dd>
                      </div>,
                    ],
              )}
            </dl>
            <Action product={p} />
          </div>
        ))}
      </div>
    </>
  )
}
