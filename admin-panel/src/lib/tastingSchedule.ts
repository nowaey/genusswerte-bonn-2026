import type { TastingType } from '../types'

// ============================================================
// TASTING-SCHEDULE.TS
// Fester Wochenplan aus der Laden-Tafel "Tastings & Termine".
// Wird genutzt, um Termine automatisch in einem rollierenden
// Zeitfenster vorauszufüllen (siehe generateScheduledSlots()).
//
// Ändert sich der Plan im Laden (neue Uhrzeit, neues Tasting),
// muss NUR diese Liste angepasst werden.
// ============================================================

export interface WeeklyRule {
  tasting_type: TastingType
  weekday: number      // 0 = Sonntag … 6 = Samstag (JS Date#getDay())
  time: string         // 'HH:MM:00'
  nthOfMonth?: number  // z.B. 1 = nur am 1. Samstag im Monat; fehlt = jede Woche
}

export const WEEKLY_SCHEDULE: WeeklyRule[] = [
  { tasting_type: 'afterwork_wein_tasting',        weekday: 3, time: '18:00:00' },                 // Mittwoch
  { tasting_type: 'wein_tasting',                  weekday: 4, time: '19:00:00' },                 // Donnerstag
  { tasting_type: 'apero_antipasti_tasting',       weekday: 5, time: '17:00:00' },                 // Freitag
  { tasting_type: 'wein_tasting',                  weekday: 5, time: '20:00:00' },                 // Freitag
  { tasting_type: 'champagner_popcorn_tasting',    weekday: 6, time: '12:00:00' },                 // Samstag
  { tasting_type: 'apero_antipasti_tasting',       weekday: 6, time: '16:00:00' },                 // Samstag
  { tasting_type: 'wein_tasting',                  weekday: 6, time: '20:00:00' },                 // Samstag (jede Woche)
  { tasting_type: 'craft_beer_tasting',            weekday: 6, time: '20:00:00', nthOfMonth: 1 },  // 1. Samstag/Monat
  { tasting_type: 'wagyu_wein_champagner_tasting', weekday: 6, time: '20:00:00', nthOfMonth: 2 },  // 2. Samstag/Monat
  { tasting_type: 'gin_tasting',                   weekday: 6, time: '20:00:00', nthOfMonth: 3 },  // 3. Samstag/Monat
  { tasting_type: 'trueffel_champagner_tasting',   weekday: 6, time: '20:00:00', nthOfMonth: 3 },  // 3. Samstag/Monat
]

export const DEFAULT_CAPACITY = 10
export const ROLLING_WINDOW_WEEKS = 8

export interface GeneratedSlot {
  tasting_type: TastingType
  slot_date: string   // YYYY-MM-DD
  slot_time: string   // HH:MM:00
  capacity_total: number
}

function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Der wievielte Vorkommen dieses Wochentags im Monat ist dieses Datum?
// (1 = erster Donnerstag/Samstag/etc. im Monat, 2 = zweiter, ...)
function nthWeekdayOfMonth(d: Date): number {
  return Math.floor((d.getDate() - 1) / 7) + 1
}

/**
 * Generiert alle Termine laut Wochenplan für den Zeitraum [from, to] (inklusive).
 * Reine Funktion, kein DB-Zugriff — der Abgleich mit bereits existierenden
 * Terminen (um Duplikate zu vermeiden) passiert in der Page-Komponente.
 */
export function generateScheduledSlots(from: Date, to: Date): GeneratedSlot[] {
  const result: GeneratedSlot[] = []
  const cursor = new Date(from)
  cursor.setHours(0, 0, 0, 0)

  while (cursor <= to) {
    const weekday = cursor.getDay()
    const nth = nthWeekdayOfMonth(cursor)

    for (const rule of WEEKLY_SCHEDULE) {
      if (rule.weekday !== weekday) continue
      if (rule.nthOfMonth !== undefined && rule.nthOfMonth !== nth) continue

      result.push({
        tasting_type:   rule.tasting_type,
        slot_date:      toDateKey(cursor),
        slot_time:      rule.time,
        capacity_total: DEFAULT_CAPACITY,
      })
    }

    cursor.setDate(cursor.getDate() + 1)
  }

  return result
}
