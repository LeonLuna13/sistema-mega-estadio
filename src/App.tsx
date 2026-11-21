import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import { SchedulePage } from './pages/SchedulePage';
import { RecurringBookingsPage } from './pages/RecurringBookingsPage';
import { CashierPage } from './pages/CashierPage';
import { ClientsPage } from './pages/ClientsPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<SchedulePage />} />
            <Route path="turnos-fijos" element={<RecurringBookingsPage />} />
            <Route path="caja" element={<CashierPage />} />
            <Route path="clientes" element={<ClientsPage />} />
            <Route path="configuracion" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
