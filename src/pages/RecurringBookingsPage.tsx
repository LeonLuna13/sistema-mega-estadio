import React, { useMemo, useState } from 'react';
import {
  Repeat,
  Plus,
  Edit2,
  Trash2,
  PauseCircle,
  PlayCircle,
  MessageCircle,
  CalendarOff,
  X,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CourtId, RecurringBooking } from '../types';
import {
  buildWhatsAppUrl,
  DAY_NAMES,
  formatCurrency,
  formatDateShort,
  formatHour,
  getTodayStr,
} from '../utils/formatters';

interface RecurringFormState {
  editingId?: string;
  clientId?: string;
  clientName: string;
  clientPhone: string;
  courtId: CourtId;
  dayOfWeek: number;
  hour: number;
  notes: string;
}

export const RecurringBookingsPage: React.FC = () => {
  const {
    settings,
    clients,
    recurringBookings,
    getCourtById,
    createRecurringBooking,
    updateRecurringBooking,
    toggleRecurringBooking,
    deleteRecurringBooking,
    skipRecurringDate,
    restoreRecurringDate,
  } = useApp();

  const [filterDay, setFilterDay] = useState<number | 'ALL'>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [skipDateInputs, setSkipDateInputs] = useState<Record<string, string>>({});

  const [form, setForm] = useState<RecurringFormState>({
    clientName: '',
    clientPhone: '',
    courtId: settings.courts[0]?.id || 'court-6',
    dayOfWeek: 2, // Martes por defecto
    hour: 20,
    notes: '',
  });

  const hours = useMemo(() => {
    const list: number[] = [];
    for (let h = settings.openHour; h <= settings.closeHour; h++) {
      list.push(h);
    }
    return list;
  }, [settings.openHour, settings.closeHour]);

  const filteredRecurring = useMemo(() => {
    return [...recurringBookings]
      .filter((r) => filterDay === 'ALL' || r.dayOfWeek === filterDay)
      .sort((a, b) => {
        if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
        return a.hour - b.hour;
      });
  }, [recurringBookings, filterDay]);

  const openCreateModal = () => {
    setErrorMsg('');
    setForm({
      clientName: '',
      clientPhone: '',
      courtId: settings.courts[0]?.id || 'court-6',
      dayOfWeek: 2,
      hour: 20,
      notes: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (rec: RecurringBooking) => {
    setErrorMsg('');
    setForm({
      editingId: rec.id,
      clientId: rec.clientId,
      clientName: rec.clientName,
      clientPhone: rec.clientPhone,
      courtId: rec.courtId,
      dayOfWeek: rec.dayOfWeek,
      hour: rec.hour,
      notes: rec.notes,
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!form.clientName.trim() || !form.clientPhone.trim()) {
      setErrorMsg('Completá el nombre y el teléfono del cliente.');
      return;
    }

    if (form.editingId) {
      const res = updateRecurringBooking(form.editingId, {
        clientId: form.clientId,
        clientName: form.clientName.trim(),
        clientPhone: form.clientPhone.trim(),
        courtId: form.courtId,
        dayOfWeek: form.dayOfWeek,
        hour: form.hour,
        notes: form.notes,
      });
      if (!res.ok) {
        setErrorMsg(res.error || 'Error al actualizar.');
        return;
      }
    } else {
      const res = createRecurringBooking({
        clientId: form.clientId,
        clientName: form.clientName.trim(),
        clientPhone: form.clientPhone.trim(),
        courtId: form.courtId,
        dayOfWeek: form.dayOfWeek,
        hour: form.hour,
        notes: form.notes,
      });
      if (!res.ok) {
        setErrorMsg(res.error || 'Error al crear turno fijo.');
        return;
      }
    }

    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Repeat className="h-6 w-6 text-violet-400" />
            Turnos Fijos Semanales
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Se reflejan automáticamente en la Grilla de Turnos para gestionar seña, pago o liberación puntual de cada fecha.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition"
        >
          <Plus className="h-4 w-4" />
          Nuevo Turno Fijo
        </button>
      </div>

      {/* Day Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-800 bg-slate-900/60 p-2">
        <button
          type="button"
          onClick={() => setFilterDay('ALL')}
          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
            filterDay === 'ALL'
              ? 'bg-emerald-500 text-slate-950'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          Todos ({recurringBookings.length})
        </button>
        {DAY_NAMES.map((dayName, idx) => {
          const count = recurringBookings.filter((r) => r.dayOfWeek === idx).length;
          return (
            <button
              key={dayName}
              type="button"
              onClick={() => setFilterDay(idx)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                filterDay === idx
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {dayName} {count > 0 ? `(${count})` : ''}
            </button>
          );
        })}
      </div>

      {/* Recurring List */}
      {filteredRecurring.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-10 text-center">
          <Repeat className="mx-auto h-10 w-10 text-slate-600" />
          <p className="mt-3 text-sm font-semibold text-slate-300">
            No hay turnos fijos configurados para este filtro
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Creá un turno fijo semanal para reservar automáticamente un día y horario.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRecurring.map((rec) => {
            const court = getCourtById(rec.courtId);
            const skipDateValue = skipDateInputs[rec.id] || getTodayStr();
            const waUrl = buildWhatsAppUrl(
              rec.clientPhone,
              `Hola ${rec.clientName.split(' ')[0]}! Te escribimos por tu turno fijo de los días ${DAY_NAMES[rec.dayOfWeek]} a las ${formatHour(rec.hour)} hs en ${court?.name || 'el complejo'}. ¿Confirman asistencia esta semana?`
            );

            return (
              <div
                key={rec.id}
                className={`rounded-2xl border p-4 transition space-y-3 ${
                  rec.isActive
                    ? 'border-slate-800 bg-slate-900/80'
                    : 'border-slate-800/60 bg-slate-900/40 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-lg border border-violet-500/40 bg-violet-500/15 px-2.5 py-0.5 text-xs font-bold text-violet-300">
                        {DAY_NAMES[rec.dayOfWeek]} • {formatHour(rec.hour)} hs
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          rec.isActive
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {rec.isActive ? 'Activo' : 'Pausado'}
                      </span>
                    </div>
                    <h3 className="mt-2 text-base font-bold text-white">
                      {rec.clientName}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {rec.clientPhone} • {court?.name} (
                      {formatCurrency(court?.hourlyPrice || 0)})
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-emerald-400 hover:bg-emerald-500/20"
                      title="Consultar por WhatsApp"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => openEditModal(rec)}
                      className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-300 hover:text-white"
                      title="Editar turno fijo"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleRecurringBooking(rec.id)}
                      className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-300 hover:text-amber-300"
                      title={rec.isActive ? 'Pausar' : 'Activar'}
                    >
                      {rec.isActive ? (
                        <PauseCircle className="h-4 w-4" />
                      ) : (
                        <PlayCircle className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteRecurringBooking(rec.id)}
                      className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-rose-400 hover:bg-rose-500/20"
                      title="Dar de baja definitiva"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {rec.notes && (
                  <p className="rounded-xl bg-slate-950/60 px-3 py-2 text-xs text-slate-300 border border-slate-800/80">
                    {rec.notes}
                  </p>
                )}

                {/* Liberar una fecha puntual */}
                <div className="border-t border-slate-800 pt-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <CalendarOff className="h-3.5 w-3.5" />
                      Liberar fecha puntual
                    </span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="date"
                        value={skipDateValue}
                        onChange={(e) =>
                          setSkipDateInputs((prev) => ({
                            ...prev,
                            [rec.id]: e.target.value,
                          }))
                        }
                        className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white focus:border-emerald-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => skipRecurringDate(rec.id, skipDateValue)}
                        className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500/25"
                      >
                        Liberar fecha
                      </button>
                    </div>
                  </div>

                  {rec.skippedDates.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-slate-500">
                        Fechas liberadas:
                      </span>
                      {rec.skippedDates.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => restoreRecurringDate(rec.id, d)}
                          title="Clic para restaurar el turno fijo en esta fecha"
                          className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-0.5 text-[11px] text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300"
                        >
                          {formatDateShort(d)}
                          <X className="h-3 w-3" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Create/Edit Recurring */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <h2 className="text-lg font-bold text-white">
                {form.editingId ? 'Editar Turno Fijo' : 'Nuevo Turno Fijo Semanal'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {errorMsg && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Seleccionar cliente rápido (opcional)
                </label>
                <select
                  value={form.clientId || ''}
                  onChange={(e) => {
                    const selected = clients.find((c) => c.id === e.target.value);
                    if (selected) {
                      setForm((prev) => ({
                        ...prev,
                        clientId: selected.id,
                        clientName: selected.name,
                        clientPhone: selected.phone,
                      }));
                    } else {
                      setForm((prev) => ({ ...prev, clientId: undefined }));
                    }
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">-- Cliente nuevo o escribir abajo --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Nombre del Cliente
                  </label>
                  <input
                    type="text"
                    value={form.clientName}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        clientId: undefined,
                        clientName: e.target.value,
                      }))
                    }
                    placeholder="Ej: Juan Pérez"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={form.clientPhone}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, clientPhone: e.target.value }))
                    }
                    placeholder="Ej: 1154328910"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Cancha
                  </label>
                  <select
                    value={form.courtId}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, courtId: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  >
                    {settings.courts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.shortName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Día de la semana
                  </label>
                  <select
                    value={form.dayOfWeek}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, dayOfWeek: Number(e.target.value) }))
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  >
                    {DAY_NAMES.map((day, idx) => (
                      <option key={day} value={idx}>
                        Todos los {day}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Horario
                  </label>
                  <select
                    value={form.hour}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, hour: Number(e.target.value) }))
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  >
                    {hours.map((h) => (
                      <option key={h} value={h}>
                        {formatHour(h)} hs
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Observaciones
                </label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, notes: e.target.value }))
                  }
                  placeholder="Ej: Piden pecheras siempre, traen pelota..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-400"
                >
                  {form.editingId ? 'Guardar Cambios' : 'Crear Turno Fijo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
