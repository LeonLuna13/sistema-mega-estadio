import {
  Booking,
  CashMovement,
  Client,
  RecurringBooking,
  SystemSettings,
} from '../types';
import { generateSeedData, SeedDataset } from './mockData';

const STORAGE_KEYS = {
  INITIALIZED: 'f5_complejo_initialized_v1',
  SETTINGS: 'f5_complejo_settings_v1',
  CLIENTS: 'f5_complejo_clients_v1',
  RECURRING_BOOKINGS: 'f5_complejo_recurring_v1',
  BOOKINGS: 'f5_complejo_bookings_v1',
  CASH_MOVEMENTS: 'f5_complejo_cash_v1',
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

/**
 * Capa de persistencia mockeada sobre localStorage.
 * En la Etapa 2 se reemplazará cada método por llamadas HTTP a la API REST (Express + Prisma).
 */
export const storageService = {
  loadAll(): SeedDataset {
    const isInitialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
    if (!isInitialized) {
      const seed = generateSeedData();
      this.saveAll(seed);
      return seed;
    }

    const seedFallback = generateSeedData();
    let settings = readJson<SystemSettings>(
      STORAGE_KEYS.SETTINGS,
      seedFallback.settings
    );

    if (settings.complexName === 'El Predio F5 & F6') {
      settings = {
        ...settings,
        complexName: 'Mega Estadio',
        transferAlias:
          settings.transferAlias === 'elpredio.canchas.mp'
            ? 'megaestadio.mp'
            : settings.transferAlias,
      };
      writeJson(STORAGE_KEYS.SETTINGS, settings);
    }

    return {
      settings,
      clients: readJson<Client[]>(STORAGE_KEYS.CLIENTS, seedFallback.clients),
      recurringBookings: readJson<RecurringBooking[]>(
        STORAGE_KEYS.RECURRING_BOOKINGS,
        seedFallback.recurringBookings
      ),
      bookings: readJson<Booking[]>(STORAGE_KEYS.BOOKINGS, seedFallback.bookings),
      cashMovements: readJson<CashMovement[]>(
        STORAGE_KEYS.CASH_MOVEMENTS,
        seedFallback.cashMovements
      ),
    };
  },

  saveAll(data: SeedDataset): void {
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    writeJson(STORAGE_KEYS.SETTINGS, data.settings);
    writeJson(STORAGE_KEYS.CLIENTS, data.clients);
    writeJson(STORAGE_KEYS.RECURRING_BOOKINGS, data.recurringBookings);
    writeJson(STORAGE_KEYS.BOOKINGS, data.bookings);
    writeJson(STORAGE_KEYS.CASH_MOVEMENTS, data.cashMovements);
  },

  saveSettings(settings: SystemSettings): void {
    writeJson(STORAGE_KEYS.SETTINGS, settings);
  },

  saveClients(clients: Client[]): void {
    writeJson(STORAGE_KEYS.CLIENTS, clients);
  },

  saveRecurringBookings(recurringBookings: RecurringBooking[]): void {
    writeJson(STORAGE_KEYS.RECURRING_BOOKINGS, recurringBookings);
  },

  saveBookings(bookings: Booking[]): void {
    writeJson(STORAGE_KEYS.BOOKINGS, bookings);
  },

  saveCashMovements(movements: CashMovement[]): void {
    writeJson(STORAGE_KEYS.CASH_MOVEMENTS, movements);
  },

  resetToDemo(): SeedDataset {
    const seed = generateSeedData();
    this.saveAll(seed);
    return seed;
  },
};
