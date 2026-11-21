import { Booking, BookingStatus, CashMovement, Court } from '../types';

export const DAY_NAMES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

export const DAY_NAMES_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

export function formatCurrency(amount: number): string {
  const rounded = Math.round(amount || 0);
  const formatted = new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 0,
  }).format(rounded);
  return `$${formatted}`;
}

export function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function dateToLocalStr(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function getTodayStr(): string {
  return dateToLocalStr(new Date());
}

export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function addDaysStr(dateStr: string, days: number): string {
  const date = parseLocalDate(dateStr);
  date.setDate(date.getDate() + days);
  return dateToLocalStr(date);
}

export function getDayOfWeek(dateStr: string): number {
  return parseLocalDate(dateStr).getDay();
}

export function getStartOfWeekStr(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  const day = date.getDay();
  // Semana inicia el Lunes (1). Si es Domingo (0), retrocede 6 días.
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return dateToLocalStr(date);
}

export function getStartOfMonthStr(dateStr: string): string {
  const [year, month] = dateStr.split('-');
  return `${year}-${month}-01`;
}

export function formatDateLong(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  const dayName = DAY_NAMES[date.getDay()];
  const dayNum = date.getDate();
  const monthName = MONTH_NAMES[date.getMonth()];
  return `${dayName} ${dayNum} de ${monthName}`;
}

export function formatDateShort(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export function formatHour(hour: number): string {
  return `${pad2(hour)}:00`;
}

export function formatHourShort(hour: number): string {
  return `${hour}hs`;
}

export function getBookingPaidAmount(booking: Pick<Booking, 'depositAmount' | 'balanceCashAmount' | 'balanceTransferAmount'>): number {
  return (booking.depositAmount || 0) + (booking.balanceCashAmount || 0) + (booking.balanceTransferAmount || 0);
}

export function getBookingPendingAmount(booking: Pick<Booking, 'totalPrice' | 'depositAmount' | 'balanceCashAmount' | 'balanceTransferAmount'>): number {
  return Math.max(0, booking.totalPrice - getBookingPaidAmount(booking));
}

export function computeBookingStatus(
  totalPrice: number,
  depositAmount: number,
  balanceCashAmount: number,
  balanceTransferAmount: number,
  whatsappReceiptVerified: boolean,
  depositMethod: 'TRANSFER' | 'CASH'
): BookingStatus {
  const totalPaid = depositAmount + balanceCashAmount + balanceTransferAmount;
  if (totalPaid >= totalPrice && totalPrice > 0) {
    return 'PAID';
  }
  const hasVerifiedDeposit =
    depositAmount > 0 && (depositMethod === 'CASH' || whatsappReceiptVerified);
  if (hasVerifiedDeposit || balanceCashAmount + balanceTransferAmount > 0) {
    return 'CONFIRMED';
  }
  return 'PENDING_DEPOSIT';
}

export function sanitizePhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('54')) return digits;
  if (digits.startsWith('0')) return `549${digits.slice(1)}`;
  return `549${digits}`;
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const cleanPhone = sanitizePhoneForWhatsApp(phone);
  if (!cleanPhone) {
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  }
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function buildBookingWhatsAppMessage(params: {
  clientName: string;
  courtName: string;
  dateStr: string;
  hour: number;
  status: BookingStatus;
  totalPrice: number;
  paidAmount: number;
  pendingAmount: number;
  transferAlias: string;
  defaultDeposit: number;
}): string {
  const {
    clientName,
    courtName,
    dateStr,
    hour,
    status,
    totalPrice,
    paidAmount,
    pendingAmount,
    transferAlias,
    defaultDeposit,
  } = params;

  const firstName = clientName.trim().split(' ')[0] || 'Crack';
  const fecha = formatDateLong(dateStr);
  const hora = formatHour(hour);

  if (status === 'PENDING_DEPOSIT') {
    return [
      `Hola ${firstName}! ⚽ Te reservamos *${courtName}* para el *${fecha}* a las *${hora} hs*.`,
      `Para confirmar el turno, recordá enviarnos la seña de *${formatCurrency(defaultDeposit)}* por transferencia al alias *${transferAlias}* y pasanos el comprobante por acá.`,
      `Valor total del turno: ${formatCurrency(totalPrice)}.`,
    ].join('\n\n');
  }

  if (status === 'CONFIRMED') {
    return [
      `Hola ${firstName}! ✅ Tu turno está *CONFIRMADO* en *${courtName}* para el *${fecha}* a las *${hora} hs*.`,
      `Seña/abonado registrado: *${formatCurrency(paidAmount)}*.`,
      `Saldo restante a abonar en el predio (efectivo o transferencia): *${formatCurrency(pendingAmount)}*.`,
      `¡Te esperamos 10 minutos antes!`,
    ].join('\n\n');
  }

  return [
    `Hola ${firstName}! 🙌 Confirmamos tu turno *PAGADO* en *${courtName}* (${fecha} - ${hora} hs) por ${formatCurrency(totalPrice)}.`,
    `¡Gracias por jugar con nosotros!`,
  ].join('\n\n');
}

export function buildFreeSlotsWhatsAppText(
  dateStr: string,
  courts: Court[],
  freeHoursByCourt: Record<string, number[]>,
  complexName: string,
  defaultDeposit: number
): string {
  const dateLabel = formatDateLong(dateStr);
  const lines: string[] = [
    `⚽ *Horarios disponibles - ${dateLabel}* (${complexName})`,
    '',
  ];

  for (const court of courts) {
    const hours = freeHoursByCourt[court.id] || [];
    const hoursText =
      hours.length > 0
        ? hours.map((h) => formatHourShort(h)).join(', ')
        : 'Sin horarios disponibles';
    lines.push(
      `🏟️ *${court.name}* (${formatCurrency(court.hourlyPrice)}): ${hoursText}`
    );
  }

  lines.push('');
  lines.push(
    `📲 Reservá con una seña de ${formatCurrency(defaultDeposit)}. ¡Escribinos para guardar tu cancha!`
  );

  return lines.join('\n');
}

export function exportCashMovementsToCsv(
  movements: CashMovement[],
  courts: Court[],
  filename = 'caja-movimientos.csv'
): void {
  const courtMap = new Map(courts.map((c) => [c.id, c.shortName]));
  const headers = [
    'Fecha Pago',
    'Tipo',
    'Metodo',
    'Monto',
    'Cliente',
    'Cancha',
    'Fecha Turno',
    'Hora Turno',
    'Comprobante WA',
    'Detalle',
  ];

  const typeLabel: Record<CashMovement['type'], string> = {
    DEPOSIT: 'Seña',
    BALANCE: 'Saldo',
    FULL_PAYMENT: 'Pago Completo',
    MANUAL_INCOME: 'Ingreso Manual',
  };

  const methodLabel: Record<CashMovement['paymentMethod'], string> = {
    CASH: 'Efectivo',
    TRANSFER: 'Transferencia',
  };

  const escapeCell = (val: string | number | undefined) => {
    const str = String(val ?? '');
    return `"${str.replace(/"/g, '""')}"`;
  };

  const rows = movements.map((m) => [
    formatDateShort(m.date),
    typeLabel[m.type],
    methodLabel[m.paymentMethod],
    m.amount,
    m.clientName,
    m.courtId ? courtMap.get(m.courtId) || m.courtId : '-',
    m.bookingDate ? formatDateShort(m.bookingDate) : '-',
    m.bookingHour !== undefined ? formatHour(m.bookingHour) : '-',
    m.paymentMethod === 'TRANSFER' ? (m.whatsappVerified ? 'Verificado' : 'Pendiente') : 'N/A',
    m.description,
  ]);

  const csvContent =
    '\uFEFF' +
    [headers, ...rows].map((row) => row.map(escapeCell).join(';')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
