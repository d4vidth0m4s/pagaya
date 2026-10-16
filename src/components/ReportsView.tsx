import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { exportToExcel } from '../utils/excelExport';
import { formatCOP } from '../utils/formatters';
import { formatDateHuman } from '../utils/dateUtils';
import {
  FileSpreadsheet,
  Download,
  Filter,
  Layers,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Users,
  Settings
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { objects, rentals, receipts, allocations, settings, auditLogs } = useData();

  // Custom export filters
  const [filterObjectId, setFilterObjectId] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Unpaid rentals calculation
  const pendingRentals = useMemo(() => {
    return rentals.filter(r => r.status === 'confirmed_unpaid' && (r.dailyRateSnapshot - (r.paidAmount || 0) > 0));
  }, [rentals]);

  // Debtors summary
  const debtorsList = useMemo(() => {
    const map = new Map<string, { totalPending: number; daysCount: number; objectsList: Set<string> }>();
    pendingRentals.forEach(r => {
      const name = (r.personName || 'Sin arrendatario asignado').trim();
      const current = map.get(name) || { totalPending: 0, daysCount: 0, objectsList: new Set() };
      const debt = Math.max(0, r.dailyRateSnapshot - (r.paidAmount || 0));
      current.totalPending += debt;
      current.daysCount += 1;
      current.objectsList.add(r.objectName);
      map.set(name, current);
    });

    return Array.from(map.entries()).map(([person, info]) => ({
      person,
      totalPending: info.totalPending,
      daysCount: info.daysCount,
      objects: Array.from(info.objectsList).join(', ')
    })).sort((a, b) => b.totalPending - a.totalPending);
  }, [pendingRentals]);

  // Handle Full Export
  const handleFullExport = () => {
    setIsExporting(true);
    try {
      exportToExcel(objects, rentals, receipts, allocations, settings, auditLogs);
    } catch (err) {
      console.error('Error al exportar Excel:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Filtered Export
  const handleFilteredExport = () => {
    setIsExporting(true);
    try {
      exportToExcel(objects, rentals, receipts, allocations, settings, auditLogs, {
        objectId: filterObjectId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
    } catch (err) {
      console.error('Error al exportar Excel filtrado:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
          Informes Financieros & Exportación a Excel
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-1">
          Descarga un archivo .xlsx completo con libros separados para cada área contable del negocio.
        </p>
      </div>

      {/* Hero Banner: Prominent Export Button as requested */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-tr from-emerald-800 to-teal-700 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-xs mb-3">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> Exportación 100% de Datos Reales
          </span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Descarga el Libro Contable Oficial
          </h2>
          <p className="text-emerald-100 text-xs sm:text-sm mt-2 leading-relaxed">
            Genera al instante el archivo de Microsoft Excel (.xlsx) estructurado en 7 hojas: Objetos y tarifas, Registro diario, Pagos recibidos, Distribución, Saldos pendientes, Personas y Configuración con auditoría.
          </p>
        </div>

        <button
          onClick={handleFullExport}
          disabled={isExporting}
          className="px-6 py-4 rounded-xl bg-white text-emerald-950 font-black text-sm hover:bg-emerald-50 transition shadow-lg flex items-center justify-center gap-3 shrink-0 active:scale-95"
        >
          <Download className="w-5 h-5 text-emerald-700" />
          «Exportar todos los datos a Excel»
        </button>
      </div>

      {/* Sheets Preview Grid */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">
          Estructura de las 7 Hojas del Libro Excel
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-white border border-slate-200">
            <span className="font-extrabold text-emerald-700 block mb-1">1. Objetos y Tarifas</span>
            <p className="text-slate-500 text-[11px]">
              ID, Nombre, Categoría, Tarifa diaria COP, Placa/Serial, Estado y Fechas de registro.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-slate-200">
            <span className="font-extrabold text-emerald-700 block mb-1">2. Registro Diario</span>
            <p className="text-slate-500 text-[11px]">
              Histórico día a día, tarifa snapshot inmutable, abono recibido, saldo y estado.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-slate-200">
            <span className="font-extrabold text-emerald-700 block mb-1">3. Pagos Recibidos</span>
            <p className="text-slate-500 text-[11px]">
              Recibo N°, Fecha dinero recibido, Monto COP, Medio de pago, Referencia y Saldo sin aplicar.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-slate-200">
            <span className="font-extrabold text-emerald-700 block mb-1">4. Distribución de Pagos</span>
            <p className="text-slate-500 text-[11px]">
              Detalle de cada cuota aplicada a los días específicos de cada objeto alquilado.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-slate-200">
            <span className="font-extrabold text-rose-700 block mb-1">5. Saldos Pendientes</span>
            <p className="text-slate-500 text-[11px]">
              Obligaciones activas, personas deudoras, tarifas pendientes y fechas impagas.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-slate-200">
            <span className="font-extrabold text-blue-700 block mb-1">6. Personas Registradas</span>
            <p className="text-slate-500 text-[11px]">
              Cartera por arrendatario, total pagado, días alquilados y saldo deudor consolidado.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-slate-200 sm:col-span-2">
            <span className="font-extrabold text-slate-800 block mb-1">7. Configuración & Auditoría</span>
            <p className="text-slate-500 text-[11px]">
              Datos comerciales, moneda oficial (COP) y trazabilidad completa de modificaciones.
            </p>
          </div>
        </div>
      </div>

      {/* Filtered Export Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900">
            Exportación Filtrada por Fecha y Objeto
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mb-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Filtrar por objeto
            </label>
            <select
              value={filterObjectId}
              onChange={e => setFilterObjectId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium"
            >
              <option value="all">Todos los objetos</option>
              {objects.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Desde fecha (Opcional)
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Hasta fecha (Opcional)
            </label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
            />
          </div>
        </div>

        <button
          onClick={handleFilteredExport}
          disabled={isExporting}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          Descargar Reporte Filtrado (.xlsx)
        </button>
      </div>

      {/* Debtors & Pending Obligations Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              Saldos & Obligaciones Pendientes de Cobro
            </h3>
            <p className="text-xs text-slate-500">
              Desglose de clientes y fechas con deuda activa en pesos colombianos
            </p>
          </div>
          <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg">
            {pendingRentals.length} día(s) pendientes
          </span>
        </div>

        {debtorsList.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            ¡Felicitaciones! No hay saldos pendientes de cobro en alquileres confirmados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-2.5 px-3">Persona / Deudor</th>
                  <th className="py-2.5 px-3">Objetos Relacionados</th>
                  <th className="py-2.5 px-3 text-center">Días en Mora</th>
                  <th className="py-2.5 px-3 text-right">Saldo Deuda Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {debtorsList.map((d, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {d.person}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {d.objects}
                    </td>
                    <td className="py-2.5 px-3 text-center font-semibold text-rose-700">
                      {d.daysCount}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-rose-600">
                      {formatCOP(d.totalPending)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
