import React, { useState } from 'react';
import { ViewTab } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Calendar,
  Layers,
  CreditCard,
  History,
  FileSpreadsheet,
  Settings,
  LayoutDashboard,
  LogIn,
  LogOut,
  User,
  Menu,
  X,
  CheckCircle2,
  DollarSign
} from 'lucide-react';

interface NavbarProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  onOpenQuickPayment?: () => void;
  onOpenQuickRental?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenQuickPayment,
  onOpenQuickRental
}) => {
  const { currentUser, signInWithGoogle, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: ViewTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Inicio', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'objects', label: 'Objetos', icon: <Layers className="w-4 h-4" /> },
    { id: 'calendar', label: 'Calendario', icon: <Calendar className="w-4 h-4" /> },
    { id: 'payments', label: 'Pagos', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'history', label: 'Historial', icon: <History className="w-4 h-4" /> },
    { id: 'reports', label: 'Reportes y Excel', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'settings', label: 'Configuración', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSelectTab('dashboard')}
              className="flex items-center gap-2.5 text-left focus:outline-hidden"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm font-bold text-xl">
                A
              </div>
              <div>
                <span className="font-extrabold text-xl tracking-tight text-slate-900 flex items-center gap-1.5">
                  Alquila<span className="text-emerald-600">Ya</span>
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Sistema Activo" />
                </span>
                <span className="hidden sm:block text-xs font-medium text-slate-500">
                  Control de Alquileres & Pagos (COP)
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map(item => {
              const active = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-emerald-50 text-emerald-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Action buttons & Auth */}
          <div className="hidden sm:flex items-center gap-2.5">
            {onOpenQuickPayment && (
              <button
                onClick={onOpenQuickPayment}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
              >
                <DollarSign className="w-3.5 h-3.5" />
                Registrar Pago
              </button>
            )}

            {onOpenQuickRental && (
              <button
                onClick={onOpenQuickRental}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs"
              >
                <Calendar className="w-3.5 h-3.5" />
                + Fechas
              </button>
            )}

            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="flex items-center gap-2" title={currentUser.email || 'Usuario'}>
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'Usuario'}
                      className="w-8 h-8 rounded-full border border-slate-200"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                      {currentUser.email ? currentUser.email.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                    </div>
                  )}
                  <span className="hidden xl:inline-block text-xs font-medium text-slate-700 max-w-[120px] truncate">
                    {currentUser.displayName || currentUser.email}
                  </span>
                </div>
                <button
                  onClick={() => logout()}
                  title="Cerrar sesión"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => signInWithGoogle()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
              >
                <LogIn className="w-3.5 h-3.5 text-emerald-600" />
                Conectar Google
              </button>
            )}
          </div>

          {/* Mobile hamburger button */}
          <div className="flex items-center lg:hidden gap-2">
            {currentUser && (
              <span className="flex items-center gap-1 text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium">
                <CheckCircle2 className="w-3 h-3" /> Nube
              </span>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Abrir menú"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-2">
          <div className="grid grid-cols-2 gap-2 mb-3">
            {onOpenQuickPayment && (
              <button
                onClick={() => {
                  onOpenQuickPayment();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg bg-emerald-600 text-white"
              >
                <DollarSign className="w-3.5 h-3.5" /> Registrar Pago
              </button>
            )}
            {onOpenQuickRental && (
              <button
                onClick={() => {
                  onOpenQuickRental();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg bg-slate-900 text-white"
              >
                <Calendar className="w-3.5 h-3.5" /> + Fechas
              </button>
            )}
          </div>

          <div className="space-y-1">
            {navItems.map(item => {
              const active = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                    active ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            {currentUser ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                    {currentUser.email ? currentUser.email.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="text-xs">
                    <p className="font-semibold text-slate-800">{currentUser.displayName || 'Usuario'}</p>
                    <p className="text-slate-500 truncate max-w-[180px]">{currentUser.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => logout()}
                  className="px-2.5 py-1 text-xs font-medium text-rose-600 bg-rose-50 rounded-md"
                >
                  Salir
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  signInWithGoogle();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-800 border border-slate-300"
              >
                <LogIn className="w-4 h-4 text-emerald-600" />
                Iniciar sesión con Google
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
