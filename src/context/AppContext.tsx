import React, { createContext, useCallback, useContext, useState } from 'react';
import {
  Booking,
  CashMovement,
  Client,
  Court,
  CourtId,
  GridSlotInfo,
  RecurringBooking,
  SaveBookingPayload,
  SystemSettings,
} from '../types';
import { buildCashMovementsForBooking } from '../services/mockData';
import { storageService } from '../services/storageService';
import {
  computeBookingStatus,
  getDayOfWeek,
  getTodayStr,
} from '../utils/formatters';

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

interface UpsertClientInput {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}

interface CreateRecurringInput {
  clientId?: string;
  clientName: string;
  clientPhone: string;
  courtId: CourtId;
  dayOfWeek: number;
  hour: number;
  notes: string;
  isActive?: boolean;
  startDate?: string;
}

interface AppContextValue {
  settings: SystemSettings;
  clients: Client[];
  recurringBookings: RecurringBooking[];
  bookings: Booking[];
  cashMovements: CashMovement[];
  updateSettings: (nextSettings: SystemSettings) => void;
  getCourtById: (courtId: CourtId) => Court | undefined;
  getSlotInfo: (date: string, courtId: CourtId, hour: number) => GridSlotInfo;
  getClientStats: (clientId: string) => { totalMatches: number; hasRecurring: boolean };
  upsertClient: (input: UpsertClientInput) => Client;
  deleteClient: (clientId: string) => void;
  saveBooking: (payload: SaveBookingPayload) => { ok: boolean; error?: string; booking?: Booking };
  cancelBooking: (bookingId: string) => void;
  createRecurringBooking: (input: CreateRecurringInput) => { ok: boolean; error?: string; recurring?: RecurringBooking };
  updateRecurringBooking: (id: string, patch: Partial<RecurringBooking>) => { ok: boolean; error?: string };
  toggleRecurringBooking: (id: string) => void;
  deleteRecurringBooking: (id: string) => void;
  skipRecurringDate: (recurringId: string, dateStr: string) => void;
  restoreRecurringDate: (recurringId: string, dateStr: string) => void;
  addManualCashMovement: (input: {
    description: string;
    amount: number;
    paymentMethod: 'CASH' | 'TRANSFER';
    courtId?: CourtId;
    clientName?: string;
    date?: string;
  }) => void;
  resetDemoData: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [initialData] = useState(() => storageService.loadAll());

  const [settings, setSettings] = useState<SystemSettings>(initialData.settings);
  const [clients, setClients] = useState<Client[]>(initialData.clients);
  const [recurringBookings, setRecurringBookings] = useState<RecurringBooking[]>(
    initialData.recurringBookings
  );
  const [bookings, setBookings] = useState<Booking[]>(initialData.bookings);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>(
    initialData.cashMovements
  );

  const getCourtById = useCallback(
    (courtId: CourtId) => settings.courts.find((c) => c.id === courtId),
    [settings.courts]
  );

  const updateSettings = useCallback((nextSettings: SystemSettings) => {
    setSettings(nextSettings);
    storageService.saveSettings(nextSettings);
  }, []);

  const upsertClient = useCallback(
    (input: UpsertClientInput): Client => {
      const nowIso = new Date().toISOString();
      const trimmedName = input.name.trim();
      const trimmedPhone = input.phone.trim();
      const cleanInputDigits = trimmedPhone.replace(/\D/g, '');

      const existingById = input.id
        ? clients.find((c) => c.id === input.id)
        : undefined;
      const existingByPhone =
        !existingById && cleanInputDigits.length >= 6
          ? clients.find(
              (c) => c.phone.replace(/\D/g, '') === cleanInputDigits
            )
          : undefined;

      const target = existingById || existingByPhone;

      const savedClient: Client = target
        ? {
            ...target,
            name: trimmedName || target.name,
            phone: trimmedPhone || target.phone,
            email: input.email !== undefined ? input.email : target.email,
            notes: input.notes !== undefined ? input.notes : target.notes,
          }
        : {
            id: createId('cli'),
            name: trimmedName,
            phone: trimmedPhone,
            email: input.email,
            notes: input.notes || '',
            historicalMatchesCount: 0,
            createdAt: nowIso,
          };

      setClients((prev) => {
        const existsInPrev = prev.some((c) => c.id === savedClient.id);
        const nextList = existsInPrev
          ? prev.map((c) => (c.id === savedClient.id ? savedClient : c))
          : [savedClient, ...prev];
        storageService.saveClients(nextList);
        return nextList;
      });

      return savedClient;
    },
    [clients]
  );

