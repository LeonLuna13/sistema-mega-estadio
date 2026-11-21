import React, { useEffect, useState } from 'react';
import {
  Settings,
  Save,
  CheckCircle2,
  RotateCcw,
  Clock,
  DollarSign,
  Building2,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Court } from '../types';
import { formatCurrency, formatHour } from '../utils/formatters';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, resetDemoData } = useApp();

  const [complexName, setComplexName] = useState(settings.complexName);
  const [transferAlias, setTransferAlias] = useState(settings.transferAlias);
  const [defaultDepositAmount, setDefaultDepositAmount] = useState(
    settings.defaultDepositAmount
  );
  const [openHour, setOpenHour] = useState(settings.openHour);
  const [closeHour, setCloseHour] = useState(settings.closeHour);
  const [courts, setCourts] = useState<Court[]>(settings.courts);

  const [savedNotice, setSavedNotice] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    setComplexName(settings.complexName);
    setTransferAlias(settings.transferAlias);
    setDefaultDepositAmount(settings.defaultDepositAmount);
    setOpenHour(settings.openHour);
    setCloseHour(settings.closeHour);
    setCourts(settings.courts);
  }, [settings]);

  const handleCourtPriceChange = (courtId: string, newPrice: number) => {
    setCourts((prev) =>
      prev.map((c) =>
        c.id === courtId ? { ...c, hourlyPrice: Math.max(0, newPrice) } : c
      )
    );
  };

  const handleCourtNameChange = (courtId: string, newName: string) => {
    setCourts((prev) =>
      prev.map((c) => (c.id === courtId ? { ...c, name: newName } : c))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const safeOpen = Math.min(openHour, closeHour);
    const safeClose = Math.max(openHour, closeHour);

    updateSettings({
      complexName: complexName.trim() || settings.complexName,
      transferAlias: transferAlias.trim() || settings.transferAlias,
      defaultDepositAmount: Math.max(0, Number(defaultDepositAmount) || 0),
      openHour: safeOpen,
      closeHour: safeClose,
      courts,
    });

    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const handleResetDemo = () => {
    resetDemoData();
    setConfirmReset(false);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
          <Settings className="h-6 w-6 text-emerald-400" />
          Configuración del Complejo
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Editá precios por cancha, monto de seña y franja horaria. Los cambios aplican a nuevos turnos sin alterar el histórico ya cobrado.
        </p>
      </div>

      {savedNotice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Configuración guardada correctamente en el sistema.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos Generales */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Building2 className="h-4.5 w-4.5 text-emerald-400" />
            Identidad y Cobro por Transferencia
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Nombre del Complejo
              </label>
              <input
                type="text"
                value={complexName}
                onChange={(e) => setComplexName(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Alias / CBU para señas por WhatsApp
              </label>
              <input
                type="text"
                value={transferAlias}
                onChange={(e) => setTransferAlias(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Precios por Cancha y Seña */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <DollarSign className="h-4.5 w-4.5 text-emerald-400" />
            Tarifas de Canchas y Seña
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {courts.map((court) => (
              <div
                key={court.id}
                className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3"
              >
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    Nombre de la Cancha
                  </label>
                  <input
                    type="text"
                    value={court.name}
                    onChange={(e) =>
                      handleCourtNameChange(court.id, e.target.value)
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    Precio por Hora (actual: {formatCurrency(court.hourlyPrice)})
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={court.hourlyPrice}
                    onChange={(e) =>
                      handleCourtPriceChange(court.id, Number(e.target.value))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-base font-bold text-emerald-400 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="max-w-xs pt-2">
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Monto de Seña por Defecto (actual:{' '}
              {formatCurrency(defaultDepositAmount)})
            </label>
            <input
              type="number"
              min={0}
              step={500}
              value={defaultDepositAmount}
              onChange={(e) =>
                setDefaultDepositAmount(Math.max(0, Number(e.target.value)))
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm font-bold text-amber-400 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Rango Horario */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="h-4.5 w-4.5 text-emerald-400" />
            Rango Horario de Atención (Bloques de 1 hora)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Primer turno del día
              </label>
              <select
                value={openHour}
                onChange={(e) => setOpenHour(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                {Array.from({ length: 14 }, (_, i) => i + 7).map((h) => (
                  <option key={h} value={h}>
                    {formatHour(h)} hs
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Último turno del día
              </label>
              <select
                value={closeHour}
                onChange={(e) => setCloseHour(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                {Array.from({ length: 8 }, (_, i) => i + 17).map((h) => (
                  <option key={h} value={h}>
                    {formatHour(h)} hs (termina {formatHour(h + 1)})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition"
          >
            <Save className="h-4 w-4" />
            Guardar Configuración
          </button>
        </div>
      </form>

      {/* Zona Demo / Reset */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-white">
              Datos de Prueba (localStorage)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Restaurá los turnos, turnos fijos, clientes y movimientos iniciales si querés reiniciar las pruebas de la Etapa 1.
            </p>
          </div>
        </div>

        {!confirmReset ? (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar datos demo
          </button>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleResetDemo}
              className="rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400"
            >
              Confirmar reinicio
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
