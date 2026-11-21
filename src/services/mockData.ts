import {
  Booking,
  CashMovement,
  Client,
  RecurringBooking,
  SystemSettings,
} from '../types';
import { addDaysStr, getDayOfWeek, getTodayStr } from '../utils/formatters';

export const DEFAULT_SETTINGS: SystemSettings = {
  complexName: 'Mega Estadio',
  defaultDepositAmount: 10000,
  openHour: 10,
  closeHour: 23,
  transferAlias: 'megaestadio.mp',
  courts: [
    {
      id: 'court-6',
      name: 'Cancha de 6 (Abajo)',
      shortName: 'Cancha 6 (Abajo)',
      surface: 'Césped Sintético Pro',
      playersCount: 6,
      hourlyPrice: 60000,
      isActive: true,
    },
    {
      id: 'court-5',
      name: 'Cancha de 5 (Arriba)',
      shortName: 'Cancha 5 (Arriba)',
      surface: 'Césped Sintético Techado',
      playersCount: 5,
      hourlyPrice: 50000,
      isActive: true,
    },
  ],
};

export interface SeedDataset {
  settings: SystemSettings;
  clients: Client[];
  recurringBookings: RecurringBooking[];
  bookings: Booking[];
  cashMovements: CashMovement[];
}

export function buildCashMovementsForBooking(booking: Booking): CashMovement[] {
  const movements: CashMovement[] = [];
  if (booking.status === 'CANCELLED') return movements;

  const baseDesc = `Turno ${booking.date.split('-').reverse().join('/')} ${booking.hour}:00hs`;

  if (booking.depositAmount > 0) {
    movements.push({
      id: `mov-dep-${booking.id}`,
      bookingId: booking.id,
      date: booking.depositPaidAt || booking.date,
      createdAt: booking.createdAt,
      type: 'DEPOSIT',
      paymentMethod: booking.depositMethod,
      amount: booking.depositAmount,
      courtId: booking.courtId,
      clientName: booking.clientName,
      bookingDate: booking.date,
      bookingHour: booking.hour,
      whatsappVerified: booking.whatsappReceiptVerified,
      description: `Seña - ${baseDesc}`,
    });
  }

  const isFullWithoutDeposit = booking.depositAmount === 0;

  if (booking.balanceCashAmount > 0) {
    movements.push({
      id: `mov-bal-cash-${booking.id}`,
      bookingId: booking.id,
      date: booking.balancePaidAt || booking.date,
      createdAt: booking.updatedAt,
      type: isFullWithoutDeposit ? 'FULL_PAYMENT' : 'BALANCE',
      paymentMethod: 'CASH',
      amount: booking.balanceCashAmount,
      courtId: booking.courtId,
      clientName: booking.clientName,
      bookingDate: booking.date,
      bookingHour: booking.hour,
      description: `${isFullWithoutDeposit ? 'Pago total' : 'Saldo'} en efectivo - ${baseDesc}`,
    });
  }

  if (booking.balanceTransferAmount > 0) {
    movements.push({
      id: `mov-bal-tr-${booking.id}`,
      bookingId: booking.id,
      date: booking.balancePaidAt || booking.date,
      createdAt: booking.updatedAt,
      type: isFullWithoutDeposit ? 'FULL_PAYMENT' : 'BALANCE',
      paymentMethod: 'TRANSFER',
      amount: booking.balanceTransferAmount,
      courtId: booking.courtId,
      clientName: booking.clientName,
      bookingDate: booking.date,
      bookingHour: booking.hour,
      whatsappVerified: true,
      description: `${isFullWithoutDeposit ? 'Pago total' : 'Saldo'} por transferencia - ${baseDesc}`,
    });
  }

  return movements;
}

