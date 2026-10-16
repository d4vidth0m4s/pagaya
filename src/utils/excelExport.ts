import * as XLSX from 'xlsx';
import { RentalObject, DailyRental, PaymentReceipt, PaymentAllocation, AppSettings, AuditLog } from '../types';
import { formatCOP } from './formatters';

export interface ExportFilters {
  startDate?: string;
  endDate?: string;
  objectId?: string;
}

export function exportToExcel(
  objects: RentalObject[],
  rentals: DailyRental[],
  receipts: PaymentReceipt[],
  allocations: PaymentAllocation[],
  settings: AppSettings | null,
  auditLogs: AuditLog[],
  filters?: ExportFilters
) {
  // Apply optional filtering if supplied
  let filteredRentals = rentals;
  let filteredReceipts = receipts;
  let filteredAllocations = allocations;

  if (filters?.objectId && filters.objectId !== 'all') {
    filteredRentals = filteredRentals.filter(r => r.objectId === filters.objectId);
    filteredAllocations = filteredAllocations.filter(a => a.objectId === filters.objectId);
  }

  if (filters?.startDate) {
    filteredRentals = filteredRentals.filter(r => r.date >= filters.startDate!);
    filteredReceipts = filteredReceipts.filter(rc => rc.receivedDate >= filters.startDate!);
    filteredAllocations = filteredAllocations.filter(a => a.rentalDate >= filters.startDate!);
  }

  if (filters?.endDate) {
    filteredRentals = filteredRentals.filter(r => r.date <= filters.endDate!);
    filteredReceipts = filteredReceipts.filter(rc => rc.receivedDate <= filters.endDate!);
    filteredAllocations = filteredAllocations.filter(a => a.rentalDate <= filters.endDate!);
  }

  const wb = XLSX.utils.book_new();

  // 1. Hoja: Objetos y Tarifas
  const sheet1Data = objects.map(obj => ({
    'ID Único': obj.id,
    'Nombre del Objeto': obj.name,
    'Categoría': obj.category,
    'Tarifa Diaria (COP)': obj.dailyRate,
    'Tarifa Formateada': formatCOP(obj.dailyRate),
    'Estado': obj.status === 'active' ? 'Activo' : 'Archivado',
    'Placa / Serial': obj.licensePlateOrSerial || 'N/A',
    'Descripción': obj.description || '',
    'Fecha de Creación': obj.createdAt,
    'Última Modificación': obj.updatedAt,
  }));
  const ws1 = XLSX.utils.json_to_sheet(sheet1Data);
  XLSX.utils.book_append_sheet(wb, ws1, 'Objetos y Tarifas');

  // 2. Hoja: Registro Diario de Alquileres
  const sheet2Data = filteredRentals.map(r => {
    const balance = Math.max(0, r.dailyRateSnapshot - (r.paidAmount || 0));
    let statusLabel = 'Pendiente Confirmar';
    if (r.status === 'confirmed_paid') statusLabel = 'Confirmado y Pagado';
    else if (r.status === 'confirmed_unpaid') statusLabel = 'Confirmado Sin Pagar';

    return {
      'ID Registro': r.id,
      'ID Objeto': r.objectId,
      'Nombre Objeto': r.objectName,
      'Fecha Alquiler': r.date,
      'Año': r.year,
      'Mes': r.month,
      'Día': r.day,
      'Tarifa Snapshot (COP)': r.dailyRateSnapshot,
      'Estado Alquiler': statusLabel,
      'Valor Pagado (COP)': r.paidAmount || 0,
      'Saldo Pendiente (COP)': r.status === 'pending_confirmation' ? 0 : balance,
      'Persona / Arrendatario': r.personName || 'Sin asignar',
      'Observaciones': r.notes || '',
      'Fecha Creación': r.createdAt,
    };
  });
  const ws2 = XLSX.utils.json_to_sheet(sheet2Data);
  XLSX.utils.book_append_sheet(wb, ws2, 'Registro Alquileres');

  // 3. Hoja: Pagos Recibidos
  const sheet3Data = filteredReceipts.map(rec => ({
    'ID Recibo': rec.id,
    'Número de Recibo': rec.receiptNumber,
    'Fecha de Recepción': rec.receivedDate,
    'Total Recibido (COP)': rec.totalAmount,
    'Total Formateado': formatCOP(rec.totalAmount),
    'Persona / Pagador': rec.personName || 'Sin especificar',
    'Método de Pago': rec.paymentMethod,
    'Referencia Bancaria': rec.reference || 'N/A',
    'Saldo No Aplicado (COP)': rec.unallocatedAmount || 0,
    'Observaciones': rec.notes || '',
    'Fecha de Registro': rec.createdAt,
  }));
  const ws3 = XLSX.utils.json_to_sheet(sheet3Data);
  XLSX.utils.book_append_sheet(wb, ws3, 'Pagos Recibidos');

  // 4. Hoja: Detalle de Conceptos y Distribución de Pagos
  const sheet4Data = filteredAllocations.map(al => ({
    'ID Asignación': al.id,
    'ID Recibo': al.receiptId,
    'N° Recibo': al.receiptNumber,
    'ID Registro Alquiler': al.rentalId,
    'ID Objeto': al.objectId,
    'Nombre Objeto': al.objectName,
    'Fecha Alquilada Cubierta': al.rentalDate,
    'Monto Aplicado (COP)': al.allocatedAmount,
    'Monto Formateado': formatCOP(al.allocatedAmount),
    'Fecha Asignación': al.createdAt,
  }));
  const ws4 = XLSX.utils.json_to_sheet(sheet4Data);
  XLSX.utils.book_append_sheet(wb, ws4, 'Distribución de Pagos');

  // 5. Hoja: Saldos y Obligaciones Pendientes
  // Calculate pending days and debts per object and person
  const pendingRentals = rentals.filter(r => r.status === 'confirmed_unpaid' && (r.dailyRateSnapshot - r.paidAmount > 0));
  const sheet5Data = pendingRentals.map(r => ({
    'ID Registro': r.id,
    'Objeto': r.objectName,
    'Fecha Pendiente': r.date,
    'Persona Deudora': r.personName || 'Sin especificar',
    'Tarifa Diaria (COP)': r.dailyRateSnapshot,
    'Abono Realizado (COP)': r.paidAmount,
    'Deuda Neta Pendiente (COP)': r.dailyRateSnapshot - r.paidAmount,
    'Deuda Formateada': formatCOP(r.dailyRateSnapshot - r.paidAmount),
  }));
  const ws5 = XLSX.utils.json_to_sheet(sheet5Data);
  XLSX.utils.book_append_sheet(wb, ws5, 'Saldos Pendientes');

  // 6. Hoja: Personas Registradas
  const personsMap = new Map<string, { totalRentals: number; totalPaid: number; pendingDebt: number }>();
  rentals.forEach(r => {
    const person = (r.personName || '').trim();
    if (person) {
      const current = personsMap.get(person) || { totalRentals: 0, totalPaid: 0, pendingDebt: 0 };
      current.totalRentals += 1;
      current.totalPaid += (r.paidAmount || 0);
      if (r.status === 'confirmed_unpaid') {
        current.pendingDebt += Math.max(0, r.dailyRateSnapshot - (r.paidAmount || 0));
      }
      personsMap.set(person, current);
    }
  });
  receipts.forEach(rc => {
    const person = (rc.personName || '').trim();
    if (person && !personsMap.has(person)) {
      personsMap.set(person, { totalRentals: 0, totalPaid: rc.totalAmount, pendingDebt: 0 });
    }
  });

  const sheet6Data = Array.from(personsMap.entries()).map(([person, stats]) => ({
    'Nombre de la Persona': person,
    'Días Alquilados': stats.totalRentals,
    'Total Pagado (COP)': stats.totalPaid,
    'Saldo Deudor Pendiente (COP)': stats.pendingDebt,
    'Saldo Deudor Formateado': formatCOP(stats.pendingDebt),
  }));
  const ws6 = XLSX.utils.json_to_sheet(sheet6Data);
  XLSX.utils.book_append_sheet(wb, ws6, 'Personas Registradas');

  // 7. Hoja: Configuración del Negocio e Historial
  const sheet7Data = [
    {
      'Sección': 'Configuración del Negocio',
      'Clave / Detalle': 'Nombre Comercial',
      'Valor': settings?.businessName || 'AlquilaYa',
      'Fecha / Timestamp': settings?.updatedAt || 'N/A',
    },
    {
      'Sección': 'Configuración del Negocio',
      'Clave / Detalle': 'Moneda',
      'Valor': settings?.currency || 'COP',
      'Fecha / Timestamp': '',
    },
    {
      'Sección': 'Configuración del Negocio',
      'Clave / Detalle': 'Teléfono de Contacto',
      'Valor': settings?.phone || 'N/A',
      'Fecha / Timestamp': '',
    },
    {
      'Sección': 'Configuración del Negocio',
      'Clave / Detalle': 'Prefijo de Recibos',
      'Valor': settings?.receiptPrefix || 'REC',
      'Fecha / Timestamp': '',
    },
    ...auditLogs.map(log => ({
      'Sección': 'Historial de Auditoría',
      'Clave / Detalle': log.action,
      'Valor': log.details,
      'Fecha / Timestamp': log.timestamp,
    }))
  ];
  const ws7 = XLSX.utils.json_to_sheet(sheet7Data);
  XLSX.utils.book_append_sheet(wb, ws7, 'Configuración e Historial');

  // Generate file name with date timestamp
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `AlquilaYa_Exportacion_Total_${dateStr}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