  const deleteClient = useCallback((clientId: string) => {
    setClients((prev) => {
      const next = prev.filter((c) => c.id !== clientId);
      storageService.saveClients(next);
      return next;
    });
  }, []);

  const getSlotInfo = useCallback(
    (date: string, courtId: CourtId, hour: number): GridSlotInfo => {
      const booking =
        bookings.find(
          (b) =>
            b.date === date &&
            b.courtId === courtId &&
            b.hour === hour &&
            b.status !== 'CANCELLED'
        ) || null;

      if (booking) {
        const recurringBooking = booking.recurringBookingId
          ? recurringBookings.find((r) => r.id === booking.recurringBookingId) || null
          : null;
        return {
          courtId,
          date,
          hour,
          booking,
          recurringBooking,
          isAvailable: false,
        };
      }

      const dow = getDayOfWeek(date);
      const recurringBooking =
        recurringBookings.find(
          (r) =>
            r.isActive &&
            r.courtId === courtId &&
            r.dayOfWeek === dow &&
            r.hour === hour &&
            date >= r.startDate &&
            !r.skippedDates.includes(date)
        ) || null;

      return {
        courtId,
        date,
        hour,
        booking: null,
        recurringBooking,
        isAvailable: !recurringBooking,
      };
    },
    [bookings, recurringBookings]
  );

  const getClientStats = useCallback(
    (clientId: string) => {
      const client = clients.find((c) => c.id === clientId);
      const activeBookingsCount = bookings.filter(
        (b) => b.clientId === clientId && b.status !== 'CANCELLED'
      ).length;
      const hasRecurring = recurringBookings.some(
        (r) => r.clientId === clientId && r.isActive
      );
      return {
        totalMatches: (client?.historicalMatchesCount || 0) + activeBookingsCount,
        hasRecurring,
      };
    },
    [clients, bookings, recurringBookings]
  );

  const saveBooking = useCallback(
    (payload: SaveBookingPayload): { ok: boolean; error?: string; booking?: Booking } => {
      const conflictBooking = bookings.find(
        (b) =>
          b.id !== payload.id &&
          b.date === payload.date &&
          b.courtId === payload.courtId &&
          b.hour === payload.hour &&
          b.status !== 'CANCELLED'
      );
      if (conflictBooking) {
        return {
          ok: false,
          error: `Ese horario ya está ocupado por ${conflictBooking.clientName}.`,
        };
      }

      const dow = getDayOfWeek(payload.date);
      const conflictRecurring = recurringBookings.find(
        (r) =>
          r.id !== payload.recurringBookingId &&
          r.isActive &&
          r.courtId === payload.courtId &&
          r.dayOfWeek === dow &&
          r.hour === payload.hour &&
          payload.date >= r.startDate &&
          !r.skippedDates.includes(payload.date)
      );
      if (conflictRecurring) {
        return {
          ok: false,
          error: `Ese horario pertenece al Turno Fijo de ${conflictRecurring.clientName}.`,
        };
      }

      const client = upsertClient({
        id: payload.clientId,
        name: payload.clientName,
        phone: payload.clientPhone,
      });

      const existing = payload.id
        ? bookings.find((b) => b.id === payload.id)
        : undefined;

      const today = getTodayStr();
      const nowIso = new Date().toISOString();

      const status = computeBookingStatus(
        payload.totalPrice,
        payload.depositAmount,
        payload.balanceCashAmount,
        payload.balanceTransferAmount,
        payload.whatsappReceiptVerified,
        payload.depositMethod
      );

      const hasBalancePayment =
        payload.balanceCashAmount > 0 || payload.balanceTransferAmount > 0;

      const savedBooking: Booking = {
        id: existing?.id || createId('bkg'),
        courtId: payload.courtId,
        clientId: client.id,
        clientName: client.name,
        clientPhone: client.phone,
        date: payload.date,
        hour: payload.hour,
        status,
        totalPrice: payload.totalPrice,
        depositAmount: payload.depositAmount,
        depositMethod: payload.depositMethod,
        depositPaidAt:
          payload.depositAmount > 0
            ? existing?.depositPaidAt || today
            : undefined,
        whatsappReceiptVerified: payload.whatsappReceiptVerified,
        balanceCashAmount: payload.balanceCashAmount,
        balanceTransferAmount: payload.balanceTransferAmount,
        balancePaidAt: hasBalancePayment
          ? existing?.balancePaidAt || today
          : undefined,
        notes: payload.notes.trim(),
        recurringBookingId: payload.recurringBookingId,
        source: payload.source || existing?.source || 'ADMIN',
        createdAt: existing?.createdAt || nowIso,
        updatedAt: nowIso,
      };

      setBookings((prev) => {
        const next = existing
          ? prev.map((b) => (b.id === savedBooking.id ? savedBooking : b))
          : [...prev, savedBooking];
        storageService.saveBookings(next);
        return next;
      });

      setCashMovements((prev) => {
        const withoutBookingMovements = prev.filter(
          (m) => m.bookingId !== savedBooking.id
        );
        const generated = buildCashMovementsForBooking(savedBooking);
        const next = [...generated, ...withoutBookingMovements].sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt)
        );
        storageService.saveCashMovements(next);
        return next;
      });