export function generateSeedData(): SeedDataset {
  const today = getTodayStr();
  const yesterday = addDaysStr(today, -1);
  const twoDaysAgo = addDaysStr(today, -2);
  const tomorrow = addDaysStr(today, 1);

  const todayDow = getDayOfWeek(today);
  const tomorrowDow = getDayOfWeek(tomorrow);
  const inThreeDaysDow = (todayDow + 3) % 7;

  const nowIso = new Date().toISOString();

  const clients: Client[] = [
    {
      id: 'cli-1',
      name: 'Juan Pérez',
      phone: '1154328910',
      notes: 'Capitán de Los Pibes FC. Pide pecheras verdes siempre.',
      historicalMatchesCount: 18,
      createdAt: nowIso,
    },
    {
      id: 'cli-2',
      name: 'Martín Gómez',
      phone: '1167892341',
      notes: 'Paga puntual por transferencia.',
      historicalMatchesCount: 12,
      createdAt: nowIso,
    },
    {
      id: 'cli-3',
      name: 'Lucas Fernández',
      phone: '1143219876',
      notes: 'Grupo de facultad. A veces suman 12 jugadores.',
      historicalMatchesCount: 7,
      createdAt: nowIso,
    },
    {
      id: 'cli-4',
      name: 'Santiago Morales',
      phone: '1159876543',
      notes: 'Trae pelota propia.',
      historicalMatchesCount: 24,
      createdAt: nowIso,
    },
    {
      id: 'cli-5',
      name: 'Tomás Díaz',
      phone: '1134567890',
      notes: 'Suele pagar el saldo mitad efectivo mitad transferencia.',
      historicalMatchesCount: 9,
      createdAt: nowIso,
    },
    {
      id: 'cli-6',
      name: 'Nicolás Herrera',
      phone: '1162234455',
      notes: 'Equipo del barrio. Prefiere Cancha 5.',
      historicalMatchesCount: 5,
      createdAt: nowIso,
    },
    {
      id: 'cli-7',
      name: 'Federico Castro',
      phone: '1149988776',
      notes: 'Turno fijo semanal hace 6 meses.',
      historicalMatchesCount: 22,
      createdAt: nowIso,
    },
    {
      id: 'cli-8',
      name: 'Matías Silva',
      phone: '1151122334',
      notes: 'Cliente nuevo recomendado por Juan Pérez.',
      historicalMatchesCount: 2,
      createdAt: nowIso,
    },
  ];

  const recurringBookings: RecurringBooking[] = [
    {
      id: 'rec-1',
      clientId: 'cli-1',
      clientName: 'Juan Pérez',
      clientPhone: '1154328910',
      courtId: 'court-6',
      dayOfWeek: todayDow,
      hour: 20,
      notes: 'Turno fijo semanal - Piden 6 pecheras.',
      isActive: true,
      startDate: addDaysStr(today, -30),
      skippedDates: [],
      createdAt: nowIso,
    },
    {
      id: 'rec-2',
      clientId: 'cli-7',
      clientName: 'Federico Castro',
      clientPhone: '1149988776',
      courtId: 'court-5',
      dayOfWeek: todayDow,
      hour: 22,
      notes: 'Turno fijo de la semana - Confirmar asistencia al mediodía.',
      isActive: true,
      startDate: addDaysStr(today, -60),
      skippedDates: [],
      createdAt: nowIso,
    },
    {
      id: 'rec-3',
      clientId: 'cli-4',
      clientName: 'Santiago Morales',
      clientPhone: '1159876543',
      courtId: 'court-6',
      dayOfWeek: tomorrowDow,
      hour: 21,
      notes: 'Fijo semanal Cancha 6.',
      isActive: true,
      startDate: addDaysStr(today, -45),
      skippedDates: [],
      createdAt: nowIso,
    },
    {
      id: 'rec-4',
      clientId: 'cli-2',
      clientName: 'Martín Gómez',
      clientPhone: '1167892341',
      courtId: 'court-5',
      dayOfWeek: inThreeDaysDow,
      hour: 19,
      notes: 'Fijo Cancha 5 - Traen bidón de agua.',
      isActive: true,
      startDate: addDaysStr(today, -21),
      skippedDates: [],
      createdAt: nowIso,
    },
  ];

  const bookings: Booking[] = [
    // --- HOY ---
    {
      id: 'bkg-today-1',
      courtId: 'court-6',
      clientId: 'cli-3',
      clientName: 'Lucas Fernández',
      clientPhone: '1143219876',
      date: today,
      hour: 11,
      status: 'PAID',
      totalPrice: 60000,
      depositAmount: 10000,
      depositMethod: 'TRANSFER',
      depositPaidAt: yesterday,
      whatsappReceiptVerified: true,
      balanceCashAmount: 50000,
      balanceTransferAmount: 0,
      balancePaidAt: today,
      notes: 'Partido mañana de facultad. Alquilaron 2 pelotas.',
      source: 'ADMIN',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'bkg-today-2',
      courtId: 'court-5',
      clientId: 'cli-5',
      clientName: 'Tomás Díaz',
      clientPhone: '1134567890',
      date: today,
      hour: 14,
      status: 'PAID',
      totalPrice: 50000,
      depositAmount: 10000,
      depositMethod: 'TRANSFER',
      depositPaidAt: today,
      whatsappReceiptVerified: true,
      balanceCashAmount: 20000,
      balanceTransferAmount: 20000,
      balancePaidAt: today,
      notes: 'Pago mixto: $20.000 efectivo + $20.000 transferencia.',
      source: 'ADMIN',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'bkg-today-3',
      courtId: 'court-6',
      clientId: 'cli-2',
      clientName: 'Martín Gómez',
      clientPhone: '1167892341',
      date: today,
      hour: 18,
      status: 'CONFIRMED',
      totalPrice: 60000,
      depositAmount: 10000,
      depositMethod: 'TRANSFER',
      depositPaidAt: today,
      whatsappReceiptVerified: true,
      balanceCashAmount: 0,
      balanceTransferAmount: 0,
      notes: 'Pide pecheras flúor.',
      source: 'ADMIN',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'bkg-today-4',
      courtId: 'court-5',
      clientId: 'cli-6',
      clientName: 'Nicolás Herrera',
      clientPhone: '1162234455',
      date: today,
      hour: 19,
      status: 'PENDING_DEPOSIT',
      totalPrice: 50000,
      depositAmount: 0,
      depositMethod: 'TRANSFER',
      whatsappReceiptVerified: false,
      balanceCashAmount: 0,
      balanceTransferAmount: 0,
      notes: 'Dijo que transfiere la seña antes de las 17hs.',
      source: 'ADMIN',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'bkg-today-5',
      courtId: 'court-6',
      clientId: 'cli-1',
      clientName: 'Juan Pérez',
      clientPhone: '1154328910',
      date: today,
      hour: 20,
      status: 'CONFIRMED',
      totalPrice: 60000,
      depositAmount: 10000,
      depositMethod: 'TRANSFER',
      depositPaidAt: today,
      whatsappReceiptVerified: true,
      balanceCashAmount: 0,
      balanceTransferAmount: 0,
      notes: 'Turno fijo semanal - Piden 6 pecheras.',
      recurringBookingId: 'rec-1',
      source: 'ADMIN',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'bkg-today-6',
      courtId: 'court-5',
      clientId: 'cli-8',
      clientName: 'Matías Silva',
      clientPhone: '1151122334',
      date: today,
      hour: 21,
      status: 'CONFIRMED',
      totalPrice: 50000,
      depositAmount: 10000,
      depositMethod: 'TRANSFER',
      depositPaidAt: yesterday,
      whatsappReceiptVerified: true,
      balanceCashAmount: 0,
      balanceTransferAmount: 0,
      notes: 'Primera vez en el complejo.',
      source: 'ADMIN',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'bkg-today-7',
      courtId: 'court-6',
      clientId: 'cli-5',
      clientName: 'Tomás Díaz',
      clientPhone: '1134567890',
      date: today,
      hour: 23,
      status: 'PENDING_DEPOSIT',
      totalPrice: 60000,
      depositAmount: 0,
      depositMethod: 'TRANSFER',
      whatsappReceiptVerified: false,
      balanceCashAmount: 0,
      balanceTransferAmount: 0,
      notes: 'Esperando captura de transferencia.',
      source: 'ADMIN',
      createdAt: nowIso,
      updatedAt: nowIso,
    },

    // --- AYER (para métricas de la semana/mes) ---
    {
      id: 'bkg-yest-1',
      courtId: 'court-6',
      clientId: 'cli-4',
      clientName: 'Santiago Morales',
      clientPhone: '1159876543',
      date: yesterday,
      hour: 19,
      status: 'PAID',
      totalPrice: 60000,
      depositAmount: 10000,
      depositMethod: 'TRANSFER',
      depositPaidAt: twoDaysAgo,
      whatsappReceiptVerified: true,
      balanceCashAmount: 50000,
      balanceTransferAmount: 0,
      balancePaidAt: yesterday,
      notes: 'Turno completado sin novedades.',
      source: 'ADMIN',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'bkg-yest-2',
      courtId: 'court-5',
      clientId: 'cli-2',
      clientName: 'Martín Gómez',
      clientPhone: '1167892341',
      date: yesterday,
      hour: 21,
      status: 'PAID',
      totalPrice: 50000,
      depositAmount: 10000,
      depositMethod: 'TRANSFER',
      depositPaidAt: yesterday,
      whatsappReceiptVerified: true,
      balanceCashAmount: 0,
      balanceTransferAmount: 40000,
      balancePaidAt: yesterday,
      notes: 'Saldo abonado por Mercado Pago.',
      source: 'ADMIN',
      createdAt: nowIso,
      updatedAt: nowIso,
    },

    // --- HACE 2 DÍAS ---
    {
      id: 'bkg-2days-1',
      courtId: 'court-6',
      clientId: 'cli-1',
      clientName: 'Juan Pérez',
      clientPhone: '1154328910',
      date: twoDaysAgo,
      hour: 20,
      status: 'PAID',
      totalPrice: 60000,
      depositAmount: 10000,
      depositMethod: 'TRANSFER',
      depositPaidAt: twoDaysAgo,
      whatsappReceiptVerified: true,
      balanceCashAmount: 30000,
      balanceTransferAmount: 20000,
      balancePaidAt: twoDaysAgo,
      notes: 'Desafío amistoso.',
      source: 'ADMIN',
      createdAt: nowIso,
      updatedAt: nowIso,
    },

    // --- MAÑANA ---
    {
      id: 'bkg-tom-1',
      courtId: 'court-5',
      clientId: 'cli-3',
      clientName: 'Lucas Fernández',
      clientPhone: '1143219876',
      date: tomorrow,
      hour: 18,
      status: 'CONFIRMED',
      totalPrice: 50000,
      depositAmount: 10000,
      depositMethod: 'TRANSFER',
      depositPaidAt: today,
      whatsappReceiptVerified: true,
      balanceCashAmount: 0,
      balanceTransferAmount: 0,
      notes: 'Seña verificada hoy.',
      source: 'ADMIN',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  const cashMovements: CashMovement[] = bookings.flatMap(buildCashMovementsForBooking);

  return {
    settings: DEFAULT_SETTINGS,
    clients,
    recurringBookings,
    bookings,
    cashMovements,
  };
}
