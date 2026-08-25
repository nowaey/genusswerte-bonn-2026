import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { TastingType } from '../types'
import { TASTING_LABELS } from '../types'

const GW_GREEN = '#1c3a2e'
const GW_GOLD  = '#c9a84c'
const GW_CREAM = '#f9f5ef'

interface Stats {
  ordersTotal: number
  ordersPaid: number
  vouchersActive: number
  vouchersScheduled: number
  reservationsTotal: number
}

interface Bucket {
  start: Date
  end: Date
  label: string
  revenue: number
}

interface TastingRevenue {
  tasting_type: TastingType
  revenue: number
  count: number
}

type RangeKey = 'day' | '3days' | 'week' | 'month' | 'year'

const RANGES: { key: RangeKey; label: string }[] = [
  { key: 'day',    label: 'Tag' },
  { key: '3days',  label: '3 Tage' },
  { key: 'week',   label: '1 Woche' },
  { key: 'month',  label: '1 Monat' },
  { key: 'year',   label: '1 Jahr' },
]

function buildBuckets(range: RangeKey): Omit<Bucket, 'revenue'>[] {
  const now = new Date()

  if (range === 'day') {
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0)
    return Array.from({ length: 24 }, (_, h) => {
      const start = new Date(dayStart); start.setHours(h)
      const end = new Date(start); end.setHours(h + 1)
      return { start, end, label: `${String(h).padStart(2, '0')}h` }
    })
  }

  if (range === '3days') {
    const base = new Date(now); base.setHours(0, 0, 0, 0); base.setDate(base.getDate() - 2)
    return Array.from({ length: 24 }, (_, i) => {
      const start = new Date(base); start.setHours(i * 3)
      const end = new Date(start); end.setHours(start.getHours() + 3)
      return {
        start, end,
        label: `${start.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} ${String(start.getHours()).padStart(2, '0')}h`,
      }
    })
  }

  if (range === 'week') {
    const base = new Date(now); base.setHours(0, 0, 0, 0); base.setDate(base.getDate() - 6)
    return Array.from({ length: 7 }, (_, i) => {
      const start = new Date(base); start.setDate(base.getDate() + i)
      const end = new Date(start); end.setDate(start.getDate() + 1)
      return { start, end, label: start.toLocaleDateString('de-DE', { weekday: 'short' }) }
    })
  }

  if (range === 'month') {
    const base = new Date(now); base.setHours(0, 0, 0, 0); base.setDate(base.getDate() - 29)
    return Array.from({ length: 30 }, (_, i) => {
      const start = new Date(base); start.setDate(base.getDate() + i)
      const end = new Date(start); end.setDate(start.getDate() + 1)
      return { start, end, label: start.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) }
    })
  }

  // year — 12 Kalendermonate
  const base = new Date(now.getFullYear(), now.getMonth() - 11, 1)
  return Array.from({ length: 12 }, (_, i) => {
    const start = new Date(base.getFullYear(), base.getMonth() + i, 1)
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
    return { start, end, label: start.toLocaleDateString('de-DE', { month: 'short' }) }
  })
}

