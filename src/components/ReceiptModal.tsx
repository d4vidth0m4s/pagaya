import React from 'react';
import { PaymentReceipt, PaymentAllocation, AppSettings } from '../types';
import { formatCOP } from '../utils/formatters';
import { formatDateHuman } from '../utils/dateUtils';
import { Printer, X, CheckCircle2 } from 'lucide-react';

interface ReceiptModalProps {
  receipt: PaymentReceipt;
  allocations: PaymentAllocation[];
  settings: AppSettings | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  receipt,
  allocations,
  settings,
  onClose
}) => {
  const handlePrint = () => {
    window.print();
  };

  const totalAllocated = allocations.reduce((sum, a) => sum + a.allocatedAmount, 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-6">
        
        {/* Controls - Hidden during print */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 print:hidden">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Comprobante de Recibo Oficial
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir Recibo
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="space-y-6 text-slate-900 font-sans">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-900">
                {settings?.businessName || 'AlquilaYa - Gestión de Alquileres'}
              </h2>
              <p className="text-xs text-slate-500">
                NIT / C.C. Régimen Simplificado • Tel: {settings?.phone || '300 000 0000'}
              </p>
              <p className="text-xs text-slate-500">
                Colombia • Moneda oficial: COP
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                RECIBO DE CAJA
              </span>
              <p className="text-base font-extrabold text-slate-900 mt-1">
                {receipt.receiptNumber}
              </p>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div>
              <span className="text-slate-400 block font-medium">Fecha de recepción:</span>
              <span className="font-bold text-slate-800">{formatDateHuman(receipt.receivedDate)}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Forma de pago:</span>
              <span className="font-bold text-slate-800">{receipt.paymentMethod}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Recibido de (Cliente):</span>
              <span className="font-bold text-slate-800">{receipt.personName || 'Cliente General'}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">N° Referencia / Comprobante:</span>
              <span className="font-mono font-bold text-slate-800">{receipt.reference || 'N/A'}</span>
            </div>
          </div>

          {/* Concepts Breakdown Table */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Conceptos y Fechas de Alquiler Cubiertas
            </h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Objeto</th>
                    <th className="py-2 px-3">Fecha Alquilada</th>
                    <th className="py-2 px-3 text-right">Valor Aplicado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allocations.map(alc => (
                    <tr key={alc.id}>
                      <td className="py-2 px-3 font-semibold text-slate-800">{alc.objectName}</td>
                      <td className="py-2 px-3 text-slate-600">{formatDateHuman(alc.rentalDate)}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">{formatCOP(alc.allocatedAmount)}</td>
                    </tr>
                  ))}
                  {allocations.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-slate-400 italic">
                        Pago registrado sin conceptos específicos de fecha.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Summary */}
          <div className="space-y-1.5 pt-2 text-xs border-t border-slate-200">
            <div className="flex justify-between text-slate-600">
              <span>Total Aplicado a Alquileres:</span>
              <span className="font-bold text-slate-900">{formatCOP(totalAllocated)}</span>
            </div>

            {receipt.unallocatedAmount > 0 && (
              <div className="flex justify-between text-amber-700 font-medium">
                <span>Saldo a Favor / Anticipo Sin Aplicar:</span>
                <span className="font-bold">{formatCOP(receipt.unallocatedAmount)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm sm:text-base font-black text-slate-900 pt-2 border-t border-slate-300">
              <span>Total Dinero Recibido:</span>
              <span className="text-emerald-700">{formatCOP(receipt.totalAmount)}</span>
            </div>
          </div>

          {/* Notes */}
          {receipt.notes && (
            <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="font-bold block text-slate-700">Observaciones:</span>
              {receipt.notes}
            </div>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-8 mt-6 border-t border-slate-200 text-center text-xs text-slate-500">
            <div>
              <div className="border-b border-slate-300 pb-8 mb-1" />
              <span>Firma y Sello de Recibido</span>
            </div>
            <div>
              <div className="border-b border-slate-300 pb-8 mb-1" />
              <span>Firma de Quien Entrega</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
