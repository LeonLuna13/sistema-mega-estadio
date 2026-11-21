/**
 * Tipos del dominio diseñados para escalar en Etapa 2 (Express + Prisma + PostgreSQL)
 * y Etapa 3 (Portal Público de Reservas Online).
 */

export type CourtId = 'court-6' | 'court-5' | (string & {});

export interface Court {
  id: CourtId;
  name: string;
  shortName: string;
  surface: string;
  playersCount: number;
  hourlyPrice: number;
  isActive: boolean;
}

export type BookingStatus =
  | 'PENDING_DEPOSIT' // Reservado / Esperando seña (amarillo/ámbar)
  | 'CONFIRMED'       // Confirmado / Señado (azul/celeste)
  | 'PAID'            // Pagado / Finalizado (verde esmeralda)
  | 'CANCELLED';      // Cancelado / Liberado

export type DepositMethod = 'TRANSFER' | 'CASH';

export type PaymentMethod = 'CASH' | 'TRANSFER' | 'MIXED';

export type BookingSource = 'ADMIN' | 'PUBLIC_PORTAL';

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  notes: string;
  historicalMatchesCount: number;
  createdAt: string;
}

export interface RecurringBooking {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  courtId: CourtId;
  dayOfWeek: number; // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  hour: number;      // 10 a 23
  notes: string;
  isActive: boolean;
  startDate: string; // YYYY-MM-DD
  skippedDates: string[]; // Fechas YYYY-MM-DD liberadas puntualmente
  createdAt: string;
}

export interface Booking {
  id: string;
  courtId: CourtId;
  clientId: string;
  clientName: string;
  clientPhone: string;
  date: string; // YYYY-MM-DD
  hour: number; // 10 a 23
  status: BookingStatus;
  /** Precio congelado al momento de crear el turno para preservar el historial ante cambios de tarifa */
  totalPrice: number;
  depositAmount: number;
  depositMethod: DepositMethod;
  depositPaidAt?: string; // YYYY-MM-DD
  whatsappReceiptVerified: boolean;
  balanceCashAmount: number;
  balanceTransferAmount: number;
  balancePaidAt?: string; // YYYY-MM-DD
  notes: string;
  recurringBookingId?: string;
  source: BookingSource;
  createdAt: string;
  updatedAt: string;
}

export type CashMovementType =
  | 'DEPOSIT'
  | 'BALANCE'
  | 'FULL_PAYMENT'
  | 'MANUAL_INCOME';

export interface CashMovement {
  id: string;
  bookingId?: string;
  date: string; // YYYY-MM-DD (fecha en la que ingresó el pago a caja)
  createdAt: string;
  type: CashMovementType;
  paymentMethod: 'CASH' | 'TRANSFER';
  amount: number;
  courtId?: CourtId;
  clientName: string;
  bookingDate?: string;
  bookingHour?: number;
  whatsappVerified?: boolean;
  description: string;
}

export interface SystemSettings {
  complexName: string;
  defaultDepositAmount: number;
  openHour: number;
  closeHour: number;
  transferAlias: string;
  courts: Court[];
}

export interface GridSlotInfo {
  courtId: CourtId;
  date: string;
  hour: number;
  booking: Booking | null;
  recurringBooking: RecurringBooking | null;
  isAvailable: boolean;
}

export interface SaveBookingPayload {
  id?: string;
  courtId: CourtId;
  clientId?: string;
  clientName: string;
  clientPhone: string;
  date: string;
  hour: number;
  totalPrice: number;
  depositAmount: number;
  depositMethod: DepositMethod;
  whatsappReceiptVerified: boolean;
  balanceCashAmount: number;
  balanceTransferAmount: number;
  notes: string;
  recurringBookingId?: string;
  source?: BookingSource;
}
