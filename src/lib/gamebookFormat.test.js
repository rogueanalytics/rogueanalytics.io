// Game Book formatting. Run with `npm test` (Node's built-in runner; no extra dependencies).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  advantage, american, better, fmt, kickedOff, kickoffText, lineNum, lineText, ordinal, pdfTitle, prob,
  probPoints, rankText, signed, spreadGapText, totalGapText,
} from './gamebookFormat.js'

const M = '−'

test('values format by payload format, missing as a dash', () => {
  assert.equal(fmt(0.4271, 'dec3'), '0.427')
  assert.equal(fmt(-0.1342, 'dec3'), `${M}0.134`)
  assert.equal(fmt(0.573, 'pct'), '57.3%')
  assert.equal(fmt(2052, 'int'), '2,052')
  assert.equal(fmt(7.93, 'dec2'), '7.93')
  assert.equal(fmt(null, 'pct'), '—')
  assert.equal(fmt(NaN, 'dec1'), '—')
  assert.equal(fmt('', 'dec1'), '—')
})

test('signs, odds and probabilities', () => {
  assert.equal(signed(2.4), '+2.4')
  assert.equal(signed(-10.71), `${M}10.7`)
  assert.equal(signed(0.04), '0.0')
  assert.equal(american(195), '+195')
  assert.equal(american(-408), `${M}408`)
  assert.equal(american(null), '—')
  assert.equal(prob(0.803), '80.3%')
  assert.equal(probPoints(0.303), '+30.3 pts')
  assert.equal(probPoints(-0.031), `${M}3.1 pts`)
})

test('the home line is said from the favourite', () => {
  // Spreads are away minus home: negative favours the home team.
  assert.equal(lineText(-2, 'Alabama', 'Georgia'), `Alabama ${M}2.0`)
  assert.equal(lineText(10, 'BYU', 'Notre Dame'), `Notre Dame ${M}10.0`)
  assert.equal(lineText(0, 'A', 'B'), "Pick'em")
  assert.equal(lineText(null, 'A', 'B'), '—')
})

test('betting numbers keep quarter points', () => {
  assert.equal(lineNum(53.25), '53.25')
  assert.equal(lineNum(51.3), '51.3')
  assert.equal(lineNum(48.5), '48.5')
  assert.equal(lineNum(50), '50.0')
  assert.equal(lineText(-15.75, 'ORST', 'SDSU'), `ORST ${M}15.75`)
  assert.equal(lineNum(null), '—')
})

test('model-vs-market gaps read in the right direction', () => {
  // Rogue minus market on the home line: negative = more favourable to the home team.
  assert.equal(spreadGapText(-2.1, 'Alabama', 'Georgia'), '2.1 pts more favorable to Alabama')
  assert.equal(spreadGapText(3.3, 'BYU', 'Notre Dame'), '3.3 pts more favorable to Notre Dame')
  assert.equal(spreadGapText(0, 'A', 'B'), 'Matches the market')
  assert.equal(totalGapText(11.8), '11.8 pts higher than the market')
  assert.equal(totalGapText(-4.2), '4.2 pts lower than the market')
})

test('advantage labels never rely on colour', () => {
  assert.deepEqual(advantage(0.5), { tone: 'off', label: 'Strong offense advantage', short: '▲▲ Offense' })
  assert.deepEqual(advantage(0.3), { tone: 'off', label: 'Clear offense advantage', short: '▲ Offense' })
  assert.deepEqual(advantage(-0.3), { tone: 'def', label: 'Clear defense advantage', short: '▼ Defense' })
  assert.equal(advantage(0.1).short, 'Even')
  assert.equal(advantage(null).label, 'Not scored')
  for (const v of [0.5, 0.3, -0.3, -0.6, 0.1, null]) assert.match(advantage(v).short, /[A-Za-z—]/)
})

test('ranks and the better of two cells', () => {
  assert.equal(ordinal(1), '1st')
  assert.equal(ordinal(12), '12th')
  assert.equal(ordinal(103), '103rd')
  assert.equal(ordinal(111), '111th')
  assert.equal(rankText({ rank: 8, of: 138 }), '8th of 138')
  assert.equal(rankText({ rank: null }), '')
  assert.equal(better({ pct: 0.9 }, { pct: 0.8 }), 'a')
  assert.equal(better({ pct: 0.5 }, { pct: 0.5 }), null)
  assert.equal(better({ pct: null }, { pct: 0.8 }), null)
})

test('kickoff in Eastern time; midnight means time TBA', () => {
  assert.equal(kickoffText('2026-10-10T23:30:00.000Z'), 'Saturday, October 10, 2026 · 7:30 PM ET')
  assert.equal(kickoffText('2026-10-17T04:00:00.000Z'), 'Saturday, October 17, 2026 · time TBA')
  assert.equal(kickoffText(null), 'Kickoff to be announced')
  assert.equal(kickedOff('2026-10-10T23:30:00Z', Date.parse('2026-10-11T00:00:00Z')), true)
  assert.equal(kickedOff('2026-10-10T23:30:00Z', Date.parse('2026-10-10T12:00:00Z')), false)
})

test('the sample payload is internally consistent', () => {
  // The dev fixture is a real Command Center payload: what the page renders must reconcile.
  const book = JSON.parse(readFileSync(new URL('../dev/gamebooks/books/401856712.json', import.meta.url), 'utf8'))
  const { market: m, model: r } = book
  assert.ok(Math.abs(m.home_team_total + m.away_team_total - m.total) < 0.02)
  assert.ok(Math.abs(m.away_team_total - m.home_team_total - m.spread) < 0.02)
  assert.ok(Math.abs(r.home_points + r.away_points - r.total) < 0.15)
  assert.ok(Math.abs(r.away_points - r.home_points - r.spread) < 0.15)
  assert.ok(Math.abs(m.home_novig_prob + m.away_novig_prob - 1) < 0.002)
  const rows = Object.fromEntries(book.comparison.map((c) => [c.key, c]))
  assert.equal(rows.spread.difference, Number((r.spread - m.spread).toFixed(1)))
  assert.equal(pdfTitle(book), `Rogue-Game-Book-${book.game.season}-Week-${book.game.week}-Georgia-at-Alabama`)
  // Nothing from excluded products.
  const text = JSON.stringify(book).toLowerCase()
  for (const w of ['ourlads', 'depth_chart', 'player_id', 'props', 'providers']) assert.ok(!text.includes(w), w)
})
