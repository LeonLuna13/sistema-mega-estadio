import React, { useMemo, useState } from 'react';
import {
  X,
  User,
  Phone,
  Calendar,
  Clock,
  CheckCircle2,
  MessageCircle,
  Banknote,
  ArrowRightLeft,
  Repeat,
  Trash2,
  StickyNote,
  AlertCircle,
  Search,
} from 'lucide-react';
import {
  Booking,
  CourtId,
  DepositMethod,
  RecurringBooking,
} from '../../types';
import { useApp } from '../../context/AppContext';
import {
  buildBookingWhatsAppMessage,
  buildWhatsAppUrl,
  computeBookingStatus,
  formatCurrency,
  formatDateLong,
  formatHour,
} from '../../utils/formatters';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate: string;
  initialCourtId: CourtId;
  initialHour: number;
  existingBooking: Booking | null;
  recurringTemplate: RecurringBooking | null;
}

type BalancePayMode = 'NONE' | 'CASH' | 'TRANSFER' | 'MIXED';

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  initialDate,
  initialCourtId,
  initialHour,
  existingBooking,
  recurringTemplate,
}) => {
  const {
    settings,
    clients,
    getCourtById,
    saveBooking,
    cancelBooking,
    skipRecurringDate,
  } = useApp();

  const initialCourt = getCourtById(existingBooking?.courtId || initialCourtId);
  const defaultPrice =
    existingBooking?.totalPrice ?? initialCourt?.hourlyPrice ?? 50000;

  const [courtId, setCourtId] = useState<CourtId>(
    existingBooking?.courtId || initialCourtId
  );
  const [date, setDate] = useState<string>(existingBooking?.date || initialDate);
  const [hour, setHour] = useState<number>(existingBooking?.hour ?? initialHour);

  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(
    existingBooking?.clientId || recurringTemplate?.clientId
  );
  const [clientName, setClientName] = useState<string>(
    existingBooking?.clientName || recurringTemplate?.clientName || ''
  );
  const [clientPhone, setClientPhone] = useState<string>(
    existingBooking?.clientPhone || recurringTemplate?.clientPhone || ''
  );
  const [showClientPicker, setShowClientPicker] = useState(false);

  const [totalPrice, setTotalPrice] = useState<number>(defaultPrice);
  const [hasDeposit, setHasDeposit] = useState<boolean>(
    existingBooking ? existingBooking.depositAmount > 0 : false
  );
  const [depositAmount, setDepositAmount] = useState<number>(
    existingBooking && existingBooking.depositAmount > 0
      ? existingBooking.depositAmount
      : settings.defaultDepositAmount
  );
  const [depositMethod, setDepositMethod] = useState<DepositMethod>(
    existingBooking?.depositMethod || 'TRANSFER'
  );
  const [whatsappReceiptVerified, setWhatsappReceiptVerified] = useState<boolean>(
    existingBooking?.whatsappReceiptVerified || false
  );

  const initialBalanceCash = existingBooking?.balanceCashAmount || 0;
  const initialBalanceTransfer = existingBooking?.balanceTransferAmount || 0;

  const getInitialBalanceMode = (): BalancePayMode => {
    if (initialBalanceCash > 0 && initialBalanceTransfer > 0) return 'MIXED';
    if (initialBalanceCash > 0) return 'CASH';
    if (initialBalanceTransfer > 0) return 'TRANSFER';
    return 'NONE';
  };

  const [balanceMode, setBalanceMode] = useState<BalancePayMode>(
    getInitialBalanceMode
  );
  const [balanceCashAmount, setBalanceCashAmount] = useState<number>(
    initialBalanceCash
  );
  const [balanceTransferAmount, setBalanceTransferAmount] = useState<number>(
    initialBalanceTransfer
  );

  const [notes, setNotes] = useState<string>(
    existingBooking?.notes || recurringTemplate?.notes || ''
  );
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [confirmCancel, setConfirmCancel] = useState(false);

  const filteredClients = useMemo(() => {
    const q = clientName.trim().toLowerCase();
    if (!q) return clients.slice(0, 6);
    return clients
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [clients, clientName]);

  if (!isOpen) return null;

  const effectiveDeposit = hasDeposit ? Math.max(0, Number(depositAmount) || 0) : 0;
  const remainingAfterDeposit = Math.max(0, totalPrice - effectiveDeposit);

  const effectiveBalanceCash =
    balanceMode === 'NONE' ? 0 : Math.max(0, Number(balanceCashAmount) || 0);
  const effectiveBalanceTransfer =
    balanceMode === 'NONE' ? 0 : Math.max(0, Number(balanceTransferAmount) || 0);

  const totalPaid =
    effectiveDeposit + effectiveBalanceCash + effectiveBalanceTransfer;
  const pendingBalance = Math.max(0, totalPrice - totalPaid);

  const previewStatus = computeBookingStatus(
    totalPrice,
    effectiveDeposit,
    effectiveBalanceCash,
    effectiveBalanceTransfer,
    whatsappReceiptVerified,
    depositMethod
  );

  const activeCourt = getCourtById(courtId);

  const availableHours: number[] = [];
  for (let h = settings.openHour; h <= settings.closeHour; h++) {
    availableHours.push(h);
  }

  const handleCourtChange = (newCourtId: CourtId) => {
    setCourtId(newCourtId);
    if (!existingBooking) {
      const court = getCourtById(newCourtId);
      if (court) setTotalPrice(court.hourlyPrice);
    }
  };

  const handleToggleDeposit = (checked: boolean) => {
    setHasDeposit(checked);
    if (checked) {
      const nextDep = depositAmount > 0 ? depositAmount : settings.defaultDepositAmount;
      setDepositAmount(nextDep);
      if (depositMethod === 'TRANSFER') {
        setWhatsappReceiptVerified(true);
      }
      // Recalcular saldo si ya estaba en modo completo
      const nextRemaining = Math.max(0, totalPrice - nextDep);
      if (balanceMode === 'CASH') setBalanceCashAmount(nextRemaining);
      if (balanceMode === 'TRANSFER') setBalanceTransferAmount(nextRemaining);
    } else {
      setWhatsappReceiptVerified(false);
      if (balanceMode === 'CASH') setBalanceCashAmount(totalPrice);
      if (balanceMode === 'TRANSFER') setBalanceTransferAmount(totalPrice);
    }
  };

  const handleSelectBalanceMode = (mode: BalancePayMode) => {
    setBalanceMode(mode);
    if (mode === 'NONE') {
      setBalanceCashAmount(0);
      setBalanceTransferAmount(0);
    } else if (mode === 'CASH') {
      setBalanceCashAmount(remainingAfterDeposit);
      setBalanceTransferAmount(0);
    } else if (mode === 'TRANSFER') {
      setBalanceCashAmount(0);
      setBalanceTransferAmount(remainingAfterDeposit);
    } else if (mode === 'MIXED') {
      const half = Math.round(remainingAfterDeposit / 2);
      setBalanceCashAmount(half);
      setBalanceTransferAmount(Math.max(0, remainingAfterDeposit - half));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!clientName.trim()) {
      setErrorMsg('Ingresá el nombre del cliente.');
      return;
    }
    if (!clientPhone.trim()) {
      setErrorMsg('Ingresá el teléfono de contacto para WhatsApp.');
      return;
    }

    const result = saveBooking({
      id: existingBooking?.id,
      courtId,
      clientId: selectedClientId,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      date,
      hour,
      totalPrice,
      depositAmount: effectiveDeposit,
      depositMethod,
      whatsappReceiptVerified: hasDeposit && depositMethod === 'TRANSFER' ? whatsappReceiptVerified : false,
      balanceCashAmount: effectiveBalanceCash,
      balanceTransferAmount: effectiveBalanceTransfer,
      notes,
      recurringBookingId:
        existingBooking?.recurringBookingId || recurringTemplate?.id,
    });

    if (!result.ok) {
      setErrorMsg(result.error || 'No se pudo guardar el turno.');
      return;
    }

    onClose();
  };

  const handleCancelOrRelease = () => {
    if (existingBooking) {
      cancelBooking(existingBooking.id);
      onClose();
      return;
    }
    if (recurringTemplate) {
      skipRecurringDate(recurringTemplate.id, date);
      onClose();
    }
  };

  const whatsappMessage = buildBookingWhatsAppMessage({
    clientName: clientName || 'Cliente',
    courtName: activeCourt?.name || 'Cancha',
    dateStr: date,
    hour,
    status: previewStatus,
    totalPrice,
    paidAmount: totalPaid,
    pendingAmount: pendingBalance,
    transferAlias: settings.transferAlias,
    defaultDeposit: settings.defaultDepositAmount,
  });

  const whatsappUrl = buildWhatsAppUrl(clientPhone, whatsappMessage);

  const statusBadgeMap = {
    PENDING_DEPOSIT: {
      label: 'Esperando seña',
      className: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    },
    CONFIRMED: {
      label: 'Confirmado / Señado',
      className: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
    },
    PAID: {
      label: 'Pagado / Finalizado',
      className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    },
    CANCELLED: {
      label: 'Cancelado',
      className: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl my-auto max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-white">
                {existingBooking
                  ? 'Gestionar Turno'
                  : recurringTemplate
                  ? 'Turno Fijo del Día'
                  : 'Nuevo Turno'}
              </h2>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadgeMap[previewStatus].className}`}
              >
                {statusBadgeMap[previewStatus].label}
              </span>
              {(existingBooking?.recurringBookingId || recurringTemplate) && (
                <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/40 bg-violet-500/15 px-2.5 py-0.5 text-xs font-semibold text-violet-300">
                  <Repeat className="h-3 w-3" />
                  Turno Fijo
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-400 capitalize">
              {activeCourt?.name} • {formatDateLong(date)} • {formatHour(hour)} hs
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-5 py-4 space-y-5">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Cliente */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Datos del Cliente
              </label>
              {clients.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowClientPicker((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300"
                >
                  <Search className="h-3.5 w-3.5" />
                  {showClientPicker ? 'Ocultar lista' : 'Elegir cliente guardado'}
                </button>
              )}
            </div>

            {showClientPicker && (
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-2 space-y-1 max-h-40 overflow-y-auto">
                {filteredClients.length === 0 ? (
                  <p className="px-2 py-1.5 text-xs text-slate-500">
                    No hay coincidencias. Se creará un cliente nuevo al guardar.
                  </p>
                ) : (
                  filteredClients.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedClientId(c.id);
                        setClientName(c.name);
                        setClientPhone(c.phone);
                        if (!notes && c.notes) setNotes(c.notes);
                        setShowClientPicker(false);
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-slate-800"
                    >
                      <span className="font-medium text-slate-200">{c.name}</span>
                      <span className="text-slate-400">{c.phone}</span>
                    </button>
                  ))
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Nombre y Apellido
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => {
                      setClientName(e.target.value);
                      setSelectedClientId(undefined);
                    }}
                    onFocus={() => {
                      if (!existingBooking && !recurringTemplate && !clientName) {
                        setShowClientPicker(true);
                      }
                    }}
                    placeholder="Ej: Juan Pérez"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  WhatsApp / Teléfono
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="Ej: 1154328910"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Cancha, Fecha, Hora y Precio */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Cancha
              </label>
              <select
                value={courtId}
                onChange={(e) => handleCourtChange(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                {settings.courts.map((court) => (
                  <option key={court.id} value={court.id}>
                    {court.name} ({formatCurrency(court.hourlyPrice)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Fecha
              </label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-9 pr-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Hora
              </label>
              <div className="relative">
                <Clock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <select
                  value={hour}
                  onChange={(e) => setHour(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-9 pr-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                >
                  {availableHours.map((h) => (
                    <option key={h} value={h}>
                      {formatHour(h)} hs
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Seña y Comprobante WhatsApp */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <input
                  id="has-deposit"
                  type="checkbox"
                  checked={hasDeposit}
                  onChange={(e) => handleToggleDeposit(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                />
                <label
                  htmlFor="has-deposit"
                  className="text-sm font-semibold text-white cursor-pointer"
                >
                  Seña abonada
                </label>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Valor turno:</span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={totalPrice}
                  onChange={(e) => setTotalPrice(Math.max(0, Number(e.target.value)))}
                  className="w-28 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-right font-semibold text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {hasDeposit && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    Monto de seña
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={depositAmount}
                    onChange={(e) =>
                      setDepositAmount(Math.max(0, Number(e.target.value)))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    Medio de seña
                  </label>
                  <select
                    value={depositMethod}
                    onChange={(e) =>
                      setDepositMethod(e.target.value as DepositMethod)
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="TRANSFER">Transferencia</option>
                    <option value="CASH">Efectivo</option>
                  </select>
                </div>
                <div className="flex items-end pb-1">
                  {depositMethod === 'TRANSFER' ? (
                    <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 w-full hover:border-emerald-500/50">
                      <input
                        type="checkbox"
                        checked={whatsappReceiptVerified}
                        onChange={(e) =>
                          setWhatsappReceiptVerified(e.target.checked)
                        }
                        className="h-4 w-4 rounded border-slate-600 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span className="text-xs font-medium text-slate-200">
                        Comprobante recibido por WhatsApp
                      </span>
                    </label>
                  ) : (
                    <div className="text-xs text-emerald-400 font-medium flex items-center gap-1.5 py-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      Seña recibida en efectivo
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Cobro del Saldo Final */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-white">
                Cobro del Saldo Final
              </span>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-slate-400">
                  Abonado:{' '}
                  <strong className="text-emerald-400">
                    {formatCurrency(totalPaid)}
                  </strong>
                </span>
                <span className="text-slate-400">
                  Pendiente:{' '}
                  <strong
                    className={
                      pendingBalance > 0 ? 'text-amber-400' : 'text-emerald-400'
                    }
                  >
                    {formatCurrency(pendingBalance)}
                  </strong>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleSelectBalanceMode('NONE')}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  balanceMode === 'NONE'
                    ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
                    : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                }`}
              >
                Sin cobrar saldo
              </button>
              <button
                type="button"
                onClick={() => handleSelectBalanceMode('CASH')}
                className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  balanceMode === 'CASH'
                    ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300'
                    : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Banknote className="h-3.5 w-3.5" />
                Efectivo
              </button>
              <button
                type="button"
                onClick={() => handleSelectBalanceMode('TRANSFER')}
                className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  balanceMode === 'TRANSFER'
                    ? 'border-sky-500/60 bg-sky-500/15 text-sky-300'
                    : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
                Transferencia
              </button>
              <button
                type="button"
                onClick={() => handleSelectBalanceMode('MIXED')}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  balanceMode === 'MIXED'
                    ? 'border-violet-500/60 bg-violet-500/15 text-violet-300'
                    : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                }`}
              >
                Pago Mixto
              </button>
            </div>

            {balanceMode !== 'NONE' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {(balanceMode === 'CASH' || balanceMode === 'MIXED') && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-400">
                      Monto en Efectivo
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={500}
                      value={balanceCashAmount}
                      onChange={(e) =>
                        setBalanceCashAmount(Math.max(0, Number(e.target.value)))
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-semibold text-emerald-300 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                )}
                {(balanceMode === 'TRANSFER' || balanceMode === 'MIXED') && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-400">
                      Monto por Transferencia
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={500}
                      value={balanceTransferAmount}
                      onChange={(e) =>
                        setBalanceTransferAmount(
                          Math.max(0, Number(e.target.value))
                        )
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-semibold text-sky-300 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notas */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Observaciones / Notas del Turno
            </label>
            <div className="relative">
              <StickyNote className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Pide pecheras, trae equipo completo, abonan con billete grande..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-800 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              {(existingBooking || recurringTemplate) &&
                (!confirmCancel ? (
                  <button
                    type="button"
                    onClick={() => setConfirmCancel(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {recurringTemplate || existingBooking?.recurringBookingId
                      ? 'Liberar solo esta fecha'
                      : 'Cancelar / Liberar'}
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleCancelOrRelease}
                      className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-500"
                    >
                      Confirmar liberación
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmCancel(false)}
                      className="rounded-xl border border-slate-700 px-2.5 py-2 text-xs text-slate-300 hover:bg-slate-800"
                    >
                      No
                    </button>
                  </div>
                ))}

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp Cliente
              </a>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
              >
                Cerrar
              </button>
              <button
                type="submit"
                className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition"
              >
                Guardar Turno
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
