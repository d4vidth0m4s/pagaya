import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import {
  parseDaysInput,
  buildFullDates,
  getTodayColombia,
  getCurrentPeriodColombia,
  formatDateHuman,
  formatMonthName
} from '../utils/dateUtils';
import { formatCOP } from '../utils/formatters';
import { PaymentReceipt, PaymentAllocation, RentalStatus } from '../types';
import { ReceiptModal } from './ReceiptModal';
import {
  CreditCard,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  Search,
  Receipt,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface ConceptLine {
  id: string;
  objectId: string;
  daysInput: string;
  period: string; // YYYY-MM
}

interface PaymentsViewProps {
  initialRentalId?: string;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({ initialRentalId }) => {
  const {
    objects,
    rentals,
    receipts,
    allocations,
    settings,
    createPaymentReceipt,
    registerDailyRentals
  } = useData();

  // Receipt Form state
  const [receivedDate, setReceivedDate] = useState<string>(() => getTodayColombia());
  const [personName, setPersonName] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Transferencia Bancolombia');
  const [reference, setReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [customTotalAmount, setCustomTotalAmount] = useState<string>('');

  // Concepts array (allows multiple objects and day sets in same receipt)
  const [concepts, setConcepts] = useState<ConceptLine[]>(() => {
    const firstObj = objects[0]?.id || '';
    return [
      {
        id: 'concept_1',
        objectId: firstObj,
        daysInput: '',
        period: getCurrentPeriodColombia(),
      }
    ];
  });

  const [formFeedback, setFormFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active receipt for preview/print modal
  const [selectedReceiptForPrint, setSelectedReceiptForPrint] = useState<{
    receipt: PaymentReceipt;
    allocations: PaymentAllocation[];
  } | null>(null);

  // Search receipts
  const [receiptSearch, setReceiptSearch] = useState('');

  // Payment methods list
  const paymentMethods = [
    'Transferencia Bancolombia',
    'Nequi',
    'Daviplata',
    'Efectivo',
    'PSE',
    'Tarjeta Débito/Crédito',
    'Otro'
  ];

  // Adjust concepts if an object was deleted
  React.useEffect(() => {
    if (objects.length > 0) {
      setConcepts(prev => prev.map(c => {
        if (!objects.some(o => o.id === c.objectId)) {
          return { ...c, objectId: objects[0].id };
        }
        return c;
      }));
    }
  }, [objects]);

  // Add another concept line (e.g. Moto 3 after Moto 2)
  const addConceptLine = () => {
    const nextObj = objects[concepts.length % objects.length]?.id || objects[0]?.id || '';
    setConcepts(prev => [
      ...prev,
      {
        id: `concept_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        objectId: nextObj,
        daysInput: '',
        period: getCurrentPeriodColombia(),
      }
    ]);
  };

  const removeConceptLine = (id: string) => {
    if (concepts.length === 1) return;
    setConcepts(prev => prev.filter(c => c.id !== id));
  };

  const updateConcept = (id: string, updates: Partial<ConceptLine>) => {
    setConcepts(prev => prev.map(c => (c.id === id ? { ...c, ...updates } : c)));
  };

  // Evaluate each concept and calculate total expected
  const parsedConcepts = useMemo(() => {
    let totalExpected = 0;
    const details = concepts.map(c => {
      const targetObj = objects.find(o => o.id === c.objectId);
      const rate = targetObj?.dailyRate || 0;
      let validDays: number[] = [];
      let fullDates: string[] = [];

      if (c.period && c.daysInput.trim()) {
        const [y, m] = c.period.split('-').map(Number);
        const parseRes = parseDaysInput(c.daysInput, y, m);
        validDays = parseRes.validDays;
        fullDates = buildFullDates(c.period, validDays);
      }

      const subtotal = fullDates.length * rate;
      totalExpected += subtotal;

      return {
        ...c,
        targetObj,
        rate,
        validDays,
        fullDates,
        subtotal,
      };
    });

    return { details, totalExpected };
  }, [concepts, objects]);

  // Actual amount to register
  const finalTotalAmount = customTotalAmount !== '' ? parseFloat(customTotalAmount) || 0 : parsedConcepts.totalExpected;
  const difference = finalTotalAmount - parsedConcepts.totalExpected;

  // Handle Form Submission
  const handleSubmitReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (finalTotalAmount <= 0 && parsedConcepts.totalExpected <= 0) {
      setFormFeedback({ type: 'error', message: 'El importe del pago debe ser mayor a 0 COP.' });
      return;
    }

    setIsSubmitting(true);
    setFormFeedback(null);

    try {
      // 1. Gather all rental day targets and ensure they exist or register them
      const targetAllocations: {
        rentalId: string;
        objectId: string;
        objectName: string;
        rentalDate: string;
        amountToApply: number;
      }[] = [];

      let fundsAvailable = finalTotalAmount;

      for (const concept of parsedConcepts.details) {
        if (!concept.targetObj) continue;

        for (const dateStr of concept.fullDates) {
          // Look for existing rental record
          let existingRental = rentals.find(
            r => r.objectId === concept.objectId && r.date === dateStr
          );

          let rentalId = existingRental?.id;
          let rateSnapshot = existingRental?.dailyRateSnapshot ?? concept.rate;
          let currentPaid = existingRental?.paidAmount ?? 0;
          let pendingDebtOnDay = Math.max(0, rateSnapshot - currentPaid);

          // If rental does not exist yet, auto-create it as confirmed!
          if (!existingRental) {
            rentalId = `rnt_${concept.objectId}_${dateStr}`;
            await registerDailyRentals({
              objectId: concept.objectId,
              dates: [dateStr],
              status: 'confirmed_unpaid',
              personName: personName.trim() || undefined,
            });
            pendingDebtOnDay = rateSnapshot;
          }

          if (fundsAvailable > 0 && pendingDebtOnDay > 0) {
            const amountToApply = Math.min(fundsAvailable, pendingDebtOnDay);
            fundsAvailable -= amountToApply;

            targetAllocations.push({
              rentalId: rentalId!,
              objectId: concept.objectId,
              objectName: concept.targetObj.name,
              rentalDate: dateStr,
              amountToApply,
            });
          }
        }
      }

      // 2. Create the payment receipt and allocations
      const receiptId = await createPaymentReceipt({
        receivedDate,
        totalAmount: finalTotalAmount,
        personName: personName.trim() || undefined,
        paymentMethod,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
        allocations: targetAllocations,
      });

      setFormFeedback({
        type: 'success',
        message: `¡Recibo registrado exitosamente! Se aplicó a ${targetAllocations.length} concepto(s) de fecha.`
      });

      // Reset form
      setCustomTotalAmount('');
      setPersonName('');
      setReference('');
      setNotes('');
      setConcepts([
        {
          id: 'concept_new_1',
          objectId: objects[0]?.id || '',
          daysInput: '',
          period: getCurrentPeriodColombia(),
        }
      ]);
    } catch (err: unknown) {
      setFormFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al registrar el pago.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered receipts list
  const filteredReceipts = useMemo(() => {
    return receipts.filter(rc => {
      const matchSearch =
        rc.receiptNumber.toLowerCase().includes(receiptSearch.toLowerCase()) ||
        (rc.personName && rc.personName.toLowerCase().includes(receiptSearch.toLowerCase())) ||
        rc.paymentMethod.toLowerCase().includes(receiptSearch.toLowerCase()) ||
        (rc.reference && rc.reference.toLowerCase().includes(receiptSearch.toLowerCase()));
      return matchSearch;
    });
  }, [receipts, receiptSearch]);

  const openReceiptModal = (rec: PaymentReceipt) => {
    const recAllocations = allocations.filter(a => a.receiptId === rec.id);
    setSelectedReceiptForPrint({ receipt: rec, allocations: recAllocations });
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <CreditCard className="w-6 h-6 text-emerald-600" />
          Registro de Pagos & Distribución de Cobros
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-1">
          Registra el dinero recibido y aplícalo a múltiples objetos y días en un solo recibo, con cálculo de subtotales y saldos pendientes.
        </p>
      </div>

      {/* Main Grid: Payment Entry Form on Left, Receipts Log on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* New Receipt Form (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              Nuevo Recibo de Pago
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              Próximo N°: <strong className="text-slate-800">{settings?.receiptPrefix || 'REC'}-{String(settings?.nextReceiptNumber || receipts.length + 1).padStart(4, '0')}</strong>
            </span>
          </div>

          {formFeedback && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold ${
                formFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {formFeedback.message}
            </div>
          )}

          {objects.length === 0 ? (
            <div className="p-8 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2 text-center">
              <p className="font-bold text-sm">No hay objetos registrados aún</p>
              <p className="text-xs text-amber-800 max-w-sm mx-auto">
                La aplicación ha iniciado en cero. Antes de emitir recibos de pago y liquidar conceptos de fecha, crea tu primer activo en la pestaña <strong>Objetos</strong>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmitReceipt} className="space-y-4 text-xs">
              {/* Header Data: Date, Person, Method, Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Fecha de recepción del dinero *
                </label>
                <input
                  type="date"
                  required
                  value={receivedDate}
                  onChange={e => setReceivedDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nombre de la persona / pagador (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: David Thomas"
                  value={personName}
                  onChange={e => setPersonName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Método de pago *
                </label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  {paymentMethods.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Referencia o N° de comprobante
                </label>
                <input
                  type="text"
                  placeholder="Ej: Nequi M12093 / Bancolombia 4821"
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Concepts Section: Multiple Objects & Day Ranges */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Conceptos de Alquiler a Pagar
                </span>
                <button
                  type="button"
                  onClick={addConceptLine}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700"
                >
                  <Plus className="w-3.5 h-3.5" /> + Añadir otro concepto
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mb-3">
                Selecciona el objeto, período y digita los días numéricos (ejemplo: Moto 2: 12,13,14,15 y Moto 3: 10,11).
              </p>

              <div className="space-y-3">
                {concepts.map((concept, index) => {
                  const parsed = parsedConcepts.details.find(d => d.id === concept.id);
                  return (
                    <div
                      key={concept.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-700 text-xs">
                          Concepto #{index + 1}
                        </span>
                        {concepts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeConceptLine(concept.id)}
                            className="text-slate-400 hover:text-rose-600 transition"
                            title="Quitar concepto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {/* Object */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Objeto
                          </label>
                          <select
                            value={concept.objectId}
                            onChange={e => updateConcept(concept.id, { objectId: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-medium"
                          >
                            {objects.map(o => (
                              <option key={o.id} value={o.id}>
                                {o.name} ({formatCOP(o.dailyRate)}/d)
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Period Month/Year */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Período (Mes/Año)
                          </label>
                          <input
                            type="month"
                            required
                            value={concept.period}
                            onChange={e => updateConcept(concept.id, { period: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                          />
                        </div>

                        {/* Days input */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Días numéricos (ej: 12,13,14,15)
                          </label>
                          <input
                            type="text"
                            placeholder="12,13,14,15"
                            value={concept.daysInput}
                            onChange={e => updateConcept(concept.id, { daysInput: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-mono font-bold"
                          />
                        </div>
                      </div>

                      {/* Concept Subtotal Live Calculation */}
                      {parsed && parsed.validDays.length > 0 && (
                        <div className="flex items-center justify-between text-[11px] bg-white p-2 rounded-lg border border-slate-200">
                          <span className="text-slate-500">
                            {parsed.targetObj?.name}: {parsed.validDays.length} día(s) ({parsed.validDays.join(', ')}) × {formatCOP(parsed.rate)}
                          </span>
                          <span className="font-extrabold text-emerald-700">
                            Subtotal: {formatCOP(parsed.subtotal)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Calculations & Payment Adjustment Panel */}
            <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Total Esperado por Conceptos:</span>
                <span className="text-base font-bold text-white">
                  {formatCOP(parsedConcepts.totalExpected)}
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Importe efectivamente recibido (COP) *
                  </label>
                  {parsedConcepts.totalExpected > 0 && (
                    <button
                      type="button"
                      onClick={() => setCustomTotalAmount(String(parsedConcepts.totalExpected))}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold"
                    >
                      Autollenar valor esperado
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    placeholder={String(parsedConcepts.totalExpected)}
                    value={customTotalAmount}
                    onChange={e => setCustomTotalAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm font-black text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Difference breakdown */}
              {finalTotalAmount > 0 && (
                <div className="text-xs pt-2 border-t border-slate-800 flex justify-between items-center">
                  {difference === 0 ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Pago exacto al 100% de los conceptos
                    </span>
                  ) : difference > 0 ? (
                    <span className="text-amber-300 font-semibold">
                      Pago excede en {formatCOP(difference)} (queda como anticipo sin aplicar)
                    </span>
                  ) : (
                    <span className="text-rose-400 font-semibold">
                      Pago parcial: Deuda pendiente de {formatCOP(Math.abs(difference))}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Observaciones del recibo (Opcional)
              </label>
              <textarea
                rows={2}
                placeholder="Detalles adicionales sobre el pago o acuerdo..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || finalTotalAmount <= 0}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-sm shadow-xs transition flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Registrando recibo...' : `Guardar Recibo por ${formatCOP(finalTotalAmount)}`}
            </button>
          </form>
          )}
        </div>

        {/* History of Receipts List (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                Recibos Registrados
              </h2>
              <span className="text-xs text-slate-500 font-bold">
                {receipts.length} recibo(s)
              </span>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por N°, cliente, método..."
                value={receiptSearch}
                onChange={e => setReceiptSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Receipts Scroll list */}
            <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1 scrollbar-thin">
              {filteredReceipts.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No hay recibos registrados aún.
                </div>
              ) : (
                filteredReceipts.map(rec => {
                  const recAllocations = allocations.filter(a => a.receiptId === rec.id);
                  return (
                    <div
                      key={rec.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-slate-900">
                              {rec.receiptNumber}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-semibold">
                              {rec.paymentMethod}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">
                            {rec.personName ? `Cliente: ${rec.personName}` : 'Cliente no especificado'}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Fecha recibo: {formatDateHuman(rec.receivedDate)}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="font-black text-sm text-emerald-600 block">
                            {formatCOP(rec.totalAmount)}
                          </span>
                          <button
                            onClick={() => openReceiptModal(rec)}
                            className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-emerald-700 bg-white px-2 py-1 rounded-md border border-slate-200 shadow-xs"
                          >
                            <Printer className="w-3 h-3" /> Ver / Imprimir
                          </button>
                        </div>
                      </div>

                      {/* Covered Concepts info */}
                      {recAllocations.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
                          <span className="font-semibold text-slate-700 block mb-0.5">
                            Conceptos cubiertos ({recAllocations.length}):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {recAllocations.map(a => (
                              <span
                                key={a.id}
                                className="px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] text-slate-700 font-medium"
                              >
                                {a.objectName} ({a.rentalDate.slice(5)})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {rec.unallocatedAmount > 0 && (
                        <p className="text-[10px] text-amber-700 font-bold mt-1">
                          Anticipo no aplicado: {formatCOP(rec.unallocatedAmount)}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      {selectedReceiptForPrint && (
        <ReceiptModal
          receipt={selectedReceiptForPrint.receipt}
          allocations={selectedReceiptForPrint.allocations}
          settings={settings}
          onClose={() => setSelectedReceiptForPrint(null)}
        />
      )}
    </div>
  );
};
