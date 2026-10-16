/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { ViewTab } from './types';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { ObjectsView } from './components/ObjectsView';
import { CalendarView } from './components/CalendarView';
import { PaymentsView } from './components/PaymentsView';
import { HistoryView } from './components/HistoryView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { LoginView } from './components/LoginView';

const AppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<ViewTab>('dashboard');
  const [calendarTargetObjectId, setCalendarTargetObjectId] = useState<string | undefined>(undefined);
  const [paymentTargetRentalId, setPaymentTargetRentalId] = useState<string | undefined>(undefined);

  const { currentUser, loading: authLoading } = useAuth();
  const { loading: dataLoading } = useData();

  const handleSelectObjectForCalendar = (objectId: string) => {
    setCalendarTargetObjectId(objectId);
    setCurrentTab('calendar');
  };

  const handleOpenPaymentWithRental = (rentalId: string) => {
    setPaymentTargetRentalId(rentalId);
    setCurrentTab('payments');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-2xl shadow-xl animate-pulse mb-4">
          A
        </div>
        <h2 className="text-base font-bold text-white">Cargando AlquilaYa...</h2>
        <p className="text-xs text-slate-400 mt-1">Verificando credenciales seguras</p>
      </div>
    );
  }

  // Require Google Sign In
  if (!currentUser) {
    return <LoginView />;
  }

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg animate-pulse mb-4">
          A
        </div>
        <h2 className="text-base font-bold text-slate-800">Sincronizando tus datos...</h2>
        <p className="text-xs text-slate-400 mt-1">Conectando a tu espacio privado en Firestore</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenQuickPayment={() => setCurrentTab('payments')}
        onOpenQuickRental={() => setCurrentTab('calendar')}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {currentTab === 'dashboard' && (
          <DashboardView
            onNavigate={setCurrentTab}
            onSelectObjectForCalendar={handleSelectObjectForCalendar}
            onOpenPaymentWithRental={handleOpenPaymentWithRental}
          />
        )}

        {currentTab === 'objects' && <ObjectsView />}

        {currentTab === 'calendar' && (
          <CalendarView
            initialObjectId={calendarTargetObjectId}
            onOpenPaymentWithRental={handleOpenPaymentWithRental}
          />
        )}

        {currentTab === 'payments' && (
          <PaymentsView initialRentalId={paymentTargetRentalId} />
        )}

        {currentTab === 'history' && <HistoryView />}

        {currentTab === 'reports' && <ReportsView />}

        {currentTab === 'settings' && <SettingsView />}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            <strong>AlquilaYa</strong> • Sistema de Alquileres, Pagos y Control Diario (COP - Colombia)
          </span>
          <span className="text-[11px] text-slate-400">
            Base de datos Firestore Enterprise • Zona horaria Colombia (UTC-5)
          </span>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
}
