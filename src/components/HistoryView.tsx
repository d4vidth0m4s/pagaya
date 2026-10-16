import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { formatDateHuman } from '../utils/dateUtils';
import { History, Search, Filter, ShieldCheck, Clock, FileText } from 'lucide-react';

export const HistoryView: React.FC = () => {
  const { auditLogs } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch =
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const uniqueActions = Array.from(new Set(auditLogs.map(l => l.action)));

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <History className="w-6 h-6 text-emerald-600" />
          Historial & Auditoría de Operaciones
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-1">
          Registro inmutable de todas las creaciones de objetos, variaciones de tarifas, fechas alquiladas, cobros y ajustes.
        </p>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar en el registro de auditoría..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Todas las acciones ({auditLogs.length})</option>
            {uniqueActions.map(act => (
              <option key={act} value={act}>{act}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs Timeline / Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No hay registros de auditoría que coincidan con la búsqueda.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLogs.map(log => {
              const dateObj = new Date(log.timestamp);
              const formattedTime = !isNaN(dateObj.getTime())
                ? `${dateObj.toLocaleDateString('es-CO')} ${dateObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`
                : log.timestamp;

              return (
                <div key={log.id} className="p-4 sm:p-5 flex items-start gap-4 hover:bg-slate-50/70 transition">
                  <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs uppercase tracking-wider text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 whitespace-nowrap">
                        <Clock className="w-3 h-3" /> {formattedTime}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 font-medium mt-1.5 leading-relaxed">
                      {log.details}
                    </p>

                    {log.entityType && (
                      <span className="text-[10px] text-slate-400 block mt-1">
                        Entidad: {log.entityType} {log.entityId ? `(#${log.entityId.slice(0, 8)})` : ''}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
