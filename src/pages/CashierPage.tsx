import React, { useMemo, useState } from 'react';
import {
  Wallet,
  Banknote,
  ArrowRightLeft,
  Download,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle2,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  exportCashMovementsToCsv,
  formatCurrency,
  formatDateShort,
  formatHour,
  getBookingPendingAmount,
  getStartOfMonthStr,
  getStartOfWeekStr,
  getTodayStr,
} from '../utils/formatters';
import { CourtId } from '../types';

type PeriodFilter = 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM';
type MethodFilter = 'ALL' | 'CASH' | 'TRANSFER';

export const CashierPage: React.FC = () => {
  const {
    settings,
    bookings,
    cashMovements,
    getCourtById,
    addManualCashMovement,
  } = useApp();

  const today = getTodayStr();
  const [period, setPeriod] = useState<PeriodFilter>('TODAY');
  const [customFrom, setCustomFrom] = useState<string>(getStartOfWeekStr(today));
  const [customTo, setCustomTo] = useState<string>(today);
  const [methodFilter, setMethodFilter] = useState<MethodFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualDesc, setManualDesc] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualMethod, setManualMethod] = useState<'CASH' | 'TRANSFER'>('CASH');
  const [manualCourtId, setManualCourtId] = useState<CourtId | ''>('');

  const dateRange = useMemo(() => {
    if (period === 'TODAY') return { from: today, to: today };
    if (period === 'WEEK') return { from: getStartOfWeekStr(today), to: today };
    if (period === 'MONTH') return { from: getStartOfMonthStr(today), to: today };
    return {
      from: customFrom <= customTo ? customFrom : customTo,
      to: customTo >= customFrom ? customTo : customFrom,
    };
  }, [period, today, customFrom, customTo]);

  const movementsInPeriod = useMemo(() => {
    return cashMovements.filter(
      (m) => m.date >= dateRange.from && m.date <= dateRange.to
    );
  }, [cashMovements, dateRange]);

  const filteredTableMovements = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return movementsInPeriod
      .filter((m) => methodFilter === 'ALL' || m.paymentMethod === methodFilter)
      .filter((m) => {
        if (!q) return true;
        return (
          m.clientName.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [movementsInPeriod, methodFilter, searchQuery]);

  const metrics = useMemo(() => {
    let totalCollected = 0;
    let cashTotal = 0;
    let transferTotal = 0;
    const byCourt: Record<string, number> = {};
    for (const c of settings.courts) {
      byCourt[c.id] = 0;
    }

    for (const m of movementsInPeriod) {
      totalCollected += m.amount;
      if (m.paymentMethod === 'CASH') cashTotal += m.amount;
      if (m.paymentMethod === 'TRANSFER') transferTotal += m.amount;
      if (m.courtId && byCourt[m.courtId] !== undefined) {
        byCourt[m.courtId] += m.amount;
      }
    }

    const bookingsInRange = bookings.filter(
      (b) =>
        b.status !== 'CANCELLED' &&
        b.date >= dateRange.from &&
        b.date <= dateRange.to
    );

    const playedOrPaidBookings = bookingsInRange.filter(
      (b) => b.status === 'PAID' || b.date <= today
    ).length;

    const pendingBalancesTotal = bookingsInRange.reduce(
      (sum, b) => sum + getBookingPendingAmount(b),
      0
    );

    const pendingBookingsCount = bookingsInRange.filter(
      (b) => getBookingPendingAmount(b) > 0
    ).length;

    return {
      totalCollected,
      cashTotal,
      transferTotal,
      byCourt,
      totalBookingsCount: bookingsInRange.length,
      playedOrPaidBookings,
      pendingBalancesTotal,
      pendingBookingsCount,
    };
  }, [movementsInPeriod, bookings, dateRange, settings.courts, today]);

  const handleAddManualMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(manualAmount);
    if (!manualDesc.trim() || !numAmount || numAmount <= 0) return;

    addManualCashMovement({
      description: manualDesc,
      amount: numAmount,
      paymentMethod: manualMethod,
      courtId: manualCourtId || undefined,
      date: today,
    });

    setManualDesc('');
    setManualAmount('');
    setManualCourtId('');
    setManualModalOpen(false);
  };

  const typeBadge: Record<string, { label: string; cls: string }> = {
    DEPOSIT: {
      label: 'Seña',
      cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    },
    BALANCE: {
      label: 'Saldo',
      cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    },
    FULL_PAYMENT: {
      label: 'Pago Total',
      cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    },
    MANUAL_INCOME: {
      label: 'Ingreso Extra',
      cls: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Wallet className="h-6 w-6 text-emerald-400" />
            Caja, Pagos y Reportes
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Período seleccionado: {formatDateShort(dateRange.from)} al{' '}
            {formatDateShort(dateRange.to)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setManualModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
          >
            <Plus className="h-4 w-4 text-emerald-400" />
            Ingreso Manual
          </button>

          <button
            type="button"
            onClick={() =>
              exportCashMovementsToCsv(
                filteredTableMovements,
                settings.courts,
                `caja-${dateRange.from}-al-${dateRange.to}.csv`
              )
            }
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition"
          >
            <Download className="h-4 w-4" />
            Exportar a CSV
          </button>
        </div>
      </div>

      {/* Period Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'TODAY', label: 'Hoy' },
            { id: 'WEEK', label: 'Esta Semana' },
            { id: 'MONTH', label: 'Este Mes' },
            { id: 'CUSTOM', label: 'Rango personalizado' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPeriod(item.id as PeriodFilter)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                period === item.id
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {period === 'CUSTOM' && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Calendar className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-white focus:border-emerald-500 focus:outline-none"
            />
            <span className="text-slate-500">hasta</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 to-slate-900 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
              Total Recaudado
            </span>
            <TrendingUp className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-white tabular-nums">
            {formatCurrency(metrics.totalCollected)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {movementsInPeriod.length} movimiento(s) en el período
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Efectivo vs Transferencia
            </span>
            <ArrowRightLeft className="h-5 w-5 text-sky-400" />
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Banknote className="h-4 w-4 text-emerald-400" />
                Efectivo
              </span>
              <span className="font-bold text-emerald-400 tabular-nums">
                {formatCurrency(metrics.cashTotal)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-slate-300">
                <ArrowRightLeft className="h-4 w-4 text-sky-400" />
                Transferencia (inc. señas)
              </span>
              <span className="font-bold text-sky-400 tabular-nums">
                {formatCurrency(metrics.transferTotal)}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Recaudado por Cancha
            </span>
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="mt-3 space-y-2">
            {settings.courts.map((court) => (
              <div
                key={court.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="truncate pr-2 text-slate-300">
                  {court.shortName}
                </span>
                <span className="font-bold text-white tabular-nums">
                  {formatCurrency(metrics.byCourt[court.id] || 0)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Turnos y Pendientes
            </span>
            <Clock className="h-5 w-5 text-amber-400" />
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-300">Turnos jugados / activos</span>
              <span className="font-bold text-white tabular-nums">
                {metrics.playedOrPaidBookings} / {metrics.totalBookingsCount}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-300">
                Saldos pendientes ({metrics.pendingBookingsCount})
              </span>
              <span className="font-bold text-amber-400 tabular-nums">
                {formatCurrency(metrics.pendingBalancesTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Movements Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-white mr-2">
              Historial de Movimientos
            </h2>
            {[
              { id: 'ALL', label: 'Todos' },
              { id: 'CASH', label: 'Efectivo' },
              { id: 'TRANSFER', label: 'Transferencia' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMethodFilter(tab.id as MethodFilter)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  methodFilter === tab.id
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar cliente o detalle..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 py-1.5 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {filteredTableMovements.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">
            No se encontraron movimientos en el período seleccionado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3">Fecha Pago</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Cancha / Turno</th>
                  <th className="px-4 py-3">Método</th>
                  <th className="px-4 py-3">Detalle</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredTableMovements.map((mov) => {
                  const court = mov.courtId ? getCourtById(mov.courtId) : null;
                  const badge = typeBadge[mov.type] || typeBadge.BALANCE;
                  return (
                    <tr
                      key={mov.id}
                      className="hover:bg-slate-800/40 transition"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-slate-300">
                        {formatDateShort(mov.date)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-white">
                        {mov.clientName}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-300 whitespace-nowrap">
                        {court ? court.shortName : '-'}
                        {mov.bookingDate && mov.bookingHour !== undefined && (
                          <span className="block text-[11px] text-slate-500">
                            {formatDateShort(mov.bookingDate)} •{' '}
                            {formatHour(mov.bookingHour)}hs
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold ${
                            mov.paymentMethod === 'CASH'
                              ? 'text-emerald-400'
                              : 'text-sky-400'
                          }`}
                        >
                          {mov.paymentMethod === 'CASH' ? (
                            <>
                              <Banknote className="h-3.5 w-3.5" />
                              Efectivo
                            </>
                          ) : (
                            <>
                              <ArrowRightLeft className="h-3.5 w-3.5" />
                              Transferencia
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 max-w-xs truncate">
                        {mov.description}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-white tabular-nums whitespace-nowrap">
                        {formatCurrency(mov.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Income Modal */}
      {manualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <h2 className="text-base font-bold text-white">
                Registrar Ingreso Manual
              </h2>
              <button
                type="button"
                onClick={() => setManualModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddManualMovement} className="p-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Concepto / Detalle
                </label>
                <input
                  type="text"
                  required
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  placeholder="Ej: Alquiler de pelota / Bebidas / Ajuste"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Monto ($)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    placeholder="5000"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Método
                  </label>
                  <select
                    value={manualMethod}
                    onChange={(e) =>
                      setManualMethod(e.target.value as 'CASH' | 'TRANSFER')
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="CASH">Efectivo</option>
                    <option value="TRANSFER">Transferencia</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Cancha asociada (opcional)
                </label>
                <select
                  value={manualCourtId}
                  onChange={(e) => setManualCourtId(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">General / Cantina</option>
                  {settings.courts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.shortName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setManualModalOpen(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-400"
                >
                  Guardar Ingreso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
