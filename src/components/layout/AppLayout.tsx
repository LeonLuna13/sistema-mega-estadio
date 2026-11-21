import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  CalendarDays,
  Repeat,
  Wallet,
  Users,
  Settings,
  Menu,
  X,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatHour } from '../../utils/formatters';

const NAV_ITEMS = [
  { to: '/', label: 'Grilla de Turnos', icon: CalendarDays, end: true },
  { to: '/turnos-fijos', label: 'Turnos Fijos', icon: Repeat },
  { to: '/caja', label: 'Caja y Reportes', icon: Wallet },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/configuracion', label: 'Configuración', icon: Settings },
];

export const AppLayout: React.FC = () => {
  const { settings } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-800/80">
          <img
            src="/logo-mega-estadio.jpg"
            alt="Logo Mega Estadio"
            className="h-12 w-12 shrink-0 rounded-xl object-cover border border-emerald-500/35 shadow-lg shadow-emerald-500/15 bg-slate-950"
          />
          <div className="min-w-0">
            <h1 className="truncate text-base font-extrabold text-white tracking-tight">
              {settings.complexName}
            </h1>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Complejo Deportivo
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-emerald-400">
              <ShieldCheck className="h-3 w-3" />
              Panel Administrador
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="mt-4 space-y-1 px-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-100 border border-transparent'
                  }`
                }
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Quick Info Card */}
      <div className="p-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3.5 space-y-2.5 text-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="h-3.5 w-3.5 text-emerald-400" />
              Horario
            </span>
            <span className="font-semibold text-slate-200">
              {formatHour(settings.openHour)} - {formatHour(settings.closeHour)}
            </span>
          </div>
          <div className="border-t border-slate-800 pt-2 space-y-1">
            {settings.courts.map((court) => (
              <div
                key={court.id}
                className="flex items-center justify-between text-slate-400"
              >
                <span className="truncate pr-2">{court.shortName}</span>
                <span className="font-semibold text-emerald-400">
                  {formatCurrency(court.hourlyPrice)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-800 pt-2 flex items-center justify-between text-slate-400">
            <span>Seña base</span>
            <span className="font-semibold text-amber-400">
              {formatCurrency(settings.defaultDepositAmount)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col border-r border-slate-800/80 bg-slate-900/60 backdrop-blur-xl sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Topbar */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo-mega-estadio.jpg"
            alt="Logo Mega Estadio"
            className="h-9 w-9 rounded-lg object-cover border border-emerald-500/35 bg-slate-950"
          />
          <div>
            <p className="text-sm font-extrabold text-white leading-tight">
              {settings.complexName}
            </p>
            <p className="text-[11px] text-emerald-400 font-medium">
              Complejo Deportivo • Turnos y Caja
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen((v) => !v)}
          className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-200 hover:bg-slate-700"
          aria-label="Abrir menú"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-50 w-72 max-w-[85vw] bg-slate-900 border-r border-slate-800 h-full">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
