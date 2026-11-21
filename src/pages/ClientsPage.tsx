import React, { useMemo, useState } from 'react';
import {
  Users,
  Search,
  Plus,
  MessageCircle,
  Edit2,
  Trash2,
  Repeat,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Client } from '../types';
import { buildWhatsAppUrl } from '../utils/formatters';

export const ClientsPage: React.FC = () => {
  const { clients, getClientStats, upsertClient, deleteClient } = useApp();

  const [query, setQuery] = useState('');
  const [onlyRecurring, setOnlyRecurring] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  const enrichedClients = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients
      .map((client) => ({
        client,
        stats: getClientStats(client.id),
      }))
      .filter(({ client, stats }) => {
        if (onlyRecurring && !stats.hasRecurring) return false;
        if (!q) return true;
        return (
          client.name.toLowerCase().includes(q) ||
          client.phone.toLowerCase().includes(q) ||
          client.notes.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.stats.totalMatches - a.stats.totalMatches);
  }, [clients, getClientStats, query, onlyRecurring]);

  const openNewModal = () => {
    setEditingClient(null);
    setName('');
    setPhone('');
    setNotes('');
    setModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setName(client.name);
    setPhone(client.phone);
    setNotes(client.notes);
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    upsertClient({
      id: editingClient?.id,
      name: name.trim(),
      phone: phone.trim(),
      notes: notes.trim(),
    });
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Users className="h-6 w-6 text-emerald-400" />
            Clientes Registrados
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Base de clientes para autocompletar rápidamente al cargar turnos.
          </p>
        </div>

        <button
          type="button"
          onClick={openNewModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition"
        >
          <Plus className="h-4 w-4" />
          Nuevo Cliente
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, teléfono u observación..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs font-medium text-slate-300">
          <input
            type="checkbox"
            checked={onlyRecurring}
            onChange={(e) => setOnlyRecurring(e.target.checked)}
            className="h-4 w-4 rounded border-slate-600 text-emerald-500 focus:ring-emerald-500"
          />
          <span>Solo con Turno Fijo</span>
        </label>
      </div>

      {/* Clients Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 overflow-hidden">
        {enrichedClients.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">
            No se encontraron clientes que coincidan con la búsqueda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Teléfono / WhatsApp</th>
                  <th className="px-4 py-3 text-center">Turnos Jugados</th>
                  <th className="px-4 py-3">Turno Fijo</th>
                  <th className="px-4 py-3">Observaciones</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {enrichedClients.map(({ client, stats }) => {
                  const waUrl = buildWhatsAppUrl(
                    client.phone,
                    `Hola ${client.name.split(' ')[0]}! Te escribimos desde el complejo de fútbol.`
                  );
                  return (
                    <tr key={client.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 font-semibold text-white">
                        {client.name}
                      </td>
                      <td className="px-4 py-3 text-slate-300 tabular-nums">
                        {client.phone}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center rounded-lg bg-slate-800 px-2.5 py-0.5 text-xs font-bold text-emerald-400 tabular-nums">
                          {stats.totalMatches}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {stats.hasRecurring ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/40 bg-violet-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-violet-300">
                            <Repeat className="h-3 w-3" />
                            Sí, fijo activo
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">Eventual</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 max-w-xs truncate">
                        {client.notes || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-1.5 text-emerald-400 hover:bg-emerald-500/20"
                            title="Abrir WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>
                          <button
                            type="button"
                            onClick={() => openEditModal(client)}
                            className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:text-white"
                            title="Editar cliente"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteClient(client.id)}
                            className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-1.5 text-rose-400 hover:bg-rose-500/20"
                            title="Eliminar cliente"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Add/Edit Client */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <h2 className="text-lg font-bold text-white">
                {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Nombre y Apellido
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Lucas Fernández"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Teléfono / WhatsApp
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej: 1143219876"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Observaciones
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Pide pecheras, trae equipo fijo..."
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
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
