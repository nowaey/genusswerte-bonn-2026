import { useEffect, useState, FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { generateScheduledSlots, DEFAULT_CAPACITY, ROLLING_WINDOW_WEEKS } from '../lib/tastingSchedule'
import type { TastingSlot, TastingType, ReservationOverview } from '../types'
import { TASTING_LABELS, VOUCHER_STATUS_LABELS } from '../types'

const TASTING_TYPE_OPTIONS = Object.entries(TASTING_LABELS) as [TastingType, string][]

interface NewSlot {
  tasting_type: TastingType
  slot_date: string
  slot_time: string
  capacity_total: number
  notes: string
}

const EMPTY_SLOT: NewSlot = {
  tasting_type: 'wein_tasting',
  slot_date: '',
  slot_time: '19:00',
  capacity_total: DEFAULT_CAPACITY,
  notes: '',
}

function windowRange(): { from: Date; to: Date; fromKey: string; toKey: string } {
  const from = new Date()
  from.setHours(0, 0, 0, 0)
  const to = new Date(from)
  to.setDate(to.getDate() + ROLLING_WINDOW_WEEKS * 7)

  const key = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  return { from, to, fromKey: key(from), toKey: key(to) }
}

export function SlotsPage() {
  const [slots, setSlots] = useState<TastingSlot[]>([])
  const [reservations, setReservations] = useState<ReservationOverview[]>([])
  const [expandedSlotId, setExpandedSlotId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<NewSlot>(EMPTY_SLOT)
  const [saving, setSaving] = useState(false)

  // ----------------------------------------------------------
  // Rollierendes Fenster automatisch nachfüllen: Termine laut
  // Wochenplan (tastingSchedule.ts) für die nächsten X Wochen
  // generieren, aber nur die einfügen, die noch nicht existieren
  // (egal ob aktiv oder abgesagt — eine Absage soll nicht erneut
  // automatisch angelegt werden).
  //
  // Alle Fehler werden zurückgegeben statt verschluckt — die
  // Page-Komponente zeigt sie sichtbar an statt still zu scheitern.
  // ----------------------------------------------------------
  const ensureScheduledSlots = async (): Promise<string | null> => {
    const { from, to, fromKey, toKey } = windowRange()

    const { data: existing, error: selectErr } = await supabase
      .from('tasting_slots')
      .select('tasting_type, slot_date, slot_time')
      .gte('slot_date', fromKey)
      .lte('slot_date', toKey)

    if (selectErr) return `Termine konnten nicht geladen werden: ${selectErr.message}`

    const existingKeys = new Set(
      (existing ?? []).map(s => `${s.tasting_type}|${s.slot_date}|${s.slot_time}`)
    )

    const expected = generateScheduledSlots(from, to)
    const missing = expected.filter(
      s => !existingKeys.has(`${s.tasting_type}|${s.slot_date}|${s.slot_time}`)
    )

    if (missing.length > 0) {
      // upsert + ignoreDuplicates statt insert: greift auf den Unique-Constraint
      // (tasting_type, slot_date, slot_time) zurück, damit ein doppelter Lauf
      // (z. B. React StrictMode im Dev-Modus) nie zu doppelten Terminen führt.
      const { error: insertErr } = await supabase
        .from('tasting_slots')
        .upsert(missing, { onConflict: 'tasting_type,slot_date,slot_time', ignoreDuplicates: true })
      if (insertErr) return `Termine konnten nicht automatisch angelegt werden: ${insertErr.message}`
    }

    return null
  }

  const loadSlots = async () => {
    const { fromKey } = windowRange()
    const { data, error: loadErr } = await supabase
      .from('tasting_slots')
      .select('*')
      .gte('slot_date', fromKey)
      .order('slot_date', { ascending: true })
      .order('slot_time', { ascending: true })

    if (loadErr) {
      setError(`Termine konnten nicht geladen werden: ${loadErr.message}`)
      setSlots([])
      setLoading(false)
      return
    }

    setSlots((data as TastingSlot[]) ?? [])
    setLoading(false)
  }

  const loadReservations = async () => {
    const { fromKey } = windowRange()
    const { data, error: resErr } = await supabase
      .from('v_reservation_overview')
      .select('*')
      .gte('slot_date', fromKey)

    if (resErr) {
      setError(`Gäste konnten nicht geladen werden: ${resErr.message}`)
      return
    }
    setReservations((data as ReservationOverview[]) ?? [])
  }

  useEffect(() => {
    (async () => {
      const genErr = await ensureScheduledSlots()
      if (genErr) setError(genErr)
      await Promise.all([loadSlots(), loadReservations()])
    })()
  }, [])

  const handleCheckin = async (voucherId: string) => {
    const { error: checkinErr } = await supabase
      .from('vouchers')
      .update({ status: 'checked_in' })
      .eq('id', voucherId)
    if (checkinErr) {
      setError(`Check-in fehlgeschlagen: ${checkinErr.message}`)
      return
    }
    setReservations(prev =>
      prev.map(r => r.voucher_id === voucherId ? { ...r, voucher_status: 'checked_in' } : r)
    )
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { error: createErr } = await supabase.from('tasting_slots').insert({
      tasting_type:    form.tasting_type,
      slot_date:       form.slot_date,
      slot_time:       form.slot_time,
      capacity_total:  form.capacity_total,
      notes:           form.notes || null,
    })
    if (createErr) {
      setError(`Termin konnte nicht angelegt werden: ${createErr.message}`)
    } else {
      setForm(EMPTY_SLOT)
      setShowForm(false)
      await loadSlots()
    }
    setSaving(false)
  }

  const handleCancel = async (slotId: string) => {
    if (!confirm('Termin wirklich absagen?')) return
    const { error: cancelErr } = await supabase
      .from('tasting_slots')
      .update({ status: 'cancelled' })
      .eq('id', slotId)
    if (cancelErr) {
      setError(`Termin konnte nicht abgesagt werden: ${cancelErr.message}`)
      return
    }
    setSlots(prev => prev.map(s => s.id === slotId ? { ...s, status: 'cancelled' } : s))
  }

  const handleReactivate = async (slotId: string) => {
    const { error: reactivateErr } = await supabase
      .from('tasting_slots')
      .update({ status: 'active' })
      .eq('id', slotId)
    if (reactivateErr) {
      setError(`Absage konnte nicht rückgängig gemacht werden: ${reactivateErr.message}`)
      return
    }
    setSlots(prev => prev.map(s => s.id === slotId ? { ...s, status: 'active' } : s))
  }

  // Gruppierung nach Datum für die Tages-Ansicht
  const byDate = new Map<string, TastingSlot[]>()
  for (const s of slots) {
    if (!byDate.has(s.slot_date)) byDate.set(s.slot_date, [])
    byDate.get(s.slot_date)!.push(s)
  }
  const dateKeys = Array.from(byDate.keys()).sort()

  // Gruppierung der Gäste nach Termin, für die Klapp-Ansicht pro Zeile
  const reservationsBySlot = new Map<string, ReservationOverview[]>()
  for (const r of reservations) {
    if (!reservationsBySlot.has(r.slot_id)) reservationsBySlot.set(r.slot_id, [])
    reservationsBySlot.get(r.slot_id)!.push(r)
  }

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>Tastings</h1>
          <p style={styles.sub}>
            Termine laut Wochenplan werden automatisch für die nächsten {ROLLING_WINDOW_WEEKS} Wochen angelegt.
            Kapazität ist standardmäßig {DEFAULT_CAPACITY} Plätze pro Termin.
          </p>
        </div>
        <button onClick={() => setShowForm(v => !v)} style={styles.addBtn}>
          {showForm ? 'Abbrechen' : '+ Sondertermin'}
        </button>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          <strong>Fehler:</strong> {error}
          <button onClick={() => setError(null)} style={styles.errorClose} aria-label="Schließen">×</button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} style={styles.form}>
          <h2 style={styles.formTitle}>Sondertermin anlegen</h2>
          <p style={styles.formHint}>
            Für Termine außerhalb des festen Wochenplans (z. B. Whisky-Tasting auf Anfrage, Sonderevent).
          </p>
          <div style={styles.formGrid}>
            <label style={styles.label}>
              Tasting-Typ
              <select
                value={form.tasting_type}
                onChange={e => setForm(f => ({ ...f, tasting_type: e.target.value as TastingType }))}
                style={styles.select}
                required
              >
                {TASTING_TYPE_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <label style={styles.label}>
              Datum
              <input
                type="date"
                value={form.slot_date}
                onChange={e => setForm(f => ({ ...f, slot_date: e.target.value }))}
                style={styles.input}
                required
              />
            </label>

            <label style={styles.label}>
              Uhrzeit
              <input
                type="time"
                value={form.slot_time}
                onChange={e => setForm(f => ({ ...f, slot_time: e.target.value }))}
                style={styles.input}
                required
              />
            </label>

            <label style={styles.label}>
              Max. Personen
              <input
                type="number"
                value={form.capacity_total}
                onChange={e => setForm(f => ({ ...f, capacity_total: Number(e.target.value) }))}
                style={styles.input}
                min={1}
                required
              />
            </label>
          </div>

          <label style={{ ...styles.label, marginTop: 4 }}>
            Notizen (optional)
            <input
              type="text"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              style={styles.input}
              placeholder="z. B. besonderes Thema, Hinweise"
            />
          </label>

          <button type="submit" disabled={saving} style={styles.saveBtn}>
            {saving ? 'Speichern …' : 'Termin anlegen'}
          </button>
        </form>
      )}

      {loading ? (
        <p style={styles.loading}>Laden …</p>
      ) : dateKeys.length === 0 ? (
        <p style={styles.empty}>
          {error ? 'Konnte wegen des obigen Fehlers nichts laden.' : 'Keine Termine im Zeitraum.'}
        </p>
      ) : (
        <div style={styles.days}>
          {dateKeys.map(dateKey => (
            <DayGroup
              key={dateKey}
              dateKey={dateKey}
              slots={byDate.get(dateKey)!}
              reservationsBySlot={reservationsBySlot}
              expandedSlotId={expandedSlotId}
              onToggleExpand={id => setExpandedSlotId(prev => prev === id ? null : id)}
              onCancel={handleCancel}
              onReactivate={handleReactivate}
              onCheckin={handleCheckin}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DayGroup({
  dateKey,
  slots,
  reservationsBySlot,
  expandedSlotId,
  onToggleExpand,
  onCancel,
  onReactivate,
  onCheckin,
}: {
  dateKey: string
  slots: TastingSlot[]
  reservationsBySlot: Map<string, ReservationOverview[]>
  expandedSlotId: string | null
  onToggleExpand: (id: string) => void
  onCancel: (id: string) => void
  onReactivate: (id: string) => void
  onCheckin: (voucherId: string) => void
}) {
  const label = new Date(dateKey + 'T00:00:00').toLocaleDateString('de-DE', {
    weekday: 'long', day: '2-digit', month: 'long',
  })
  const sorted = [...slots].sort((a, b) => a.slot_time.localeCompare(b.slot_time))

  return (
    <div style={styles.dayCard}>
      <div style={styles.dayLabel}>{label}</div>
      <div style={styles.dayRows}>
        {sorted.map(s => {
          const label = TASTING_LABELS[s.tasting_type] ?? `Unbekannt (${s.tasting_type})`
          const total = s.capacity_total ?? 0
          const reserved = s.capacity_reserved ?? 0
          const guests = reservationsBySlot.get(s.id) ?? []
          const isExpanded = expandedSlotId === s.id

          return (
            <div key={s.id} style={{ opacity: s.status === 'cancelled' ? 0.55 : 1 }}>
              <div
                style={{ ...styles.row, cursor: 'pointer' }}
                onClick={() => onToggleExpand(s.id)}
              >
                <div style={styles.rowMain}>
                  <span style={styles.expandArrow}>{isExpanded ? '▾' : '▸'}</span>
                  <span style={styles.rowTime}>{s.slot_time.slice(0, 5)}</span>
                  <span style={styles.rowTasting}>{label}</span>
                  {s.status === 'cancelled' && (
                    <span style={{ ...styles.badge, ...SLOT_STATUS_STYLE.cancelled }}>Abgesagt</span>
                  )}
                  {s.status === 'full' && (
                    <span style={{ ...styles.badge, ...SLOT_STATUS_STYLE.full }}>Ausgebucht</span>
                  )}
                  {guests.length > 0 && (
                    <span style={styles.guestCount}>{guests.length} {guests.length === 1 ? 'Gast' : 'Gäste'}</span>
                  )}
                </div>

                <div style={styles.rowRight}>
                  <CapacityDots total={total} reserved={reserved} />
                  <span style={styles.rowCount}>{total - reserved}/{total} frei</span>
                  {s.status === 'active' && (
                    <button
                      onClick={e => { e.stopPropagation(); onCancel(s.id) }}
                      style={styles.cancelBtn}
                    >
                      Absagen
                    </button>
                  )}
                  {s.status === 'cancelled' && (
                    <button
                      onClick={e => { e.stopPropagation(); onReactivate(s.id) }}
                      style={styles.reactivateBtn}
                    >
                      Rückgängig
                    </button>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div style={styles.guestPanel}>
                  {guests.length === 0 ? (
                    <p style={styles.guestEmpty}>Noch niemand für diesen Termin eingebucht.</p>
                  ) : (
                    guests.map(g => (
                      <div key={g.reservation_id} style={styles.guestRow}>
                        <div style={styles.guestInfo}>
                          <span style={styles.guestName}>{g.customer_name}</span>
                          <span style={styles.guestSub}>{g.customer_email}</span>
                          {g.customer_phone && <span style={styles.guestSub}>{g.customer_phone}</span>}
                          {g.customer_address && <span style={styles.guestSub}>{g.customer_address}</span>}
                        </div>
                        <div style={styles.guestRight}>
                          <span style={styles.guestPersons}>{g.persons} {g.persons === 1 ? 'Person' : 'Personen'}</span>
                          <span style={{ ...styles.badge, ...GUEST_STATUS_STYLE[g.voucher_status] }}>
                            {VOUCHER_STATUS_LABELS[g.voucher_status]}
                          </span>
                          {g.voucher_status === 'scheduled' && (
                            <button onClick={() => onCheckin(g.voucher_id)} style={styles.checkinBtn}>
                              Eingecheckt
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CapacityDots({ total, reserved }: { total: number; reserved: number }) {
  if (!total) return null
  const capped = Math.min(total, 20)
  const filledCapped = Math.round((reserved / total) * capped)
  return (
    <span style={styles.dots} aria-hidden="true">
      {Array.from({ length: capped }, (_, i) => (
        <span
          key={i}
          style={{
            ...styles.dot,
            background: i < filledCapped ? 'var(--gw-gold, #c9a84c)' : '#e2ddd3',
          }}
        />
      ))}
    </span>
  )
}

const SLOT_STATUS_STYLE: Record<string, React.CSSProperties> = {
  full:      { background: '#fdf1dc', color: '#8a6a1f' },
  cancelled: { background: '#fdecea', color: '#c0392b' },
}

const GUEST_STATUS_STYLE: Record<string, React.CSSProperties> = {
  scheduled:  { background: '#fdf1dc', color: '#8a6a1f' },
  checked_in: { background: '#e8f0ec', color: '#1c3a2e' },
  cancelled:  { background: '#fdecea', color: '#c0392b' },
  active:     { background: '#eef3f7', color: '#1a6fa8' },
  expired:    { background: '#f2ede1', color: '#8a8378' },
}

const GW_GREEN = '#1c3a2e'
const GW_GOLD  = '#c9a84c'
const GW_CREAM = '#f9f5ef'

const styles: Record<string, React.CSSProperties> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 16 },
  h1: { fontSize: 24, fontWeight: 600, color: GW_GREEN, margin: 0, fontFamily: 'Georgia, serif' },
  sub: { fontSize: 13, color: '#8a8378', margin: '6px 0 0', maxWidth: 480, lineHeight: 1.5 },
  addBtn: {
    padding: '9px 18px', background: GW_GREEN, color: GW_CREAM,
    border: `1px solid ${GW_GOLD}`, borderRadius: 6, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
    fontWeight: 500,
  },
  errorBanner: {
    background: '#fdecea', border: '1px solid #f3c1bb', color: '#8a2e22',
    borderRadius: 6, padding: '10px 14px', marginBottom: 20, fontSize: 13,
    display: 'flex', alignItems: 'flex-start', gap: 8, position: 'relative', paddingRight: 32,
  },
  errorClose: {
    position: 'absolute', top: 6, right: 8, background: 'transparent', border: 'none',
    fontSize: 16, cursor: 'pointer', color: '#8a2e22', lineHeight: 1,
  },
  form: {
    background: '#fff', borderRadius: 8, padding: 24, marginBottom: 24,
    boxShadow: '0 1px 4px rgba(28,58,46,0.08)', display: 'flex', flexDirection: 'column', gap: 12,
    border: '1px solid #ece6d9',
  },
  formTitle: { fontSize: 15, fontWeight: 600, color: GW_GREEN, margin: 0 },
  formHint: { fontSize: 12, color: '#8a8378', margin: 0 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 },
  label: { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, fontWeight: 500, color: '#3a352c' },
  input: { padding: '8px 10px', border: '1px solid #ddd3bd', borderRadius: 5, fontSize: 13 },
  select: { padding: '8px 10px', border: '1px solid #ddd3bd', borderRadius: 5, fontSize: 13 },
  saveBtn: {
    alignSelf: 'flex-start', padding: '9px 18px', background: GW_GREEN, color: GW_CREAM,
    border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 500,
  },
  loading: { color: '#8a8378', fontSize: 14 },
  empty: { color: '#8a8378', fontSize: 14 },

  days: { display: 'flex', flexDirection: 'column', gap: 14 },
  dayCard: {
    background: '#fff', borderRadius: 8, padding: '16px 20px',
    boxShadow: '0 1px 4px rgba(28,58,46,0.06)', border: '1px solid #ece6d9',
  },
  dayLabel: {
    fontSize: 14, fontWeight: 600, color: GW_GREEN, marginBottom: 10,
    textTransform: 'capitalize', fontFamily: 'Georgia, serif',
  },
  dayRows: { display: 'flex', flexDirection: 'column', gap: 10 },
  row: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    flexWrap: 'wrap', gap: 10, padding: '9px 0', borderTop: '1px solid #f2ede1',
  },
  rowMain: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 },
  rowTime: { fontWeight: 600, color: GW_GREEN, minWidth: 40 },
  rowTasting: { color: '#3a352c', fontWeight: 500 },
  rowRight: { display: 'flex', alignItems: 'center', gap: 10 },
  rowCount: { fontSize: 12, color: '#8a8378', minWidth: 62, textAlign: 'right' },
  dots: { display: 'inline-flex', gap: 3 },
  dot: { width: 7, height: 7, borderRadius: '50%', display: 'inline-block' },
  badge: { padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500 },
  cancelBtn: {
    padding: '4px 10px', background: 'transparent', color: '#c0392b',
    border: '1px solid #c0392b', borderRadius: 4, fontSize: 12, cursor: 'pointer',
  },
  reactivateBtn: {
    padding: '4px 10px', background: 'transparent', color: GW_GREEN,
    border: `1px solid ${GW_GREEN}`, borderRadius: 4, fontSize: 12, cursor: 'pointer',
  },
  expandArrow: { color: '#8a8378', fontSize: 11, width: 10, display: 'inline-block' },
  guestCount: {
    fontSize: 11, color: GW_GREEN, background: 'rgba(28,58,46,0.08)',
    padding: '2px 8px', borderRadius: 10, fontWeight: 500,
  },
  guestPanel: {
    display: 'flex', flexDirection: 'column', gap: 8,
    padding: '4px 0 12px 20px', marginBottom: 4,
  },
  guestEmpty: { fontSize: 12, color: '#8a8378', fontStyle: 'italic', margin: 0 },
  guestRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    flexWrap: 'wrap', gap: 10, background: '#f9f5ef', borderRadius: 6, padding: '10px 14px',
  },
  guestInfo: { display: 'flex', flexDirection: 'column', gap: 2 },
  guestName: { fontSize: 13, fontWeight: 600, color: '#3a352c' },
  guestSub: { fontSize: 12, color: '#8a8378' },
  guestRight: { display: 'flex', alignItems: 'center', gap: 8 },
  guestPersons: { fontSize: 12, color: '#8a8378' },
  checkinBtn: {
    padding: '5px 12px', background: GW_GREEN, color: GW_CREAM,
    border: `1px solid ${GW_GOLD}`, borderRadius: 5, fontSize: 12, cursor: 'pointer', fontWeight: 500,
  },
}
