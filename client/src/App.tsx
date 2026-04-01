import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import './App.css'

type Player = {
  playerId: number
  playerName: string
  teamId: number
  teamAbbr: string
  gp: number
  min: number
  pts: number
  reb: number
  ast: number
  stl: number
  blk: number
  tov: number
  fgPct: number | null
  fg3Pct: number | null
  ftPct: number | null
}

type PlayersResponse = {
  season: string
  seasonType: string
  perMode: string
  total: number
  offset: number
  limit: number
  players: Player[]
  teams: string[]
}

const PAGE_SIZE = 25
const SORT_KEYS = [
  'pts',
  'reb',
  'ast',
  'stl',
  'blk',
  'min',
  'gp',
] as const
type SortKey = (typeof SORT_KEYS)[number]

function formatPct(n: number | null) {
  if (n == null || Number.isNaN(n)) return '—'
  return `${(n * 100).toFixed(1)}%`
}

export default function App() {
  const [seasonLabel, setSeasonLabel] = useState<string>('')
  const [search, setSearch] = useState('')
  const [team, setTeam] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('pts')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(0)
  const [data, setData] = useState<PlayersResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Player | null>(null)

  useEffect(() => {
    fetch('/api/season/current')
      .then((r) => r.json())
      .then((j: { season?: string }) => setSeasonLabel(j.season ?? ''))
      .catch(() => setSeasonLabel(''))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({
      search: search.trim(),
      sortBy,
      sortDir,
      limit: String(PAGE_SIZE),
      offset: String(page * PAGE_SIZE),
    })
    if (team) params.set('team', team)
    try {
      const res = await fetch(`/api/players?${params}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(
          typeof err?.error === 'string' ? err.error : res.statusText,
        )
      }
      const json = (await res.json()) as PlayersResponse
      setData(json)
    } catch (e) {
      setData(null)
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }, [search, team, sortBy, sortDir, page])

  useEffect(() => {
    void load()
  }, [load])

  const teams = data?.teams ?? []
  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / PAGE_SIZE))
    : 1

  const chartRows = useMemo(() => {
    if (!selected) return []
    return [
      { label: 'PTS', value: selected.pts },
      { label: 'REB', value: selected.reb },
      { label: 'AST', value: selected.ast },
      { label: 'STL', value: selected.stl },
      { label: 'BLK', value: selected.blk },
    ]
  }, [selected])

  function toggleSort(key: SortKey) {
    if (sortBy === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortBy(key)
      setSortDir('desc')
    }
    setPage(0)
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1 className="title">NBA player stats</h1>
          <p className="subtitle">
            Per-game averages
            {seasonLabel ? (
              <>
                {' · '}
                <span className="season">{seasonLabel}</span>
              </>
            ) : null}
          </p>
        </div>
      </header>

      <div className="controls">
        <label className="field">
          <span className="label">Search</span>
          <input
            type="search"
            className="input"
            placeholder="Player name…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
            autoComplete="off"
          />
        </label>
        <label className="field">
          <span className="label">Team</span>
          <select
            className="select"
            value={team}
            onChange={(e) => {
              setTeam(e.target.value)
              setPage(0)
            }}
          >
            <option value="">All teams</option>
            {teams.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <div className="field grow">
          <span className="label">Sort</span>
          <div className="sort-chips">
            {SORT_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                className={`chip ${sortBy === k ? 'active' : ''}`}
                onClick={() => toggleSort(k)}
              >
                {k.toUpperCase()}
                {sortBy === k ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error ? (
        <div className="banner error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="layout">
        <section className="table-wrap">
          {loading ? (
            <p className="muted center pad">Loading…</p>
          ) : data && data.players.length === 0 ? (
            <p className="muted center pad">No players match your filters.</p>
          ) : (
            <div className="table-scroll">
              <table className="stats-table">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Team</th>
                    <th className="num">GP</th>
                    <th className="num">MIN</th>
                    <th className="num">PTS</th>
                    <th className="num">REB</th>
                    <th className="num">AST</th>
                    <th className="num">STL</th>
                    <th className="num">BLK</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.players.map((p) => (
                    <tr
                      key={`${p.playerId}-${p.teamId}`}
                      className={
                        selected?.playerId === p.playerId &&
                        selected?.teamId === p.teamId
                          ? 'selected'
                          : ''
                      }
                      onClick={() => setSelected(p)}
                    >
                      <td className="name">{p.playerName}</td>
                      <td>{p.teamAbbr}</td>
                      <td className="num">{p.gp}</td>
                      <td className="num">{p.min.toFixed(1)}</td>
                      <td className="num emph">{p.pts.toFixed(1)}</td>
                      <td className="num">{p.reb.toFixed(1)}</td>
                      <td className="num">{p.ast.toFixed(1)}</td>
                      <td className="num">{p.stl.toFixed(1)}</td>
                      <td className="num">{p.blk.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data && !loading ? (
            <div className="pager">
              <button
                type="button"
                className="btn"
                disabled={page <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </button>
              <span className="pager-info">
                Page {page + 1} of {totalPages}
                <span className="muted">
                  {' '}
                  ({data.total} players)
                </span>
              </span>
              <button
                type="button"
                className="btn"
                disabled={page >= totalPages - 1}
                onClick={() =>
                  setPage((p) => Math.min(totalPages - 1, p + 1))
                }
              >
                Next
              </button>
            </div>
          ) : null}
        </section>

        <aside className="detail">
          <h2 className="detail-title">Player snapshot</h2>
          {!selected ? (
            <p className="muted">
              Select a row in the table to see per-game averages charted.
            </p>
          ) : (
            <>
              <p className="detail-name">{selected.playerName}</p>
              <p className="detail-meta">
                {selected.teamAbbr} · {data?.season ?? seasonLabel} ·{' '}
                {selected.gp} GP · {selected.min.toFixed(1)} MIN
              </p>
              <div className="chart-box">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={chartRows}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} width={32} />
                    <Tooltip />
                    <Bar dataKey="value" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <dl className="pct-grid">
                <div>
                  <dt>FG%</dt>
                  <dd>{formatPct(selected.fgPct)}</dd>
                </div>
                <div>
                  <dt>3P%</dt>
                  <dd>{formatPct(selected.fg3Pct)}</dd>
                </div>
                <div>
                  <dt>FT%</dt>
                  <dd>{formatPct(selected.ftPct)}</dd>
                </div>
              </dl>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
