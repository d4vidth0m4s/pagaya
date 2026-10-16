import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { formatCOP } from '../utils/formatters';
import { formatDateHuman } from '../utils/dateUtils';
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  CalendarCheck,
  Clock,
  Layers,
  Search,
  CheckCircle,
  Receipt,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { ViewTab } from '../types';

interface DashboardViewProps {
  onNavigate: (tab: ViewTab) => void;
  onSelectObjectForCalendar?: (objectId: string) => void;
  onOpenPaymentWithRental?: (rentalId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onSelectObjectForCalendar,
  onOpenPaymentWithRental
}) => {
  const { objects, rentals, receipts, stats } = useData();

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterObjectId, setFilterObjectId] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Object summary calculation
  const objectSummaries = useMemo(() => {
    return objects.map(obj => {
      const objRentals = rentals.filter(r => r.objectId === obj.id);
      const confirmedRentals = objRentals.filter(r => r.status === 'confirmed_paid' || r.status === 'confirmed_unpaid');
      const billedValue = confirmedRentals.reduce((sum, r) => sum + r.dailyRateSnapshot, 0);
      const paidValue = confirmedRentals.reduce((sum, r) => sum + (r.paidAmount || 0), 0);
      const pendingDebt = Math.max(0, billedValue - paidValue);
      const paidDays = objRentals.filter(r => r.status === 'confirmed_paid').length;
      const unpaidDays = objRentals.filter(r => r.status === 'confirmed_unpaid').length;
      const pendingConfirmationDays = objRentals.filter(r => r.status === 'pending_confirmation').length;

      return {
        ...obj,
        totalRentalsCount: objRentals.length,
        billedValue,
        paidValue,
        pendingDebt,
        paidDays,
        unpaidDays,
        pendingConfirmationDays,
      };
    });
  }, [objects, rentals]);

  // Filtered recent rentals
  const filteredRentals = useMemo(() => {
    return rentals
      .filter(r => {
        const matchesSearch =
          r.objectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (r.personName && r.personName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          r.date.includes(searchTerm) ||
          (r.notes && r.notes.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesObject = filterObjectId === 'all' || r.objectId === filterObjectId;

        const matchesStatus =
          filterStatus === 'all' ||
          (filterStatus === 'paid' && r.status === 'confirmed_paid') ||
          (filterStatus === 'unpaid' && r.status === 'confirmed_unpaid') ||
          (filterStatus === 'pending' && r.status === 'pending_confirmation');

        return matchesSearch && matchesObject && matchesStatus;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [rentals, searchTerm, filterObjectId, filterStatus]);

  // Recent payments
  const recentReceipts = useMemo(() => {
    return receipts.slice(0, 5);
  }, [receipts]);

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner & Quick Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-6 rounded-2xl shadow-sm">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-2">
            Control de Alquileres & Finanzas
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Panel de Control General
          </h1>
          <p className="text-slate-300 text-sm mt-1 max-w-xl">
            Supervisa el estado financiero de tus activos, recaudos en pesos colombianos (COP), fechas alquiladas y saldos por cobrar.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigate('payments')}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl transition shadow-sm flex items-center gap-2"
          >
            <DollarSign className="w-4 h-4" />
            Nuevo Cobro / Recibo
          </button>
          <button
            onClick={() => onNavigate('calendar')}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium text-sm rounded-xl transition backdrop-blur-xs flex items-center gap-2"
          >
            <CalendarCheck className="w-4 h-4" />
            Ver Calendario
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Dinero Recibido */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Dinero Recibido
            </span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCOP(stats.totalReceived)}
            </div>
            <p className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Recaudado en caja
            </p>
          </div>
        </div>

        {/* Valor Total de Alquileres Registrados */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Facturado / Confirmado
            </span>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCOP(stats.totalConfirmedRentalValue)}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Alquileres confirmados activos
            </p>
          </div>
        </div>

        {/* Saldo Pendiente */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-rose-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Saldo Pendiente
            </span>
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-600 tracking-tight">
              {formatCOP(stats.totalPendingBalance)}
            </div>
            <p className="text-xs text-rose-500 font-medium mt-1">
              {stats.confirmedUnpaidDaysCount} día(s) con deuda
            </p>
          </div>
        </div>

        {/* Resumen Días Pagados y Pendientes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-amber-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Control de Días
            </span>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-black text-slate-900">{stats.paidDaysCount}</span>
              <span className="text-xs font-medium text-emerald-700 ml-1">Pagados</span>
            </div>
            <div className="text-right">
              <span className="text-xl font-bold text-rose-600">{stats.confirmedUnpaidDaysCount}</span>
              <span className="text-xs font-medium text-rose-600 ml-1">Sin pagar</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            + {stats.pendingDaysCount} por confirmar
          </p>
        </div>
      </div>

      {/* Resumen por Objeto (Motos, Herramientas, etc.) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600" />
              Resumen por Objeto Alquilable
            </h2>
            <p className="text-xs text-slate-500">
              Desglose de tarifas diarias, ocupación y cartera pendiente de cada activo
            </p>
          </div>
          <button
            onClick={() => onNavigate('objects')}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            Administrar objetos <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {objectSummaries.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center shadow-xs">
            <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800">No hay objetos en tu inventario aún</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              La cuenta inicia completamente en cero. Agrega tu primer objeto alquilable (motos, herramientas, máquinas) para comenzar a gestionar fechas y cobros.
            </p>
            <button
              onClick={() => onNavigate('objects')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              + Registrar Primer Objeto
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {objectSummaries.map(obj => (
              <div
                key={obj.id}
                className={`bg-white rounded-2xl p-5 border transition shadow-xs ${
                  obj.status === 'archived' ? 'opacity-70 border-dashed border-slate-300' : 'border-slate-200'
                }`}
              >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900">{obj.name}</h3>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {obj.category}
                    </span>
                    {obj.status === 'archived' && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800">
                        Archivado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tarifa diaria actual: <span className="font-bold text-slate-800">{formatCOP(obj.dailyRate)}</span>
                  </p>
                </div>
                {onSelectObjectForCalendar && (
                  <button
                    onClick={() => onSelectObjectForCalendar(obj.id)}
                    title="Filtrar en Calendario"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition"
                  >
                    <CalendarCheck className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Progress & Balances */}
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Total Facturado:</span>
                  <span className="font-semibold text-slate-800">{formatCOP(obj.billedValue)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Recaudado:</span>
                  <span className="font-semibold text-emerald-600">{formatCOP(obj.paidValue)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Saldo Pendiente:</span>
                  <span className={`font-bold ${obj.pendingDebt > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                    {formatCOP(obj.pendingDebt)}
                  </span>
                </div>
                
                {/* Visual day counter */}
                <div className="flex items-center gap-2 pt-2 text-[11px] text-slate-600 font-medium">
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md">
                    <CheckCircle className="w-3 h-3" /> {obj.paidDays} pagados
                  </span>
                  <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md">
                    <AlertCircle className="w-3 h-3" /> {obj.unpaidDays} sin pagar
                  </span>
                  {obj.pendingConfirmationDays > 0 && (
                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md">
                      <Clock className="w-3 h-3" /> {obj.pendingConfirmationDays}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* Grid: Movimientos Recientes y Últimos Recibos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main: Registro de Alquileres Recientes con Filtros */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-emerald-600" />
                Últimos Días de Alquiler Registrados
              </h2>
              <p className="text-xs text-slate-500">
                Historial cronológico de fechas, arrendatarios y estado de cobro
              </p>
            </div>
            <button
              onClick={() => onNavigate('calendar')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 self-start sm:self-auto"
            >
              Abrir calendario mensual →
            </button>
          </div>

          {/* Search and Filters toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por objeto, persona, fecha..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="relative">
              <select
                value={filterObjectId}
                onChange={e => setFilterObjectId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Todos los objetos</option>
                {objects.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Todos los estados</option>
                <option value="paid">Confirmados y Pagados</option>
                <option value="unpaid">Alquilados Sin Pagar</option>
                <option value="pending">Pendientes de Confirmar</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {filteredRentals.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No se encontraron registros de alquiler con los filtros actuales.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="py-2.5 px-3">Fecha</th>
                    <th className="py-2.5 px-3">Objeto</th>
                    <th className="py-2.5 px-3">Arrendatario</th>
                    <th className="py-2.5 px-3 text-right">Tarifa (Snapshot)</th>
                    <th className="py-2.5 px-3 text-center">Estado</th>
                    <th className="py-2.5 px-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRentals.slice(0, 10).map(r => {
                    const balance = Math.max(0, r.dailyRateSnapshot - (r.paidAmount || 0));
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-3 font-medium text-slate-900 whitespace-nowrap">
                          {formatDateHuman(r.date)}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {r.objectName}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {r.personName || <span className="text-slate-300 italic">Sin persona</span>}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                          {formatCOP(r.dailyRateSnapshot)}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {r.status === 'confirmed_paid' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle className="w-3 h-3" /> Pagado
                            </span>
                          )}
                          {r.status === 'confirmed_unpaid' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                              <AlertCircle className="w-3 h-3" /> Debe {formatCOP(balance)}
                            </span>
                          )}
                          {r.status === 'pending_confirmation' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300 border-dashed">
                              <Clock className="w-3 h-3" /> Por confirmar
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {r.status === 'confirmed_unpaid' && onOpenPaymentWithRental && (
                            <button
                              onClick={() => onOpenPaymentWithRental(r.id)}
                              className="px-2 py-1 text-[11px] font-semibold rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                            >
                              Cobrar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Side: Últimos Pagos y Recibos */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                Últimos Recibos de Pago
              </h2>
              <button
                onClick={() => onNavigate('payments')}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
              >
                Ver todos →
              </button>
            </div>

            {recentReceipts.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Aún no has registrado recibos de pago.
              </div>
            ) : (
              <div className="space-y-3">
                {recentReceipts.map(rec => (
                  <div key={rec.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">{rec.receiptNumber}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-medium">
                            {rec.paymentMethod}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          {rec.personName ? `Recibido de: ${rec.personName}` : 'Cliente no especificado'}
                        </p>
                      </div>
                      <span className="font-extrabold text-sm text-emerald-600">
                        {formatCOP(rec.totalAmount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-200/50">
                      <span>Fecha: {rec.receivedDate}</span>
                      {rec.unallocatedAmount > 0 && (
                        <span className="text-amber-700 font-semibold">
                          Anticipo/Sin aplicar: {formatCOP(rec.unallocatedAmount)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={() => onNavigate('payments')}
              className="w-full py-2.5 px-4 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition flex items-center justify-center gap-2"
            >
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Registrar Nuevo Recibo de Pago
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