export function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [range, setRange] = useState<RangeKey>('month')
  const [buckets, setBuckets] = useState<Bucket[]>([])
  const [prevPeriodRevenue, setPrevPeriodRevenue] = useState(0)
  const [typeBreakdown, setTypeBreakdown] = useState<TastingRevenue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Basis-Statistiken nur einmal laden
  useEffect(() => {
    async function loadStats() {
      const [orders, vouchers, reservations] = await Promise.all([
        supabase.from('orders').select('payment_status'),
        supabase.from('vouchers').select('status'),
        supabase.from('voucher_reservations').select('id'),
      ])
      const firstError = [orders, vouchers, reservations].map(r => r.error).find(Boolean)
      if (firstError) setError(`Statistiken konnten nicht vollständig geladen werden: ${firstError.message}`)

      const o = orders.data ?? []
      const v = vouchers.data ?? []
      setStats({
        ordersTotal:         o.length,
        ordersPaid:          o.filter(x => x.payment_status === 'paid').length,
        vouchersActive:      v.filter(x => x.status === 'active').length,
        vouchersScheduled:   v.filter(x => x.status === 'scheduled').length,
        reservationsTotal:   reservations.data?.length ?? 0,
      })
    }
    loadStats()
  }, [])

  // Umsatz-Chart neu laden, sobald sich der Zeitraum ändert
  useEffect(() => {
    async function loadRevenue() {
      setLoading(true)
      const shape = buildBuckets(range)
      const currentStart = shape[0].start
      const currentEnd   = shape[shape.length - 1].end
      const spanMs       = currentEnd.getTime() - currentStart.getTime()
      const prevStart    = new Date(currentStart.getTime() - spanMs)

      const [trendRes, typeRes] = await Promise.all([
        supabase
          .from('orders')
          .select('created_at, total_amount')
          .eq('order_type', 'tasting_voucher')
          .eq('payment_status', 'paid')
          .gte('created_at', prevStart.toISOString())
          .lt('created_at', currentEnd.toISOString()),
        supabase
          .from('vouchers')
          .select('tasting_type, orders!inner(created_at, payment_status, total_amount)')
          .eq('orders.payment_status', 'paid')
          .gte('orders.created_at', currentStart.toISOString())
          .lt('orders.created_at', currentEnd.toISOString()),
      ])

      if (trendRes.error) {
        setError(`Umsatzdaten konnten nicht geladen werden: ${trendRes.error.message}`)
        setLoading(false)
        return
      }
      if (typeRes.error) {
        setError(`Umsatz nach Tasting-Art konnte nicht geladen werden: ${typeRes.error.message}`)
      }

      const filled: Bucket[] = shape.map(b => ({ ...b, revenue: 0 }))
      let prevRevenue = 0

      for (const row of trendRes.data ?? []) {
        const t = new Date(row.created_at).getTime()
        const amount = Number(row.total_amount) || 0
        if (t < currentStart.getTime()) {
          prevRevenue += amount
          continue
        }
        const bucket = filled.find(b => t >= b.start.getTime() && t < b.end.getTime())
        if (bucket) bucket.revenue += amount
      }

      const byType = new Map<TastingType, TastingRevenue>()
      for (const row of (typeRes.data ?? []) as unknown as { tasting_type: TastingType; orders: { total_amount: number } }[]) {
        const amount = Number(row.orders?.total_amount) || 0
        const existing = byType.get(row.tasting_type)
        if (existing) {
          existing.revenue += amount
          existing.count += 1
        } else {
          byType.set(row.tasting_type, { tasting_type: row.tasting_type, revenue: amount, count: 1 })
        }
      }

      setBuckets(filled)
      setPrevPeriodRevenue(prevRevenue)
      setTypeBreakdown(Array.from(byType.values()).sort((a, b) => b.revenue - a.revenue))
      setLoading(false)
    }
    loadRevenue()
  }, [range])

  const totalRevenue = buckets.reduce((sum, b) => sum + b.revenue, 0)
  const change = prevPeriodRevenue > 0
    ? ((totalRevenue - prevPeriodRevenue) / prevPeriodRevenue) * 100
    : (totalRevenue > 0 ? 100 : 0)

  return (
    <div>
      <h1 style={styles.h1}>Dashboard</h1>

      {error && (
        <div style={styles.errorBanner}>
          <strong>Fehler:</strong> {error}
          <button onClick={() => setError(null)} style={styles.errorClose} aria-label="Schließen">×</button>
        </div>
      )}

      <div style={styles.grid}>
        {stats && (
          <>
            <StatCard label="Bestellungen gesamt"  value={stats.ordersTotal}       icon="orders" />
            <StatCard label="Davon bezahlt"         value={stats.ordersPaid}        icon="paid" accent />
            <StatCard label="Gutscheine aktiv"      value={stats.vouchersActive}    icon="voucher" />
            <StatCard label="Gutscheine mit Termin" value={stats.vouchersScheduled} icon="calendar" />
            <StatCard label="Reservierungen"        value={stats.reservationsTotal} icon="users" />
          </>
        )}
      </div>

      <div style={styles.dashRow}>
        <div style={styles.chartCard}>
          <div style={styles.chartHeader}>
            <div>
              <p style={styles.chartEyebrow}>Umsatz aus Tasting-Buchungen</p>
              <div style={styles.chartTotalRow}>
                <span style={styles.chartTotalValue}>{totalRevenue.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €</span>
                {prevPeriodRevenue > 0 && (
                  <span style={{ ...styles.changeTag, ...(change >= 0 ? styles.changePositive : styles.changeNegative) }}>
                    {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
                  </span>
                )}
              </div>
              <p style={styles.chartSub}>ggü. dem gleich langen Zeitraum davor</p>
            </div>

            <RangeDropdown value={range} onChange={setRange} />
          </div>

          {loading ? (
            <p style={styles.loading}>Laden …</p>
          ) : (
            <RevenueChart buckets={buckets} />
          )}
        </div>

        <div style={styles.breakdownCard}>
          <p style={styles.chartEyebrow}>Umsatz nach Tasting-Art</p>
          <p style={styles.chartSub}>{RANGES.find(r => r.key === range)!.label} · gleicher Zeitraum wie links</p>

          {loading ? (
            <p style={styles.loading}>Laden …</p>
          ) : typeBreakdown.length === 0 ? (
            <p style={styles.chartEmpty}>Keine Buchungen in diesem Zeitraum.</p>
          ) : (
            <TastingBreakdownList rows={typeBreakdown} />
          )}
        </div>
      </div>
    </div>
  )
}

function TastingBreakdownList({ rows }: { rows: TastingRevenue[] }) {
  const max = Math.max(...rows.map(r => r.revenue), 1)
  return (
    <div style={styles.breakdownList}>
      {rows.map(r => (
        <div key={r.tasting_type} style={styles.breakdownRow}>
          <div style={styles.breakdownTop}>
            <span style={styles.breakdownLabel}>{TASTING_LABELS[r.tasting_type]}</span>
            <span style={styles.breakdownValue}>{r.revenue.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €</span>
          </div>
          <div style={styles.breakdownBarTrack}>
            <div style={{ ...styles.breakdownBarFill, width: `${Math.max((r.revenue / max) * 100, 3)}%` }} />
          </div>
          <span style={styles.breakdownCount}>{r.count} {r.count === 1 ? 'Buchung' : 'Buchungen'}</span>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// ZEITRAUM-DROPDOWN — ein Button mit aktuellem Zeitraum, öffnet
// beim Klick eine kompakte Auswahl statt 5 Buttons dauerhaft zu zeigen.
// ============================================================
function RangeDropdown({ value, onChange }: { value: RangeKey; onChange: (r: RangeKey) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = RANGES.find(r => r.key === value)!

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div ref={ref} style={styles.dropdownWrap}>
      <button onClick={() => setOpen(v => !v)} style={styles.dropdownBtn}>
        {current.label}
        <span style={{ ...styles.dropdownChevron, transform: open ? 'rotate(180deg)' : 'none' }}>⌄</span>
      </button>
      {open && (
        <div style={styles.dropdownMenu}>
          {RANGES.map(r => (
            <button
              key={r.key}
              onClick={() => { onChange(r.key); setOpen(false) }}
              style={{ ...styles.dropdownItem, ...(r.key === value ? styles.dropdownItemActive : {}) }}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// REVENUE CHART — handgebaute SVG-Flächenkurve mit Verlauf,
// Crosshair + Tooltip beim Hovern. Eine Serie → kein Farb-Overload,
// bewusst in Gold/Grün statt generischem Blau.
// ============================================================
function RevenueChart({ buckets }: { buckets: Bucket[] }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const W = 100
  const H = 46
  const padTop = 6
  const padBottom = 8

  if (buckets.length === 0 || buckets.every(b => b.revenue === 0)) {
    return <p style={styles.chartEmpty}>Noch keine bezahlten Tasting-Buchungen in diesem Zeitraum.</p>
  }

  const max = Math.max(...buckets.map(b => b.revenue), 1)
  const points = buckets.map((b, i) => ({
    x: (i / (buckets.length - 1 || 1)) * W,
    y: padTop + (1 - b.revenue / max) * (H - padTop - padBottom),
    revenue: b.revenue,
    label: b.label,
  }))

  const linePath = smoothPath(points)
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${H} L ${points[0].x} ${H} Z`

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect) return
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1)
    const idx = Math.round(ratio * (points.length - 1))
    setHoverIdx(idx)
  }

  const hp = hoverIdx !== null ? points[hoverIdx] : null
  // Nicht jedes Label anzeigen, wenn viele Balken (sonst Kauderwelsch)
  const labelStep = Math.max(1, Math.ceil(points.length / 8))

  return (
    <div
      ref={wrapRef}
      style={styles.chartWrap}
      onMouseMove={handleMove}
      onMouseLeave={() => setHoverIdx(null)}
    >
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={styles.svg}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GW_GOLD} stopOpacity="0.35" />
            <stop offset="100%" stopColor={GW_GOLD} stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map(f => (
          <line key={f} x1="0" x2={W} y1={padTop + f * (H - padTop - padBottom)} y2={padTop + f * (H - padTop - padBottom)}
            stroke="#ece6d9" strokeWidth="0.3" />
        ))}

        <path d={areaPath} fill="url(#revenueFill)" stroke="none" />
        <path d={linePath} fill="none" stroke={GW_GREEN} strokeWidth="0.7" strokeLinecap="round" />

        {hp && (
          <>
            <line x1={hp.x} x2={hp.x} y1={padTop} y2={H} stroke={GW_GREEN} strokeWidth="0.25" strokeDasharray="1.2 1.2" />
            <circle cx={hp.x} cy={hp.y} r="1.4" fill={GW_GOLD} stroke={GW_GREEN} strokeWidth="0.4" />
          </>
        )}
      </svg>

      {hp && (
        <div
          style={{
            ...styles.tooltip,
            left: `${(hp.x / W) * 100}%`,
            ...(hp.x > W * 0.7 ? { transform: 'translate(-100%, 0)' } : hp.x < W * 0.3 ? { transform: 'translate(0, 0)' } : { transform: 'translate(-50%, 0)' }),
          }}
        >
          <strong>{hp.revenue.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €</strong>
          <span>{hp.label}</span>
        </div>
      )}

      <div style={styles.labels}>
        {points.map((p, i) => (
          <span key={i} style={styles.labelItem}>
            {i % labelStep === 0 ? p.label : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return points.length === 1 ? `M ${points[0].x} ${points[0].y}` : ''
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i]
    const p1 = points[i + 1]
    const midX = (p0.x + p1.x) / 2
    const midY = (p0.y + p1.y) / 2
    d += ` Q ${p0.x} ${p0.y} ${midX} ${midY}`
  }
  const last = points[points.length - 1]
  d += ` L ${last.x} ${last.y}`
  return d
}

const ICONS: Record<string, JSX.Element> = {
  orders: (
    <path d="M6 8h12l-1 12.5a1.5 1.5 0 0 1-1.5 1.5h-7a1.5 1.5 0 0 1-1.5-1.5L6 8Zm3 0V6a3 3 0 0 1 6 0v2" />
  ),
  paid: (
    <path d="M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm-3.2 8.7 2.1 2.1 4.3-4.3" />
  ),
  voucher: (
    <path d="M3.5 9.5a2 2 0 0 0 0-4V4.5a1 1 0 0 1 1-1h15a1 1 0 0 1 1 1V5.5a2 2 0 0 0 0 4v0a2 2 0 0 0 0 4v1a2 2 0 0 0 0 4v1a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-1a2 2 0 0 0 0-4v0a2 2 0 0 0 0-4ZM9 4v16" />
  ),
  calendar: (
    <path d="M8 2v3M16 2v3M3.5 4.5h17v17h-17v-17Zm0 5h17M8 14l2 2 4-4" />
  ),
  clock: (
    <path d="M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm0 4V12l3.5 2" />
  ),
  users: (
    <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2.5 20c.6-3.2 3-5 5.5-5s4.9 1.8 5.5 5M13 15.3c2 .3 3.7 1.9 4.2 4.7h4c-.4-2.6-1.9-4.3-3.7-4.9" />
  ),
}

function StatCard({ label, value, icon, accent }: { label: string; value: number; icon: string; accent?: boolean }) {
  return (
    <div style={{ ...styles.card, ...(accent ? styles.cardAccent : {}) }}>
      <div style={styles.cardIconWrap}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GW_GREEN} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          {ICONS[icon]}
        </svg>
      </div>
      <span style={styles.cardValue}>{value}</span>
      <span style={styles.cardLabel}>{label}</span>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  h1: { fontSize: 24, fontWeight: 600, color: GW_GREEN, marginBottom: 24, fontFamily: 'Georgia, serif' },
  errorBanner: {
    background: '#fdecea', border: '1px solid #f3c1bb', color: '#8a2e22',
    borderRadius: 6, padding: '10px 14px', marginBottom: 20, fontSize: 13,
    position: 'relative', paddingRight: 32,
  },
  errorClose: {
    position: 'absolute', top: 6, right: 8, background: 'transparent', border: 'none',
    fontSize: 16, cursor: 'pointer', color: '#8a2e22', lineHeight: 1,
  },
  loading: { color: '#8a8378', fontSize: 14 },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 16,
    marginBottom: 24,
  },
  card: {
    background: '#fff', borderRadius: 10, padding: '18px 20px',
    display: 'flex', flexDirection: 'column', gap: 8,
    boxShadow: '0 1px 4px rgba(28,58,46,0.06)', border: '1px solid #ece6d9',
  },
  cardAccent: { borderLeft: `3px solid ${GW_GOLD}` },
  cardIconWrap: {
    width: 30, height: 30, borderRadius: 8, background: 'rgba(28,58,46,0.06)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 2,
  },
  cardValue: { fontSize: 26, fontWeight: 700, color: GW_GREEN, lineHeight: 1 },
  cardLabel: { fontSize: 12.5, color: '#8a8378' },

  dashRow: {
    display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(240px, 1fr)', gap: 20,
  },
  chartCard: {
    background: '#fff', borderRadius: 10, padding: '26px 28px 20px',
    boxShadow: '0 1px 4px rgba(28,58,46,0.06)', border: '1px solid #ece6d9', minWidth: 0,
  },
  breakdownCard: {
    background: '#fff', borderRadius: 10, padding: '26px 24px',
    boxShadow: '0 1px 4px rgba(28,58,46,0.06)', border: '1px solid #ece6d9', minWidth: 0,
  },
  breakdownList: { display: 'flex', flexDirection: 'column', gap: 16, marginTop: 18 },
  breakdownRow: { display: 'flex', flexDirection: 'column', gap: 5 },
  breakdownTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  breakdownLabel: { fontSize: 13, color: '#3a352c', fontWeight: 500 },
  breakdownValue: { fontSize: 13, color: GW_GREEN, fontWeight: 700, whiteSpace: 'nowrap' },
  breakdownBarTrack: { height: 6, background: '#f2ede1', borderRadius: 3, overflow: 'hidden' },
  breakdownBarFill: { height: '100%', background: GW_GOLD, borderRadius: 3 },
  breakdownCount: { fontSize: 11, color: '#8a8378' },
  chartHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    flexWrap: 'wrap', gap: 16, marginBottom: 8,
  },
  chartEyebrow: { fontSize: 12, color: '#8a8378', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 },
  chartTotalRow: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 },
  chartTotalValue: { fontSize: 30, fontWeight: 700, color: GW_GREEN, fontFamily: 'Georgia, serif' },
  changeTag: { fontSize: 12.5, fontWeight: 600, padding: '3px 8px', borderRadius: 12 },
  changePositive: { background: '#e8f0ec', color: '#1c3a2e' },
  changeNegative: { background: '#fdecea', color: '#c0392b' },
  chartSub: { fontSize: 12, color: '#8a8378', margin: '4px 0 0' },
  chartEmpty: { color: '#8a8378', fontSize: 13, padding: '20px 0' },

  dropdownWrap: { position: 'relative' },
  dropdownBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '8px 14px', border: '1px solid #ddd3bd', borderRadius: 8, background: '#fff',
    fontSize: 13, color: GW_GREEN, cursor: 'pointer', fontWeight: 600,
  },
  dropdownChevron: { fontSize: 12, color: '#8a8378', transition: 'transform 0.15s' },
  dropdownMenu: {
    position: 'absolute', top: 'calc(100% + 6px)', right: 0, minWidth: 130,
    background: '#fff', border: '1px solid #ece6d9', borderRadius: 8,
    boxShadow: '0 4px 16px rgba(28,58,46,0.12)', padding: 4, zIndex: 10,
    display: 'flex', flexDirection: 'column', gap: 2,
  },
  dropdownItem: {
    padding: '8px 12px', border: 'none', borderRadius: 6, background: 'transparent',
    fontSize: 13, color: '#3a352c', cursor: 'pointer', textAlign: 'left', width: '100%',
  },
  dropdownItemActive: { background: 'rgba(28,58,46,0.08)', color: GW_GREEN, fontWeight: 600 },

  chartWrap: { position: 'relative', marginTop: 14 },
  svg: { width: '100%', height: 160, display: 'block' },
  labels: { display: 'flex', justifyContent: 'space-between', marginTop: 4 },
  labelItem: { fontSize: 10.5, color: '#8a8378', flex: 1, textAlign: 'center', whiteSpace: 'nowrap' },
  tooltip: {
    position: 'absolute', top: 4, background: GW_GREEN, color: GW_CREAM, borderRadius: 6,
    padding: '6px 10px', fontSize: 11.5, whiteSpace: 'nowrap', display: 'flex',
    flexDirection: 'column', alignItems: 'center', gap: 1, zIndex: 5, pointerEvents: 'none',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  },
}
