import React, { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  MessageCircle,
  Plus,
  Repeat,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Booking, CourtId, GridSlotInfo, RecurringBooking } from '../types';
import {
  addDaysStr,
  buildBookingWhatsAppMessage,
  buildFreeSlotsWhatsAppText,
  buildWhatsAppUrl,
  formatCurrency,
  formatDateLong,
  formatHour,
  getBookingPaidAmount,
  getBookingPendingAmount,
  getTodayStr,
} from '../utils/formatters';
import { BookingModal } from '../components/bookings/BookingModal';

interface ModalState {
  isOpen: boolean;
  date: string;
  courtId: CourtId;
  hour: number;
  existingBooking: Booking | null;
  recurringTemplate: RecurringBooking | null;
}

export const SchedulePage: React.FC = () => {
  const { settings, getSlotInfo } = useApp();
  const today = getTodayStr();
  const tomorrow = addDaysStr(today, 1);

  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [showPreviewWhatsApp, setShowPreviewWhatsApp] = useState(false);
  const [modalState, setModalState] = useState<ModalState | null>(null);

  const hours = useMemo(() => {
    const list: number[] = [];
    for (let h = settings.openHour; h <= settings.closeHour; h++) {
      list.push(h);
    }
    return list;
  }, [settings.openHour, settings.closeHour]);

  const slotsMatrix = useMemo(() => {
    const map: Record<string, Record<number, GridSlotInfo>> = {};
    for (const court of settings.courts) {
      map[court.id] = {};
      for (const h of hours) {
        map[court.id][h] = getSlotInfo(selectedDate, court.id, h);
      }
    }
    return map;
  }, [settings.courts, hours, selectedDate, getSlotInfo]);

  const dailySummary = useMemo(() => {
    let totalSlots = 0;
    let occupied = 0;
    let free = 0;
    let pendingAmount = 0;
    let collectedTodayForSlots = 0;

    for (const court of settings.courts) {
      for (const h of hours) {
        totalSlots++;
        const slot = slotsMatrix[court.id]?.[h];
        if (!slot || slot.isAvailable) {
          free++;
        } else {
          occupied++;
          if (slot.booking) {
            collectedTodayForSlots += getBookingPaidAmount(slot.booking);
            pendingAmount += getBookingPendingAmount(slot.booking);
          } else if (slot.recurringBooking) {
            pendingAmount += court.hourlyPrice;
          }
        }
      }
    }

    return {
      totalSlots,
      occupied,
      free,
      pendingAmount,
      collectedTodayForSlots,
    };
  }, [settings.courts, hours, slotsMatrix]);

  const freeSlotsWhatsAppText = useMemo(() => {
    const freeByCourt: Record<string, number[]> = {};
    for (const court of settings.courts) {
      freeByCourt[court.id] = hours.filter(
        (h) => slotsMatrix[court.id]?.[h]?.isAvailable
      );
    }
    return buildFreeSlotsWhatsAppText(
      selectedDate,
      settings.courts,
      freeByCourt,
      settings.complexName,
      settings.defaultDepositAmount
    );
  }, [selectedDate, settings, hours, slotsMatrix]);

  const handleCopyFreeSlots = async () => {
    try {
      await navigator.clipboard.writeText(freeSlotsWhatsAppText);
      setCopiedWhatsApp(true);
      setTimeout(() => setCopiedWhatsApp(false), 2600);
    } catch {
      setShowPreviewWhatsApp(true);
    }
  };

  const openSlotModal = (slot: GridSlotInfo) => {
    setModalState({
      isOpen: true,
      date: slot.date,
      courtId: slot.courtId,
      hour: slot.hour,
      existingBooking: slot.booking,
      recurringTemplate: slot.booking ? null : slot.recurringBooking,
    });
  };

  return (
    <div className="space-y-5">
      {/* Page Header & Date Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            Grilla de Turnos
          </h1>
          <p className="text-sm text-slate-400 capitalize">
            {formatDateLong(selectedDate)}
            {selectedDate === today && (
              <span className="ml-2 inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                Hoy
              </span>
            )}
            {selectedDate === tomorrow && (
              <span className="ml-2 inline-flex items-center rounded-full bg-sky-500/15 px-2 py-0.5 text-xs font-semibold text-sky-400">
                Mañana
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Date Selector */}
          <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900 p-1">
            <button
              type="button"
              onClick={() => setSelectedDate((d) => addDaysStr(d, -1))}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              title="Día anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(today)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                selectedDate === today
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(tomorrow)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                selectedDate === tomorrow
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Mañana
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate((d) => addDaysStr(d, 1))}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              title="Día siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="relative">
            <CalendarIcon className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-900 py-2 pl-9 pr-3 text-xs font-medium text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyFreeSlots}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-sm ${
                copiedWhatsApp
                  ? 'bg-emerald-500 text-slate-950'
                  : 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
              }`}
            >
              {copiedWhatsApp ? (
                <>
                  <Check className="h-4 w-4" />
                  ¡Horarios copiados!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copiar horarios libres del día
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowPreviewWhatsApp((v) => !v)}
              className="rounded-xl border border-slate-800 bg-slate-900 px-2.5 py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-800"
              title="Ver texto generado para WhatsApp"
            >
              <MessageCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Preview WhatsApp Free Slots */}
      {showPreviewWhatsApp && (
        <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/90 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Vista previa del texto para pegar en WhatsApp
            </span>
            <button
              type="button"
              onClick={() => setShowPreviewWhatsApp(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Ocultar
            </button>
          </div>
          <pre className="whitespace-pre-wrap rounded-xl bg-slate-950 p-3 text-xs text-slate-200 font-sans border border-slate-800">
            {freeSlotsWhatsAppText}
          </pre>
        </div>
      )}

      {/* Quick Daily Metrics & Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-800/90 bg-slate-900/70 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Turnos ocupados
          </p>
          <p className="mt-1 text-xl font-bold text-white">
            {dailySummary.occupied}{' '}
            <span className="text-xs font-normal text-slate-500">
              / {dailySummary.totalSlots}
            </span>
          </p>
        </div>
        <div className="rounded-xl border border-slate-800/90 bg-slate-900/70 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Horarios libres
          </p>
          <p className="mt-1 text-xl font-bold text-emerald-400">
            {dailySummary.free}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800/90 bg-slate-900/70 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Cobrado de estos turnos
          </p>
          <p className="mt-1 text-xl font-bold text-sky-400">
            {formatCurrency(dailySummary.collectedTodayForSlots)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800/90 bg-slate-900/70 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Saldo por cobrar del día
          </p>
          <p className="mt-1 text-xl font-bold text-amber-400">
            {formatCurrency(dailySummary.pendingAmount)}
          </p>
        </div>
      </div>

      {/* Color Legend */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800/80 bg-slate-900/50 px-4 py-2.5 text-xs">
        <span className="font-semibold text-slate-400 mr-1">Estados:</span>
        <span className="inline-flex items-center gap-1.5 text-slate-300">
          <span className="h-2.5 w-2.5 rounded-full border border-slate-600 bg-slate-800" />
          Libre (clic para reservar)
        </span>
        <span className="inline-flex items-center gap-1.5 text-amber-300">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          Reservado / Esperando seña
        </span>
        <span className="inline-flex items-center gap-1.5 text-sky-300">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
          Confirmado / Señado
        </span>
        <span className="inline-flex items-center gap-1.5 text-emerald-300">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          Pagado / Finalizado
        </span>
        <span className="inline-flex items-center gap-1 text-violet-300 ml-auto">
          <Repeat className="h-3.5 w-3.5" />
          Turno Fijo Semanal
        </span>
      </div>

      {/* Parallel Two-Court Schedule Grid */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        {/* Court Column Headers */}
        <div className="grid grid-cols-[76px_1fr_1fr] sm:grid-cols-[92px_1fr_1fr] border-b border-slate-800 bg-slate-900/95">
          <div className="flex items-center justify-center border-r border-slate-800 p-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            Hora
          </div>
          {settings.courts.map((court) => (
            <div
              key={court.id}
              className="border-r last:border-r-0 border-slate-800 px-3 sm:px-4 py-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-white">
                    {court.name}
                  </h2>
                  <p className="text-[11px] text-slate-400">{court.surface}</p>
                </div>
                <span className="inline-flex w-fit items-center rounded-lg bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 text-xs font-bold text-emerald-400">
                  {formatCurrency(court.hourlyPrice)}/h
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Time Rows */}
        <div className="divide-y divide-slate-800/80">
          {hours.map((hour) => (
            <div
              key={hour}
              className="grid grid-cols-[76px_1fr_1fr] sm:grid-cols-[92px_1fr_1fr]"
            >
              {/* Hour Cell */}
              <div className="flex flex-col items-center justify-center border-r border-slate-800 bg-slate-950/40 px-2 py-3">
                <span className="text-sm sm:text-base font-extrabold text-slate-200 tabular-nums">
                  {formatHour(hour)}
                </span>
                <span className="text-[10px] text-slate-500">
                  a {formatHour(hour + 1)}
                </span>
              </div>

              {/* Court Cells */}
              {settings.courts.map((court) => {
                const slot = slotsMatrix[court.id]?.[hour];
                if (!slot) return null;

                // FREE SLOT
                if (slot.isAvailable) {
                  return (
                    <div
                      key={court.id}
                      className="border-r last:border-r-0 border-slate-800/80 p-2 sm:p-2.5"
                    >
                      <button
                        type="button"
                        onClick={() => openSlotModal(slot)}
                        className="group flex h-full min-h-[76px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40 px-3 py-2 text-center transition hover:border-emerald-500/50 hover:bg-emerald-500/5"
                      >
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 group-hover:text-emerald-400 transition">
                          <Plus className="h-3.5 w-3.5" />
                          <span>Libre — Reservar</span>
                        </div>
                        <span className="mt-0.5 text-[11px] text-slate-600 group-hover:text-slate-400">
                          {formatCurrency(court.hourlyPrice)}
                        </span>
                      </button>
                    </div>
                  );
                }

                // OCCUPIED SLOT (Booking or Virtual Recurring)
                const booking = slot.booking;
                const recurring = slot.recurringBooking;

                const status = booking?.status || 'PENDING_DEPOSIT';
                const clientName =
                  booking?.clientName || recurring?.clientName || '';
                const clientPhone =
                  booking?.clientPhone || recurring?.clientPhone || '';
                const notes = booking?.notes || recurring?.notes || '';
                const totalPrice = booking?.totalPrice ?? court.hourlyPrice;
                const paid = booking ? getBookingPaidAmount(booking) : 0;
                const pending = booking
                  ? getBookingPendingAmount(booking)
                  : court.hourlyPrice;

                const cardThemes = {
                  PENDING_DEPOSIT: {
                    wrapper:
                      'border-amber-500/45 bg-amber-500/10 hover:bg-amber-500/15',
                    pill: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                    label: recurring && !booking ? 'Fijo (Sin seña)' : 'Esperando seña',
                    icon: AlertTriangle,
                  },
                  CONFIRMED: {
                    wrapper:
                      'border-sky-500/45 bg-sky-500/10 hover:bg-sky-500/15',
                    pill: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
                    label: 'Confirmado / Señado',
                    icon: Clock,
                  },
                  PAID: {
                    wrapper:
                      'border-emerald-500/50 bg-emerald-500/15 hover:bg-emerald-500/20',
                    pill: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                    label: 'Pagado',
                    icon: CheckCircle2,
                  },
                  CANCELLED: {
                    wrapper: 'border-slate-700 bg-slate-800/40',
                    pill: 'bg-slate-700 text-slate-300 border-slate-600',
                    label: 'Cancelado',
                    icon: AlertTriangle,
                  },
                };

                const theme = cardThemes[status];
                const StatusIcon = theme.icon;

                const waMessage = buildBookingWhatsAppMessage({
                  clientName,
                  courtName: court.name,
                  dateStr: selectedDate,
                  hour,
                  status,
                  totalPrice,
                  paidAmount: paid,
                  pendingAmount: pending,
                  transferAlias: settings.transferAlias,
                  defaultDeposit: settings.defaultDepositAmount,
                });
                const waUrl = buildWhatsAppUrl(clientPhone, waMessage);

                return (
                  <div
                    key={court.id}
                    className="border-r last:border-r-0 border-slate-800/80 p-2 sm:p-2.5"
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => openSlotModal(slot)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openSlotModal(slot);
                        }
                      }}
                      className={`flex h-full min-h-[76px] w-full cursor-pointer flex-col justify-between rounded-xl border p-2.5 sm:p-3 transition text-left ${theme.wrapper}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="truncate text-sm font-bold text-white">
                              {clientName}
                            </span>
                            {(booking?.recurringBookingId || recurring) && (
                              <span
                                title="Turno Fijo Semanal"
                                className="inline-flex items-center gap-0.5 rounded-md border border-violet-500/40 bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-bold text-violet-200"
                              >
                                <Repeat className="h-2.5 w-2.5" />
                                Fijo
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-300/90 mt-0.5">
                            {clientPhone}
                          </p>
                        </div>

                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title="Enviar WhatsApp al cliente"
                          className="shrink-0 rounded-lg border border-emerald-500/30 bg-slate-950/60 p-1.5 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </a>
                      </div>

                      {notes && (
                        <p className="mt-1.5 line-clamp-1 text-[11px] text-slate-300/80 italic">
                          “{notes}”
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-white/10">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${theme.pill}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {theme.label}
                        </span>

                        <div className="text-[11px] font-semibold tabular-nums">
                          {pending === 0 ? (
                            <span className="text-emerald-300">
                              Saldado ({formatCurrency(totalPrice)})
                            </span>
                          ) : (
                            <span className="text-slate-200">
                              Falta{' '}
                              <span className="text-amber-300">
                                {formatCurrency(pending)}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Booking Modal */}
      {modalState && (
        <BookingModal
          isOpen={modalState.isOpen}
          onClose={() => setModalState(null)}
          initialDate={modalState.date}
          initialCourtId={modalState.courtId}
          initialHour={modalState.hour}
          existingBooking={modalState.existingBooking}
          recurringTemplate={modalState.recurringTemplate}
        />
      )}
    </div>
  );
};