      if (payload.recurringBookingId) {
        setRecurringBookings((prev) => {
          const next = prev.map((r) =>
            r.id === payload.recurringBookingId
              ? {
                  ...r,
                  skippedDates: r.skippedDates.filter((d) => d !== payload.date),
                }
              : r
          );
          storageService.saveRecurringBookings(next);
          return next;
        });
      }

      return { ok: true, booking: savedBooking };
    },
    [bookings, recurringBookings, upsertClient]
  );

  const cancelBooking = useCallback(
    (bookingId: string) => {
      const target = bookings.find((b) => b.id === bookingId);
      if (!target) return;

      setBookings((prev) => {
        const next = prev.filter((b) => b.id !== bookingId);
        storageService.saveBookings(next);
        return next;
      });

      setCashMovements((prev) => {
        const next = prev.filter((m) => m.bookingId !== bookingId);
        storageService.saveCashMovements(next);
        return next;
      });

      if (target.recurringBookingId) {
        setRecurringBookings((prev) => {
          const next = prev.map((r) =>
            r.id === target.recurringBookingId &&
            !r.skippedDates.includes(target.date)
              ? { ...r, skippedDates: [...r.skippedDates, target.date] }
              : r
          );
          storageService.saveRecurringBookings(next);
          return next;
        });
      }
    },
    [bookings]
  );

  const createRecurringBooking = useCallback(
    (
      input: CreateRecurringInput
    ): { ok: boolean; error?: string; recurring?: RecurringBooking } => {
      const conflict = recurringBookings.find(
        (r) =>
          r.isActive &&
          r.courtId === input.courtId &&
          r.dayOfWeek === input.dayOfWeek &&
          r.hour === input.hour
      );

      if (conflict) {
        return {
          ok: false,
          error: `Ya existe un turno fijo activo en ese día y horario para ${conflict.clientName}.`,
        };
      }

      const client = upsertClient({
        id: input.clientId,
        name: input.clientName,
        phone: input.clientPhone,
      });

      const created: RecurringBooking = {
        id: createId('rec'),
        clientId: client.id,
        clientName: client.name,
        clientPhone: client.phone,
        courtId: input.courtId,
        dayOfWeek: input.dayOfWeek,
        hour: input.hour,
        notes: input.notes.trim(),
        isActive: input.isActive ?? true,
        startDate: input.startDate || getTodayStr(),
        skippedDates: [],
        createdAt: new Date().toISOString(),
      };

      setRecurringBookings((prev) => {
        const next = [...prev, created];
        storageService.saveRecurringBookings(next);
        return next;
      });

      return { ok: true, recurring: created };
    },
    [recurringBookings, upsertClient]
  );

  const updateRecurringBooking = useCallback(
    (id: string, patch: Partial<RecurringBooking>): { ok: boolean; error?: string } => {
      const existing = recurringBookings.find((r) => r.id === id);
      if (!existing) return { ok: false, error: 'Turno fijo no encontrado.' };

      const nextCourtId = patch.courtId ?? existing.courtId;
      const nextDow = patch.dayOfWeek ?? existing.dayOfWeek;
      const nextHour = patch.hour ?? existing.hour;
      const nextActive = patch.isActive ?? existing.isActive;

      if (nextActive) {
        const conflict = recurringBookings.find(
          (r) =>
            r.id !== id &&
            r.isActive &&
            r.courtId === nextCourtId &&
            r.dayOfWeek === nextDow &&
            r.hour === nextHour
        );
        if (conflict) {
          return {
            ok: false,
            error: `El horario ya tiene un turno fijo de ${conflict.clientName}.`,
          };
        }
      }

      let resolvedName = patch.clientName ?? existing.clientName;
      let resolvedPhone = patch.clientPhone ?? existing.clientPhone;
      let resolvedClientId = patch.clientId ?? existing.clientId;

      if (patch.clientName || patch.clientPhone) {
        const client = upsertClient({
          id: resolvedClientId,
          name: resolvedName,
          phone: resolvedPhone,
        });
        resolvedClientId = client.id;
        resolvedName = client.name;
        resolvedPhone = client.phone;
      }

      setRecurringBookings((prev) => {
        const next = prev.map((r) =>
          r.id === id
            ? {
                ...r,
                ...patch,
                clientId: resolvedClientId,
                clientName: resolvedName,
                clientPhone: resolvedPhone,
              }
            : r
        );
        storageService.saveRecurringBookings(next);
        return next;
      });

      return { ok: true };
    },
    [recurringBookings, upsertClient]
  );

  const toggleRecurringBooking = useCallback((id: string) => {
    setRecurringBookings((prev) => {
      const next = prev.map((r) =>
        r.id === id ? { ...r, isActive: !r.isActive } : r
      );
      storageService.saveRecurringBookings(next);
      return next;
    });
  }, []);

  const deleteRecurringBooking = useCallback((id: string) => {
    setRecurringBookings((prev) => {
      const next = prev.filter((r) => r.id !== id);
      storageService.saveRecurringBookings(next);
      return next;
    });
  }, []);

  const skipRecurringDate = useCallback((recurringId: string, dateStr: string) => {
    setRecurringBookings((prev) => {
      const next = prev.map((r) =>
        r.id === recurringId && !r.skippedDates.includes(dateStr)
          ? { ...r, skippedDates: [...r.skippedDates, dateStr] }
          : r
      );
      storageService.saveRecurringBookings(next);
      return next;
    });
  }, []);

  const restoreRecurringDate = useCallback((recurringId: string, dateStr: string) => {
    setRecurringBookings((prev) => {
      const next = prev.map((r) =>
        r.id === recurringId
          ? { ...r, skippedDates: r.skippedDates.filter((d) => d !== dateStr) }
          : r
      );
      storageService.saveRecurringBookings(next);
      return next;
    });
  }, []);

  const addManualCashMovement = useCallback(
    (input: {
      description: string;
      amount: number;
      paymentMethod: 'CASH' | 'TRANSFER';
      courtId?: CourtId;
      clientName?: string;
      date?: string;
    }) => {
      const movement: CashMovement = {
        id: createId('mov'),
        date: input.date || getTodayStr(),
        createdAt: new Date().toISOString(),
        type: 'MANUAL_INCOME',
        paymentMethod: input.paymentMethod,
        amount: input.amount,
        courtId: input.courtId,
        clientName: input.clientName?.trim() || 'Mostrador',
        description: input.description.trim(),
      };

      setCashMovements((prev) => {
        const next = [movement, ...prev];
        storageService.saveCashMovements(next);
        return next;
      });
    },
    []
  );

  const resetDemoData = useCallback(() => {
    const fresh = storageService.resetToDemo();
    setSettings(fresh.settings);
    setClients(fresh.clients);
    setRecurringBookings(fresh.recurringBookings);
    setBookings(fresh.bookings);
    setCashMovements(fresh.cashMovements);
  }, []);

  return (
    <AppContext.Provider
      value={{
        settings,
        clients,
        recurringBookings,
        bookings,
        cashMovements,
        updateSettings,
        getCourtById,
        getSlotInfo,
        getClientStats,
        upsertClient,
        deleteClient,
        saveBooking,
        cancelBooking,
        createRecurringBooking,
        updateRecurringBooking,
        toggleRecurringBooking,
        deleteRecurringBooking,
        skipRecurringDate,
        restoreRecurringDate,
        addManualCashMovement,
        resetDemoData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp debe utilizarse dentro de AppProvider');
  }
  return ctx;
}
