import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import {
  parseDaysInput,
  buildFullDates,
  getDaysInMonth,
  formatDateHuman,
  formatMonthName,
  getCurrentPeriodColombia,
  DAY_NAMES_ES
} from '../utils/dateUtils';
import { formatCOP } from '../utils/formatters';
import { RentalStatus, DailyRental } from '../types';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Check,
  User,
  Filter,
  Layers,
  Sparkles
} from 'lucide-react'; 

interface CalendarViewProps {
  initialObjectId?: string;
  onOpenPaymentWithRental?: (rentalId: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  initialObjectId,
  onOpenPaymentWithRental
}) => {
  const { objects, rentals, registerDailyRentals, updateRentalStatus, deleteRental } = useData();

  // Active viewing period YYYY-MM
  const [currentPeriod, setCurrentPeriod] = useState<string>(() => getCurrentPeriodColombia());
  const [selectedObjectId, setSelectedObjectId] = useState<string>(initialObjectId || 'all');

  // Compact registration form state
  const [formObjectId, setFormObjectId] = useState<string>(() => {
    const active = objects.filter(o => o.status === 'active');
    return active.length > 0 ? active[0].id : (objects[0]?.id || '');
  });
  const [daysInput, setDaysInput] = useState<string>('1,3,4');
  const [formPeriod, setFormPeriod] = useState<string>(() => getCurrentPeriodColombia());
  const [formStatus, setFormStatus] = useState<RentalStatus>('confirmed_unpaid');
  const [formPersonName, setFormPersonName] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected rental for details modal
  const [activeRentalModal, setActiveRentalModal] = useState<DailyRental | null>(null);

  // Sync selected object if deleted
  React.useEffect(() => {
    if (objects.length > 0 && !objects.some(o => o.id === formObjectId)) {
      const active = objects.filter(o => o.status === 'active');
      setFormObjectId(active.length > 0 ? active[0].id : objects[0].id);
    }
    if (selectedObjectId !== 'all' && !objects.some(o => o.id === selectedObjectId)) {
      setSelectedObjectId('all');
    }
  }, [objects, formObjectId, selectedObjectId]);

  // Month and Year numbers
  const [yearNum, monthNum] = useMemo(() => {
    const [y, m] = currentPeriod.split('-').map(Number);
    return [y, m];
  }, [currentPeriod]);

  // Navigate months
  const handlePrevMonth = () => {
    let nextM = monthNum - 1;
    let nextY = yearNum;
    if (nextM < 1) {
      nextM = 12;
      nextY -= 1;
    }
    const newPeriod = `${nextY}-${String(nextM).padStart(2, '0')}`;
    setCurrentPeriod(newPeriod);
    setFormPeriod(newPeriod);
  };

  const handleNextMonth = () => {
    let nextM = monthNum + 1;
    let nextY = yearNum;
    if (nextM > 12) {
      nextM = 1;
      nextY += 1;
    }
    const newPeriod = `${nextY}-${String(nextM).padStart(2, '0')}`;
    setCurrentPeriod(newPeriod);
    setFormPeriod(newPeriod);
  };

  const handleCurrentMonth = () => {
    const now = getCurrentPeriodColombia();
    setCurrentPeriod(now);
    setFormPeriod(now);
  };

  // Real-time preview of compact day input
  const parsedPreview = useMemo(() => {
    if (!formPeriod || !daysInput.trim()) return null;
    const [y, m] = formPeriod.split('-').map(Number);
    const result = parseDaysInput(daysInput, y, m);
    const fullDates = buildFullDates(formPeriod, result.validDays);

    const targetObj = objects.find(o => o.id === formObjectId);
    const rate = targetObj?.dailyRate || 0;
    const estimatedSubtotal = fullDates.length * rate;

    // Check which dates already exist
    const existingDatesSet = new Set(
      rentals.filter(r => r.objectId === formObjectId).map(r => r.date)
    );
    const alreadyRegistered = fullDates.filter(d => existingDatesSet.has(d));

    return {
      validDays: result.validDays,
      invalidParts: result.invalidParts,
      fullDates,
      estimatedSubtotal,
      rate,
      alreadyRegistered
    };
  }, [daysInput, formPeriod, formObjectId, objects, rentals]);

  // Handle Form Submit
  const handleRegisterDates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedPreview || parsedPreview.validDays.length === 0) {
      setFeedbackMsg({ type: 'error', text: 'Por favor ingresa días válidos separados por comas (ejemplo: 1,3,4).' });
      return;
    }
    if (parsedPreview.invalidParts.length > 0) {
      setFeedbackMsg({
        type: 'error',
        text: `Los siguientes días son inválidos para el mes seleccionado: ${parsedPreview.invalidParts.join(', ')}`
      });
      return;
    }

    setIsSubmitting(true);
    setFeedbackMsg(null);

    try {
      const res = await registerDailyRentals({
        objectId: formObjectId,
        dates: parsedPreview.fullDates,
        status: formStatus,
        personName: formPersonName.trim() || undefined,
        notes: formNotes.trim() || undefined,
      });

      if (res.addedCount > 0 && res.duplicateCount === 0) {
        setFeedbackMsg({
          type: 'success',
          text: `¡Éxito! Se registraron ${res.addedCount} día(s) de alquiler correctamente.`
        });
        setDaysInput('');
        setFormPersonName('');
        setFormNotes('');
      } else if (res.addedCount > 0 && res.duplicateCount > 0) {
        setFeedbackMsg({
          type: 'warning',
          text: `Se agregaron ${res.addedCount} fecha(s). Se omitieron ${res.duplicateCount} fecha(s) que ya estaban registradas (${res.duplicateDates.join(', ')}).`
        });
        setDaysInput('');
      } else {
        setFeedbackMsg({
          type: 'error',
          text: `Todas las fechas ingresadas (${res.duplicateDates.join(', ')}) ya estaban previamente registradas para este objeto.`
        });
      }
    } catch (err: unknown) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al registrar alquileres.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Build Calendar Matrix for the month
  const calendarDays = useMemo(() => {
    const totalDays = getDaysInMonth(yearNum, monthNum);
    // Find day of week for 1st day of month (0 = Sun, 1 = Mon...)
    const firstDayIndex = new Date(yearNum, monthNum - 1, 1).getDay();

    const daysArray: ({ dayNum: number; dateStr: string; isCurrentMonth: boolean } | null)[] = [];

    // Empty lead slots
    for (let i = 0; i < firstDayIndex; i++) {
      daysArray.push(null);
    }

    // Actual days of month
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      daysArray.push({
        dayNum: d,
        dateStr,
        isCurrentMonth: true,
      });
    }

    return daysArray;
  }, [yearNum, monthNum]);

  // Group rentals in this month by date
  const rentalsByDate = useMemo(() => {
    const map = new Map<string, DailyRental[]>();
    rentals.forEach(r => {
      if (r.date.startsWith(currentPeriod)) {
        if (selectedObjectId === 'all' || r.objectId === selectedObjectId) {
          const list = map.get(r.date) || [];
          list.push(r);
          map.set(r.date, list);
        }
      }
    });
    return map;
  }, [rentals, currentPeriod, selectedObjectId]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-emerald-600" />
            Calendario Mensual & Control de Fechas
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Visualiza los días alquilados y registra rápidamente fechas por lotes numéricos (ej: 1,3,4) con validación bisiesta.
          </p>
        </div>

        {/* Legend / Status Indicators */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Alquilado y Pagado
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600" /> Alquilado Sin Pagar
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-300 border-dashed font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Pendiente de Confirmar
          </span>
        </div>
      </div>

      {/* Main Grid: Left Side Compact Register Form, Right Side Visual Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Compact Form Panel (4 cols on lg) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs h-fit space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Registro Rápido de Fechas
              </h2>
              <p className="text-[11px] text-slate-500">
                Entrada compacta por días numéricos y período
              </p>
            </div>
          </div>

          {feedbackMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-medium ${
                feedbackMsg.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : feedbackMsg.type === 'warning'
                  ? 'bg-amber-50 border border-amber-200 text-amber-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {feedbackMsg.text}
            </div>
          )}

          {objects.filter(o => o.status === 'active').length === 0 ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
              <p className="font-bold">No hay objetos activos registrados</p>
              <p className="text-[11px] text-amber-800">
                La aplicación ha iniciado en cero. Ve a la sección <strong>Objetos</strong> para registrar tu primer activo y comenzar a marcar días.
              </p>
            </div>
          ) : (
            <form onSubmit={handleRegisterDates} className="space-y-3.5 text-xs">
              {/* Object Select */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Objeto alquilable *
                </label>
                <select
                  value={formObjectId}
                  onChange={e => setFormObjectId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  {objects
                    .filter(o => o.status === 'active')
                    .map(o => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({formatCOP(o.dailyRate)}/día)
                      </option>
                    ))}
                </select>
              </div>

            {/* Período (Mes y Año) */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Período (Mes y Año) *
              </label>
              <input
                type="month"
                required
                value={formPeriod}
                onChange={e => {
                  setFormPeriod(e.target.value);
                  setCurrentPeriod(e.target.value);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Seleccionado: {formatMonthName(formPeriod)}
              </span>
            </div>

            {/* Input de texto numérico para los días */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">
                  Días numéricos (separados por comas) *
                </label>
                <span className="text-[10px] text-emerald-600 font-mono">Ej: 1,3,4 o 1-5</span>
              </div>
              <input
                type="text"
                required
                placeholder="Ejemplo: 1,3,4 o 12,13,14,15"
                value={daysInput}
                onChange={e => setDaysInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold tracking-wider focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            {/* Live calculation and validation preview */}
            {parsedPreview && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Días reconocidos ({parsedPreview.validDays.length}):</span>
                  <span className="font-bold text-slate-800">
                    {parsedPreview.validDays.length > 0 ? parsedPreview.validDays.join(', ') : 'Ninguno'}
                  </span>
                </div>

                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Tarifa diaria snapshot:</span>
                  <span className="font-semibold text-slate-800">{formatCOP(parsedPreview.rate)}</span>
                </div>

                <div className="flex justify-between text-xs pt-1 border-t border-slate-200">
                  <span className="font-bold text-slate-700">Subtotal esperado:</span>
                  <span className="font-extrabold text-emerald-600">
                    {formatCOP(parsedPreview.estimatedSubtotal)}
                  </span>
                </div>

                {parsedPreview.alreadyRegistered.length > 0 && (
                  <p className="text-[10px] text-amber-700 font-medium">
                    ⚠️ {parsedPreview.alreadyRegistered.length} fecha(s) ya registradas serán omitidas automáticamente para evitar duplicidad.
                  </p>
                )}
              </div>
            )}

            {/* Estado del Alquiler */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Estado inicial *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormStatus('confirmed_unpaid')}
                  className={`p-2 rounded-xl border text-left font-medium transition ${
                    formStatus === 'confirmed_unpaid'
                      ? 'border-rose-400 bg-rose-50 text-rose-900 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <span className="block font-bold">Confirmado</span>
                  <span className="text-[10px] block opacity-80">Genera cuenta de cobro</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormStatus('pending_confirmation')}
                  className={`p-2 rounded-xl border text-left font-medium transition ${
                    formStatus === 'pending_confirmation'
                      ? 'border-amber-400 bg-amber-50 text-amber-900 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <span className="block font-bold">Por confirmar</span>
                  <span className="text-[10px] block opacity-80">No genera deuda aún</span>
                </button>
              </div>
            </div>

            {/* Arrendatario opcional */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nombre de la persona / arrendatario (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ej: Carlos Gómez"
                value={formPersonName}
                onChange={e => setFormPersonName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            {/* Observaciones */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Observaciones (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ruta, jornada o notas..."
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !parsedPreview || parsedPreview.validDays.length === 0}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              {isSubmitting ? 'Guardando fechas...' : 'Registrar Fechas en Calendario'}
            </button>
          </form>
          )}
        </div>

        {/* Visual Monthly Calendar (8 cols on lg) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          
          {/* Calendar Toolbar: Month switch and Object filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
                title="Mes anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <h2 className="text-base sm:text-lg font-black text-slate-900 min-w-[170px] text-center">
                {formatMonthName(currentPeriod)}
              </h2>

              <button
                onClick={handleNextMonth}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
                title="Mes siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={handleCurrentMonth}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 ml-1"
              >
                Hoy
              </button>
            </div>

            {/* Filter by object */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedObjectId}
                onChange={e => setSelectedObjectId(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                <option value="all">Ver todos los objetos</option>
                {objects.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.name} {o.status === 'archived' ? '(Archivado)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs font-bold text-slate-400 py-1">
            {DAY_NAMES_ES.map(d => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarDays.map((cell, idx) => {
              if (!cell) {
                return (
                  <div
                    key={`empty_${idx}`}
                    className="min-h-[90px] sm:min-h-[110px] rounded-xl bg-slate-50/50 border border-transparent"
                  />
                );
              }

              const dayRentals = rentalsByDate.get(cell.dateStr) || [];
              const isToday = cell.dateStr === getCurrentPeriodColombia() + '-' + String(new Date().getDate()).padStart(2, '0');

              return (
                <div
                  key={cell.dateStr}
                  className={`min-h-[90px] sm:min-h-[110px] rounded-xl border p-1.5 flex flex-col justify-between transition ${
                    isToday
                      ? 'border-emerald-500 bg-emerald-50/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-black inline-block px-1.5 py-0.5 rounded-md ${
                        isToday ? 'bg-emerald-600 text-white' : 'text-slate-800'
                      }`}
                    >
                      {cell.dayNum}
                    </span>
                    {dayRentals.length > 0 && (
                      <span className="text-[10px] font-bold text-slate-400">
                        {dayRentals.length} {dayRentals.length === 1 ? 'act.' : 'acts.'}
                      </span>
                    )}
                  </div>

                  {/* Day Badges */}
                  <div className="space-y-1 mt-1 overflow-y-auto max-h-[75px] pr-0.5 scrollbar-thin">
                    {dayRentals.map(r => {
                      const balance = Math.max(0, r.dailyRateSnapshot - (r.paidAmount || 0));
                      let badgeStyle = '';
                      let statusText = '';

                      if (r.status === 'confirmed_paid') {
                        badgeStyle = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                        statusText = 'Pagado';
                      } else if (r.status === 'confirmed_unpaid') {
                        badgeStyle = 'bg-rose-100 text-rose-800 border-rose-300';
                        statusText = balance < r.dailyRateSnapshot ? `Resta ${formatCOP(balance, false)}` : `Debe ${formatCOP(balance, false)}`;
                      } else {
                        badgeStyle = 'bg-amber-100 text-amber-800 border-amber-300 border-dashed';
                        statusText = 'Por confirmar';
                      }

                      return (
                        <button
                          key={r.id}
                          onClick={() => setActiveRentalModal(r)}
                          className={`w-full text-left p-1 rounded-md border text-[10px] leading-tight font-semibold truncate block transition hover:scale-[1.02] ${badgeStyle}`}
                          title={`${r.objectName} - ${statusText} (${r.personName || 'Sin arrendatario'})`}
                        >
                          <div className="truncate font-bold">{r.objectName}</div>
                          <div className="truncate text-[9px] opacity-90">{statusText}</div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Empty click prompt */}
                  {dayRentals.length === 0 && (
                    <button
                      onClick={() => {
                        setFormPeriod(currentPeriod);
                        setDaysInput(String(cell.dayNum));
                      }}
                      className="text-[10px] text-slate-300 hover:text-emerald-600 self-end opacity-0 hover:opacity-100 transition"
                      title="Registrar este día"
                    >
                      +
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal: Rental Day Details & Status Update */}
      {activeRentalModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  Detalle de Alquiler Diario
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  {activeRentalModal.objectName}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {formatDateHuman(activeRentalModal.date)}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block">Tarifa fija snapshot</span>
                <span className="font-extrabold text-slate-900 text-sm">
                  {formatCOP(activeRentalModal.dailyRateSnapshot)}
                </span>
              </div>
            </div>

            {/* Current Financial Status for this day */}
            <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Estado actual:</span>
                <span className="font-bold text-slate-900">
                  {activeRentalModal.status === 'confirmed_paid' && 'Confirmado y Pagado'}
                  {activeRentalModal.status === 'confirmed_unpaid' && 'Confirmado Sin Pagar'}
                  {activeRentalModal.status === 'pending_confirmation' && 'Pendiente de Confirmar'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Monto abonado / pagado:</span>
                <span className="font-bold text-emerald-600">{formatCOP(activeRentalModal.paidAmount || 0)}</span>
              </div>

              <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold">
                <span className="text-slate-700">Saldo pendiente:</span>
                <span className="text-rose-600">
                  {activeRentalModal.status === 'pending_confirmation'
                    ? '$0 COP (Por confirmar)'
                    : formatCOP(Math.max(0, activeRentalModal.dailyRateSnapshot - (activeRentalModal.paidAmount || 0)))}
                </span>
              </div>

              {activeRentalModal.personName && (
                <div className="flex justify-between text-slate-600 pt-1">
                  <span>Arrendatario:</span>
                  <span className="font-semibold text-slate-800">{activeRentalModal.personName}</span>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="mt-5 space-y-2 text-xs">
              <p className="font-bold text-slate-700">Cambiar estado del día:</p>

              <div className="grid grid-cols-2 gap-2">
                {activeRentalModal.status !== 'confirmed_unpaid' && activeRentalModal.paidAmount < activeRentalModal.dailyRateSnapshot && (
                  <button
                    onClick={async () => {
                      await updateRentalStatus(activeRentalModal.id, 'confirmed_unpaid');
                      setActiveRentalModal(null);
                    }}
                    className="p-2 rounded-xl bg-rose-50 text-rose-800 hover:bg-rose-100 font-bold border border-rose-200"
                  >
                    Confirmar Alquiler
                  </button>
                )}

                {activeRentalModal.status !== 'pending_confirmation' && activeRentalModal.paidAmount === 0 && (
                  <button
                    onClick={async () => {
                      await updateRentalStatus(activeRentalModal.id, 'pending_confirmation');
                      setActiveRentalModal(null);
                    }}
                    className="p-2 rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 font-bold border border-amber-200"
                  >
                    Marcar Pendiente
                  </button>
                )}

                {activeRentalModal.status === 'confirmed_unpaid' && onOpenPaymentWithRental && (
                  <button
                    onClick={() => {
                      const id = activeRentalModal.id;
                      setActiveRentalModal(null);
                      onOpenPaymentWithRental(id);
                    }}
                    className="p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-bold col-span-2 flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Registrar Cobro para este Alquiler
                  </button>
                )}
              </div>
            </div>

            {/* Delete button (only allowed if paidAmount is 0) */}
            <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between">
              {activeRentalModal.paidAmount === 0 ? (
                <button
                  onClick={async () => {
                    await deleteRental(activeRentalModal.id);
                    setActiveRentalModal(null);
                  }}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Eliminar este día
                </button>
              ) : (
                <span className="text-[10px] text-slate-400 italic">
                  Posee abonos registrados, no se puede eliminar.
                </span>
              )}

              <button
                onClick={() => setActiveRentalModal(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
