// ============================================================
// Enums — spiegeln die PostgreSQL-Enum-Types aus 001_enums.sql
// ============================================================

export type OrderType = 'tasting_voucher' | 'gift_box'

export type PaymentStatus = 'pending' | 'paid' | 'cancelled' | 'refunded'

export type FulfillmentStatus =
  | 'open'
  | 'in_progress'
  | 'ready_for_pickup'
  | 'shipped'
  | 'completed'
  | 'cancelled'

export type VoucherStatus = 'active' | 'scheduled' | 'checked_in' | 'cancelled' | 'expired'

export type SlotStatus = 'active' | 'full' | 'cancelled'

export type TastingType =
  | 'wein_tasting'
  | 'afterwork_wein_tasting'
  | 'gin_tasting'
  | 'champagner_popcorn_tasting'
  | 'trueffel_champagner_tasting'
  | 'whisky_tasting'
  | 'craft_beer_tasting'
  | 'wagyu_wein_champagner_tasting'
  | 'apero_antipasti_tasting'

export type AdminRole = 'admin' | 'super_admin'

// ============================================================
// Tabellen-Typen — spiegeln 002_tables.sql
// ============================================================

export interface AdminUser {
  id: string
  user_id: string
  role: AdminRole
  created_at: string
}

export interface Customer {
  id: string
  name: string
  email: string
  phone: string | null
  address: string | null
  created_at: string
}

export interface Order {
  id: string
  customer_id: string
  order_type: OrderType
  payment_status: PaymentStatus
  fulfillment_status: FulfillmentStatus | null
  stripe_payment_intent_id: string | null
  stripe_session_id: string | null
  total_amount: number
  currency: string
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_name: string
  tasting_type: TastingType | null
  quantity: number
  unit_price: number
}

export interface Voucher {
  id: string
  voucher_code: string
  order_id: string
  customer_id: string
  tasting_type: TastingType
  persons: number
  status: VoucherStatus
  valid_until: string | null
  created_at: string
  updated_at: string
}

export interface TastingSlot {
  id: string
  tasting_type: TastingType
  slot_date: string
  slot_time: string
  capacity_total: number
  capacity_reserved: number
  status: SlotStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface VoucherReservation {
  id: string
  voucher_id: string
  slot_id: string
  customer_name: string
  customer_email: string
  customer_phone: string | null
  customer_address: string | null
  notes: string | null
  created_at: string
}

// ============================================================
// View-Typen — spiegeln 006_views.sql
// ============================================================

export interface OrderOverview extends Order {
  customer_name: string
  customer_email: string
  customer_phone: string | null
  item_count: number
}

export interface VoucherOverview extends Voucher {
  order_id: string
  payment_status: PaymentStatus
  total_amount: number
  customer_name: string
  customer_email: string
  customer_phone: string | null
  has_reservation: boolean
  reserved_at: string | null
  slot_id: string | null
  slot_date: string | null
  slot_time: string | null
  reservation_customer_name: string | null
  reservation_customer_email: string | null
  reservation_customer_phone: string | null
  reservation_customer_address: string | null
  reservation_notes: string | null
}

export interface SlotAvailability {
  id: string
  tasting_type: TastingType
  slot_date: string
  slot_time: string
  capacity_total: number
  capacity_reserved: number
  available_seats: number
  status: SlotStatus
  notes: string | null
}

export interface ReservationOverview extends VoucherReservation {
  voucher_id: string
  voucher_code: string
  tasting_type: TastingType
  persons: number
  voucher_status: VoucherStatus
  slot_date: string
  slot_time: string
  capacity_total: number
  capacity_reserved: number
  slot_notes: string | null
}

// ============================================================
// Hilfsfunktionen für Labels
// ============================================================

export const TASTING_LABELS: Record<TastingType, string> = {
  wein_tasting: 'Wein Tasting',
  afterwork_wein_tasting: 'Afterwork Wein Tasting',
  gin_tasting: 'Gin Tasting',
  champagner_popcorn_tasting: 'Champagner & Popcorn Tasting',
  trueffel_champagner_tasting: 'Trüffel & Champagner Tasting',
  whisky_tasting: 'Whisky Tasting',
  craft_beer_tasting: 'Craft Beer Tasting',
  wagyu_wein_champagner_tasting: 'Wagyu, Wein & Champagner Tasting',
  apero_antipasti_tasting: 'Apéro & Antipasti Tasting',
}

export const VOUCHER_STATUS_LABELS: Record<VoucherStatus, string> = {
  active: 'Aktiv',
  scheduled: 'Termin gebucht',
  checked_in: 'Eingecheckt',
  cancelled: 'Storniert',
  expired: 'Abgelaufen',
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Ausstehend',
  paid: 'Bezahlt',
  cancelled: 'Abgebrochen',
  refunded: 'Erstattet',
}

export const FULFILLMENT_STATUS_LABELS: Record<FulfillmentStatus, string> = {
  open: 'Offen',
  in_progress: 'In Bearbeitung',
  ready_for_pickup: 'Abholbereit',
  shipped: 'Versandt',
  completed: 'Abgeschlossen',
  cancelled: 'Storniert',
}
