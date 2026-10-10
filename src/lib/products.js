// Price display for a PRODUCTS entry: "$100" + "/month", or the label for unpriced products.
export const priceText = (p) => (p.price != null ? `$${p.price}` : p.priceLabel)
export const perText = (p) => (p.price != null ? (p.priceNote ?? '/month') : '')
