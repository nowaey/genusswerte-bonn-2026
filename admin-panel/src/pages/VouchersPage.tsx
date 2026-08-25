import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { VoucherOverview } from '../types'
import { TASTING_LABELS, VOUCHER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '../types'

const GW_GREEN = '#1c3a2e'
const GW_GOLD  = '#c9a84c'
const GW_CREAM = '#f9f5ef'

export function VouchersPage() {
  const [vouchers, setVouchers] = useState<VoucherOverview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  const load = () => {
    supabase
      .from('v_voucher_overview')
      .select('*')
      .order('voucher_created_at', { ascending: false })
      .then(({ data, error: loadErr }) => {
        if (loadErr) setError(`Gutscheine konnten nicht geladen werden: ${loadErr.message}`)
        setVouchers((data as VoucherOverview[]) ?? [])
        setLoading(false)
      })
  }

  useEffect(load, [])

  const filtered = filter === 'all' ? vouchers : vouchers.filter(v => v.voucher_status === filter)

  const handleCheckin = async (voucherId: string) => {
    const { error: checkinErr } = await supabase
      .from('vouchers')
      .update({ status: 'checked_in' })
      .eq('id', voucherId)
    if (checkinErr) {
      setError(`Check-in fehlgeschlagen: ${checkinErr.message}`)
      return
    }
    setVouchers(prev =>
      prev.map(v => v.voucher_id === voucherId ? { ...v, voucher_status: 'checked_in' } : v)
    )
  }

  return (
    <div>
      <h1 style={styles.h1}>Gutscheine</h1>
      <p style={styles.sub}>
        Alle verkauften Tasting-Gutscheine — inklusive gebuchtem Termin und Kontaktdaten,
        sobald jemand eingelöst hat.
      </p>

      {error && (
        <div style={styles.errorBanner}>
          <strong>Fehler:</strong> {error}
          <button onClick={() => setError(null)} style={styles.errorClose} aria-label="Schließen">×</button>
        </div>
      )}

      <div style={styles.filters}>
        {(['all', 'active', 'scheduled', 'checked_in', 'cancelled', 'expired'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{ ...styles.filterBtn, ...(filter === s ? styles.filterBtnActive : {}) }}
          >
            {s === 'all' ? 'Alle' : VOUCHER_STATUS_LABELS[s]}
            {s !== 'all' && (
              <span style={{ ...styles.count, ...(filter === s ? styles.countActive : {}) }}>
                {vouchers.filter(v => v.voucher_status === s).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={styles.loading}>Laden …</p>
      ) : filtered.length === 0 ? (
        <p style={styles.empty}>Keine Gutscheine in dieser Kategorie.</p>
      ) : (
        <div style={styles.cards}>
          {filtered.map(v => (
            <VoucherCard key={v.voucher_id} v={v} onCheckin={handleCheckin} />
          ))}
        </div>
      )}
    </div>
  )
}

function VoucherCard({ v, onCheckin }: { v: VoucherOverview; onCheckin: (id: string) => void }) {
  const hasSlot = v.has_reservation && v.slot_date && v.slot_time
  return (
    <div style={styles.card}>
      <div style={styles.cardTop}>
        <div style={styles.cardTopLeft}>
          <code style={styles.code}>{v.voucher_code}</code>
          <span style={styles.tastingName}>{TASTING_LABELS[v.tasting_type]}</span>
          <span style={styles.personsTag}>{v.persons} {v.persons === 1 ? 'Person' : 'Personen'}</span>
          <span style={styles.priceTag}>{Number(v.total_amount).toFixed(2)} €</span>
        </div>
        <div style={styles.cardTopRight}>
          <StatusBadge status={v.voucher_status} label={VOUCHER_STATUS_LABELS[v.voucher_status]} />
          <StatusBadge status={v.payment_status} label={PAYMENT_STATUS_LABELS[v.payment_status]} />
        </div>
      </div>

      <div style={styles.cardGrid}>
        <div style={styles.cardCol}>
          <span style={styles.colLabel}>Käufer</span>
          <span style={styles.colValue}>{v.customer_name}</span>
          <span style={styles.colSub}>{v.customer_email}</span>
          <span style={styles.colSub}>
            Gültig bis {v.valid_until ? new Date(v.valid_until).toLocaleDateString('de-DE') : '—'}
          </span>
        </div>

        <div style={styles.cardCol}>
          <span style={styles.colLabel}>Termin</span>
          {hasSlot ? (
            <>
              <span style={styles.colValue}>
                {new Date(v.slot_date! + 'T00:00:00').toLocaleDateString('de-DE', {
                  weekday: 'short', day: '2-digit', month: '2-digit',
                })}
                {' · '}{v.slot_time!.slice(0, 5)} Uhr
              </span>
            </>
          ) : (
            <span style={styles.colDash}>Noch nicht eingelöst</span>
          )}
        </div>

        <div style={styles.cardCol}>
          <span style={styles.colLabel}>Kontakt bei Buchung</span>
          {hasSlot ? (
            <>
              <span style={styles.colValue}>{v.reservation_customer_name}</span>
              <span style={styles.colSub}>{v.reservation_customer_email}</span>
              {v.reservation_customer_phone && <span style={styles.colSub}>{v.reservation_customer_phone}</span>}
              {v.reservation_customer_address && <span style={styles.colSub}>{v.reservation_customer_address}</span>}
            </>
          ) : (
            <span style={styles.colDash}>—</span>
          )}
        </div>

        <div style={{ ...styles.cardCol, alignItems: 'flex-end', justifyContent: 'center' }}>
          {v.voucher_status === 'scheduled' && (
            <button onClick={() => onCheckin(v.voucher_id)} style={styles.checkinBtn}>
              Eingecheckt markieren
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const color = STATUS_COLORS[status] ?? '#8a8378'
  return (
    <span style={{ ...styles.badge, background: color + '1c', color }}>
      {label}
    </span>
  )
}

const STATUS_COLORS: Record<string, string> = {
  active: '#1a6fa8',
  scheduled: GW_GREEN,
  checked_in: GW_GREEN,
  cancelled: '#c0392b',
  expired: '#8a8378',
  paid: GW_GREEN,
  pending: '#8a6a1f',
}

const styles: Record<string, React.CSSProperties> = {
  h1: { fontSize: 24, fontWeight: 600, color: GW_GREEN, margin: 0, fontFamily: 'Georgia, serif' },
  sub: { fontSize: 13, color: '#8a8378', margin: '6px 0 20px', maxWidth: 520, lineHeight: 1.5 },
  errorBanner: {
    background: '#fdecea', border: '1px solid #f3c1bb', color: '#8a2e22',
    borderRadius: 6, padding: '10px 14px', marginBottom: 20, fontSize: 13,
    position: 'relative', paddingRight: 32,
  },
  errorClose: {
    position: 'absolute', top: 6, right: 8, background: 'transparent', border: 'none',
    fontSize: 16, cursor: 'pointer', color: '#8a2e22', lineHeight: 1,
  },
  filters: { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  filterBtn: {
    padding: '6px 12px', border: '1px solid #ddd3bd', borderRadius: 6,
    background: '#fff', fontSize: 13, cursor: 'pointer', display: 'flex', gap: 6, alignItems: 'center',
    color: '#3a352c',
  },
  filterBtnActive: { background: GW_GREEN, color: GW_CREAM, border: `1px solid ${GW_GREEN}` },
  count: {
    background: 'rgba(28,58,46,0.1)', borderRadius: 10, padding: '0 6px',
    fontSize: 11, fontWeight: 600,
  },
  countActive: { background: 'rgba(255,255,255,0.2)' },
  loading: { color: '#8a8378', fontSize: 14 },
  empty: { color: '#8a8378', fontSize: 14 },

  cards: { display: 'flex', flexDirection: 'column', gap: 12 },
  card: {
    background: '#fff', borderRadius: 8, padding: '16px 20px',
    boxShadow: '0 1px 4px rgba(28,58,46,0.06)', border: '1px solid #ece6d9',
  },
  cardTop: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    flexWrap: 'wrap', gap: 10, paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid #f2ede1',
  },
  cardTopLeft: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  cardTopRight: { display: 'flex', gap: 6 },
  code: { fontFamily: 'monospace', fontSize: 12, background: '#f2ede1', padding: '3px 8px', borderRadius: 4, color: GW_GREEN, fontWeight: 600 },
  tastingName: { fontSize: 14, fontWeight: 600, color: '#3a352c' },
  personsTag: { fontSize: 12, color: '#8a8378' },
  priceTag: {
    fontSize: 12.5, fontWeight: 600, color: GW_GREEN, background: 'rgba(201,168,76,0.16)',
    padding: '2px 8px', borderRadius: 4,
  },
  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16 },
  cardCol: { display: 'flex', flexDirection: 'column', gap: 3 },
  colLabel: { fontSize: 10.5, fontWeight: 600, color: '#8a8378', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 },
  colValue: { fontSize: 13, color: '#3a352c', fontWeight: 500 },
  colSub: { fontSize: 12, color: '#8a8378' },
  colDash: { fontSize: 12, color: '#bbb3a0', fontStyle: 'italic' },
  badge: { padding: '2px 8px', borderRadius: 4, fontSize: 11.5, fontWeight: 500, whiteSpace: 'nowrap' },
  checkinBtn: {
    padding: '7px 14px', background: GW_GREEN, color: GW_CREAM,
    border: `1px solid ${GW_GOLD}`, borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 500,
  },
}
