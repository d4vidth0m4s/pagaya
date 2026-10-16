export type ObjectStatus = 'active' | 'archived';

export type RentalStatus = 'pending_confirmation' | 'confirmed_unpaid' | 'confirmed_paid';

export interface RentalObject {
  id: string;
  name: string;
  category: string;
  dailyRate: number; // in COP
  status: ObjectStatus;
  description?: string;
  licensePlateOrSerial?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyRental {
  id: string; // e.g. rental_objId_YYYY-MM-DD
  objectId: string;
  objectName: string;
  date: string; // YYYY-MM-DD
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  dailyRateSnapshot: number; // immutable historical rate snapshot
  status: RentalStatus;
  paidAmount: number; // in COP
  personName?: string;
  notes?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentConceptInput {
  objectId: string;
  daysInput: string; // e.g. "12,13,14,15" or "1-5"
  period: string; // YYYY-MM
  calculatedDates: string[];
  subtotal: number;
}

export interface PaymentAllocation {
  id: string;
  receiptId: string;
  receiptNumber: string;
  rentalId: string;
  objectId: string;
  objectName: string;
  rentalDate: string; // YYYY-MM-DD
  allocatedAmount: number; // in COP
  ownerId: string;
  createdAt: string;
}

export interface PaymentReceipt {
  id: string;
  receiptNumber: string;
  receivedDate: string; // YYYY-MM-DD
  totalAmount: number; // in COP
  personName?: string;
  paymentMethod: string; // 'Efectivo' | 'Transferencia Bancolombia' | 'Nequi' | 'Daviplata' | 'Otro'
  reference?: string;
  notes?: string;
  unallocatedAmount: number; // Money not yet applied to rental days
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  id: string;
  businessName: string;
  currency: string;
  phone?: string;
  receiptPrefix?: string;
  nextReceiptNumber?: number;
  ownerId: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  entityType?: string;
  entityId?: string;
  timestamp: string;
  ownerId: string;
}

export type ViewTab = 'dashboard' | 'objects' | 'calendar' | 'payments' | 'history' | 'reports' | 'settings';
