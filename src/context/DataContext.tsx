import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { useAuth } from './AuthContext';
import {
  RentalObject,
  DailyRental,
  PaymentReceipt,
  PaymentAllocation,
  AppSettings,
  AuditLog,
  RentalStatus
} from '../types';
import { getTodayColombia } from '../utils/dateUtils';
import { formatReceiptNumber } from '../utils/formatters';

interface DataContextType {
  objects: RentalObject[];
  rentals: DailyRental[];
  receipts: PaymentReceipt[];
  allocations: PaymentAllocation[];
  settings: AppSettings | null;
  auditLogs: AuditLog[];
  loading: boolean;
  
  // Object actions
  createObject: (data: Omit<RentalObject, 'id' | 'ownerId' | 'createdAt' | 'updatedAt' | 'status'>) => Promise<string>;
  updateObject: (id: string, updates: Partial<Pick<RentalObject, 'name' | 'category' | 'dailyRate' | 'description' | 'licensePlateOrSerial'>>) => Promise<void>;
  archiveObject: (id: string, archive: boolean) => Promise<void>;
  deleteObject: (id: string, cascadeDeleteRentals?: boolean) => Promise<void>;

  // Rental actions
  registerDailyRentals: (params: {
    objectId: string;
    dates: string[];
    status: RentalStatus;
    personName?: string;
    notes?: string;
  }) => Promise<{ addedCount: number; duplicateCount: number; duplicateDates: string[] }>;
  updateRentalStatus: (rentalId: string, newStatus: RentalStatus) => Promise<void>;
  deleteRental: (rentalId: string) => Promise<void>;

  // Payment actions
  createPaymentReceipt: (params: {
    receivedDate: string;
    totalAmount: number;
    personName?: string;
    paymentMethod: string;
    reference?: string;
    notes?: string;
    allocations: {
      rentalId: string;
      objectId: string;
      objectName: string;
      rentalDate: string;
      amountToApply: number;
    }[];
  }) => Promise<string>;

  // Settings & Reset
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  clearAllData: () => Promise<void>;

  // Summary stats
  stats: {
    totalReceived: number;
    totalConfirmedRentalValue: number;
    totalPendingBalance: number;
    paidDaysCount: number;
    pendingDaysCount: number;
    confirmedUnpaidDaysCount: number;
  };
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY_PREFIX = 'alquilaya_local_data_';

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const ownerId = currentUser?.uid || 'guest_user';

  const [objects, setObjects] = useState<RentalObject[]>([]);
  const [rentals, setRentals] = useState<DailyRental[]>([]);
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [allocations, setAllocations] = useState<PaymentAllocation[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Load / Sync with Firestore when logged in
  useEffect(() => {
    let unsubs: (() => void)[] = [];

    if (currentUser) {
      setLoading(true);
      const uid = currentUser.uid;

      // 1. Objects Listener - Starts completely clean/empty at 0
      const qObjects = query(collection(db, 'objects'), where('ownerId', '==', uid));
      const unsubObjects = onSnapshot(qObjects, (snapshot) => {
        const loaded: RentalObject[] = [];
        snapshot.forEach((d) => loaded.push(d.data() as RentalObject));
        setObjects(loaded);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'objects');
      });
      unsubs.push(unsubObjects);

      // 2. Rentals Listener
      const qRentals = query(collection(db, 'rentals'), where('ownerId', '==', uid));
      const unsubRentals = onSnapshot(qRentals, (snapshot) => {
        const loaded: DailyRental[] = [];
        snapshot.forEach((d) => loaded.push(d.data() as DailyRental));
        setRentals(loaded);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'rentals');
      });
      unsubs.push(unsubRentals);

      // 3. Receipts Listener
      const qReceipts = query(collection(db, 'receipts'), where('ownerId', '==', uid));
      const unsubReceipts = onSnapshot(qReceipts, (snapshot) => {
        const loaded: PaymentReceipt[] = [];
        snapshot.forEach((d) => loaded.push(d.data() as PaymentReceipt));
        setReceipts(loaded.sort((a, b) => b.receivedDate.localeCompare(a.receivedDate)));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'receipts');
      });
      unsubs.push(unsubReceipts);

      // 4. Allocations Listener
      const qAllocations = query(collection(db, 'allocations'), where('ownerId', '==', uid));
      const unsubAllocations = onSnapshot(qAllocations, (snapshot) => {
        const loaded: PaymentAllocation[] = [];
        snapshot.forEach((d) => loaded.push(d.data() as PaymentAllocation));
        setAllocations(loaded);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'allocations');
      });
      unsubs.push(unsubAllocations);

      // 5. Settings Listener
      const qSettings = query(collection(db, 'settings'), where('ownerId', '==', uid));
      const unsubSettings = onSnapshot(qSettings, (snapshot) => {
        if (!snapshot.empty) {
          setSettings(snapshot.docs[0].data() as AppSettings);
        } else {
          // Initialize clean settings doc for this user
          initSettings(uid);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'settings');
      });
      unsubs.push(unsubSettings);

      // 6. Audit Logs Listener
      const qLogs = query(collection(db, 'audit_logs'), where('ownerId', '==', uid));
      const unsubLogs = onSnapshot(qLogs, (snapshot) => {
        const loaded: AuditLog[] = [];
        snapshot.forEach((d) => loaded.push(d.data() as AuditLog));
        setAuditLogs(loaded.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'audit_logs');
      });
      unsubs.push(unsubLogs);

    } else {
      // Unauthenticated: Start completely at zero
      setObjects([]);
      setRentals([]);
      setReceipts([]);
      setAllocations([]);
      setSettings(null);
      setAuditLogs([]);
      setLoading(false);
    }

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [currentUser]);

  const initSettings = async (uid: string) => {
    const newSettings: AppSettings = {
      id: `settings_${uid}`,
      businessName: 'Alquileres y Pagos Colombia',
      currency: 'COP',
      phone: '',
      receiptPrefix: 'REC',
      nextReceiptNumber: 1,
      ownerId: uid,
      updatedAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'settings', newSettings.id), newSettings);
      setSettings(newSettings);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'settings');
    }
  };

  const logAudit = async (action: string, details: string, uid = ownerId, entityType?: string, entityId?: string) => {
    const log: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      action,
      details,
      entityType,
      entityId,
      timestamp: new Date().toISOString(),
      ownerId: uid,
    };

    if (currentUser) {
      try {
        await setDoc(doc(db, 'audit_logs', log.id), log);
      } catch (err) {
        console.error('Audit log error', err);
      }
    } else {
      setAuditLogs(prev => [log, ...prev]);
    }
  };

  // Object Actions
  const createObject = async (data: Omit<RentalObject, 'id' | 'ownerId' | 'createdAt' | 'updatedAt' | 'status'>): Promise<string> => {
    const id = `obj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newObj: RentalObject = {
      ...data,
      id,
      status: 'active',
      ownerId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (currentUser) {
      try {
        await setDoc(doc(db, 'objects', id), newObj);
        await logAudit('crear_objeto', `Creó el objeto alquilable: ${newObj.name} con tarifa ${newObj.dailyRate} COP`, ownerId, 'RentalObject', id);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `objects/${id}`);
      }
    } else {
      setObjects(prev => [...prev, newObj]);
      await logAudit('crear_objeto', `Creó el objeto: ${newObj.name} con tarifa ${newObj.dailyRate} COP`, ownerId, 'RentalObject', id);
    }

    return id;
  };

  const updateObject = async (
    id: string,
    updates: Partial<Pick<RentalObject, 'name' | 'category' | 'dailyRate' | 'description' | 'licensePlateOrSerial'>>
  ): Promise<void> => {
    const existingObj = objects.find(o => o.id === id);
    if (!existingObj) throw new Error('Objeto no encontrado');

    const updatedData: RentalObject = {
      ...existingObj,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (currentUser) {
      try {
        await updateDoc(doc(db, 'objects', id), {
          ...updates,
          updatedAt: updatedData.updatedAt,
        });
        await logAudit('actualizar_objeto', `Actualizó información o tarifa de: ${existingObj.name} a ${updates.dailyRate ?? existingObj.dailyRate} COP`, ownerId, 'RentalObject', id);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `objects/${id}`);
      }
    } else {
      setObjects(prev => prev.map(o => o.id === id ? updatedData : o));
      await logAudit('actualizar_objeto', `Actualizó ${existingObj.name}`, ownerId, 'RentalObject', id);
    }
  };

  const archiveObject = async (id: string, archive: boolean): Promise<void> => {
    const existingObj = objects.find(o => o.id === id);
    if (!existingObj) throw new Error('Objeto no encontrado');

    const newStatus = archive ? 'archived' : 'active';
    const updatedAt = new Date().toISOString();

    if (currentUser) {
      try {
        await updateDoc(doc(db, 'objects', id), {
          status: newStatus,
          updatedAt,
        });
        await logAudit(
          archive ? 'archivar_objeto' : 'desarchivar_objeto',
          `${archive ? 'Archivó' : 'Reactivó'} el objeto ${existingObj.name} conservando todo su historial`,
          ownerId,
          'RentalObject',
          id
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `objects/${id}`);
      }
    } else {
      setObjects(prev => prev.map(o => o.id === id ? { ...o, status: newStatus, updatedAt } : o));
      await logAudit(archive ? 'archivar_objeto' : 'desarchivar_objeto', `${archive ? 'Archivó' : 'Reactivó'} ${existingObj.name}`, ownerId, 'RentalObject', id);
    }
  };

  const deleteObject = async (id: string, cascadeDeleteRentals: boolean = false): Promise<void> => {
    const existingObj = objects.find(o => o.id === id);
    if (!existingObj) throw new Error('Objeto no encontrado');

    const associatedRentals = rentals.filter(r => r.objectId === id);

    if (currentUser) {
      try {
        const batch = writeBatch(db);
        batch.delete(doc(db, 'objects', id));

        if (cascadeDeleteRentals && associatedRentals.length > 0) {
          associatedRentals.forEach(r => {
            batch.delete(doc(db, 'rentals', r.id));
          });
        }

        await batch.commit();
        await logAudit(
          'eliminar_objeto',
          `Eliminó permanentemente el objeto "${existingObj.name}" (${existingObj.category})${cascadeDeleteRentals && associatedRentals.length > 0 ? ` y sus ${associatedRentals.length} registros de alquiler` : ''}`,
          ownerId,
          'RentalObject',
          id
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `objects/${id}`);
      }
    } else {
      setObjects(prev => prev.filter(o => o.id !== id));
      if (cascadeDeleteRentals && associatedRentals.length > 0) {
        setRentals(prev => prev.filter(r => r.objectId !== id));
      }
      await logAudit(
        'eliminar_objeto',
        `Eliminó permanentemente el objeto "${existingObj.name}"`,
        ownerId,
        'RentalObject',
        id
      );
    }
  };

  // Rental Actions: Batch register multiple dates for an object
  const registerDailyRentals = async (params: {
    objectId: string;
    dates: string[];
    status: RentalStatus;
    personName?: string;
    notes?: string;
  }): Promise<{ addedCount: number; duplicateCount: number; duplicateDates: string[] }> => {
    const targetObject = objects.find(o => o.id === params.objectId);
    if (!targetObject) throw new Error('Objeto seleccionado no válido');

    const existingDatesSet = new Set(
      rentals.filter(r => r.objectId === params.objectId).map(r => r.date)
    );

    const duplicateDates: string[] = [];
    const datesToAdd: string[] = [];

    for (const d of params.dates) {
      if (existingDatesSet.has(d)) {
        duplicateDates.push(d);
      } else {
        datesToAdd.push(d);
      }
    }

    if (datesToAdd.length === 0) {
      return { addedCount: 0, duplicateCount: duplicateDates.length, duplicateDates };
    }

    const now = new Date().toISOString();
    const newRentals: DailyRental[] = datesToAdd.map(dateStr => {
      const [y, m, d] = dateStr.split('-').map(Number);
      return {
        id: `rnt_${params.objectId}_${dateStr}`,
        objectId: params.objectId,
        objectName: targetObject.name,
        date: dateStr,
        year: y,
        month: m,
        day: d,
        dailyRateSnapshot: targetObject.dailyRate, // Snapshot of current daily rate!
        status: params.status,
        paidAmount: 0,
        personName: params.personName || '',
        notes: params.notes || '',
        ownerId,
        createdAt: now,
        updatedAt: now,
      };
    });

    if (currentUser) {
      try {
        const batch = writeBatch(db);
        newRentals.forEach(r => {
          batch.set(doc(db, 'rentals', r.id), r);
        });
        await batch.commit();
        await logAudit(
          'registrar_fechas_alquiler',
          `Registró ${newRentals.length} fecha(s) para ${targetObject.name} en estado: ${params.status}`,
          ownerId,
          'DailyRental'
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'rentals');
      }
    } else {
      setRentals(prev => [...prev, ...newRentals]);
      await logAudit(
        'registrar_fechas_alquiler',
        `Registró ${newRentals.length} fecha(s) para ${targetObject.name}`,
        ownerId,
        'DailyRental'
      );
    }

    return {
      addedCount: newRentals.length,
      duplicateCount: duplicateDates.length,
      duplicateDates
    };
  };

  const updateRentalStatus = async (rentalId: string, newStatus: RentalStatus): Promise<void> => {
    const existing = rentals.find(r => r.id === rentalId);
    if (!existing) throw new Error('Alquiler no encontrado');

    const updatedAt = new Date().toISOString();

    if (currentUser) {
      try {
        await updateDoc(doc(db, 'rentals', rentalId), {
          status: newStatus,
          updatedAt
        });
        await logAudit('cambiar_estado_alquiler', `Cambió estado de ${existing.objectName} el ${existing.date} a ${newStatus}`, ownerId, 'DailyRental', rentalId);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `rentals/${rentalId}`);
      }
    } else {
      setRentals(prev => prev.map(r => r.id === rentalId ? { ...r, status: newStatus, updatedAt } : r));
      await logAudit('cambiar_estado_alquiler', `Cambió estado de ${existing.date} a ${newStatus}`, ownerId, 'DailyRental', rentalId);
    }
  };

  const deleteRental = async (rentalId: string): Promise<void> => {
    const existing = rentals.find(r => r.id === rentalId);
    if (!existing) throw new Error('Alquiler no encontrado');

    // Only allow deletion if no payment has been applied
    if (existing.paidAmount > 0) {
      throw new Error('No se puede eliminar un alquiler con abonos o pagos registrados.');
    }

    if (currentUser) {
      try {
        await deleteDoc(doc(db, 'rentals', rentalId));
        await logAudit('eliminar_alquiler', `Eliminó fecha de alquiler de ${existing.objectName} para ${existing.date}`, ownerId, 'DailyRental', rentalId);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `rentals/${rentalId}`);
      }
    } else {
      setRentals(prev => prev.filter(r => r.id !== rentalId));
      await logAudit('eliminar_alquiler', `Eliminó fecha ${existing.date} de ${existing.objectName}`, ownerId, 'DailyRental', rentalId);
    }
  };

  // Payment Actions: Create Receipt and Allocations
  const createPaymentReceipt = async (params: {
    receivedDate: string;
    totalAmount: number;
    personName?: string;
    paymentMethod: string;
    reference?: string;
    notes?: string;
    allocations: {
      rentalId: string;
      objectId: string;
      objectName: string;
      rentalDate: string;
      amountToApply: number;
    }[];
  }): Promise<string> => {
    const nextNum = settings?.nextReceiptNumber || (receipts.length + 1);
    const prefix = settings?.receiptPrefix || 'REC';
    const receiptNumber = formatReceiptNumber(prefix, nextNum);
    const receiptId = `rcp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    // Calculate total allocated
    const totalAllocated = params.allocations.reduce((sum, a) => sum + a.amountToApply, 0);
    const unallocatedAmount = Math.max(0, params.totalAmount - totalAllocated);

    const newReceipt: PaymentReceipt = {
      id: receiptId,
      receiptNumber,
      receivedDate: params.receivedDate,
      totalAmount: params.totalAmount,
      personName: params.personName || '',
      paymentMethod: params.paymentMethod,
      reference: params.reference || '',
      notes: params.notes || '',
      unallocatedAmount,
      ownerId,
      createdAt: now,
      updatedAt: now,
    };

    const newAllocations: PaymentAllocation[] = params.allocations.map((a, idx) => ({
      id: `alc_${receiptId}_${idx}`,
      receiptId,
      receiptNumber,
      rentalId: a.rentalId,
      objectId: a.objectId,
      objectName: a.objectName,
      rentalDate: a.rentalDate,
      allocatedAmount: a.amountToApply,
      ownerId,
      createdAt: now,
    }));

    if (currentUser) {
      try {
        const batch = writeBatch(db);

        // 1. Create Receipt
        batch.set(doc(db, 'receipts', receiptId), newReceipt);

        // 2. Create Allocations
        newAllocations.forEach(alc => {
          batch.set(doc(db, 'allocations', alc.id), alc);
        });

        // 3. Update DailyRentals with new paidAmount and status
        params.allocations.forEach(a => {
          const rental = rentals.find(r => r.id === a.rentalId);
          if (rental) {
            const newPaid = (rental.paidAmount || 0) + a.amountToApply;
            const newStatus: RentalStatus = newPaid >= rental.dailyRateSnapshot ? 'confirmed_paid' : 'confirmed_unpaid';
            batch.update(doc(db, 'rentals', a.rentalId), {
              paidAmount: newPaid,
              status: newStatus,
              updatedAt: now,
              // If rental person wasn't set, inherit from receipt
              ...(rental.personName ? {} : { personName: params.personName || '' })
            });
          }
        });

        // 4. Update Settings nextReceiptNumber
        if (settings) {
          batch.update(doc(db, 'settings', settings.id), {
            nextReceiptNumber: nextNum + 1,
            updatedAt: now,
          });
        }

        await batch.commit();
        await logAudit(
          'registrar_pago',
          `Registró recibo ${receiptNumber} por $${params.totalAmount.toLocaleString('es-CO')} COP (${params.paymentMethod}) distribuido en ${params.allocations.length} conceptos`,
          ownerId,
          'PaymentReceipt',
          receiptId
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'receipts');
      }
    } else {
      // Local state update
      setReceipts(prev => [newReceipt, ...prev]);
      setAllocations(prev => [...prev, ...newAllocations]);
      setRentals(prev => prev.map(r => {
        const match = params.allocations.find(a => a.rentalId === r.id);
        if (match) {
          const newPaid = (r.paidAmount || 0) + match.amountToApply;
          const newStatus: RentalStatus = newPaid >= r.dailyRateSnapshot ? 'confirmed_paid' : 'confirmed_unpaid';
          return {
            ...r,
            paidAmount: newPaid,
            status: newStatus,
            personName: r.personName || params.personName || '',
            updatedAt: now,
          };
        }
        return r;
      }));

      if (settings) {
        setSettings({
          ...settings,
          nextReceiptNumber: nextNum + 1,
          updatedAt: now,
        });
      }

      await logAudit(
        'registrar_pago',
        `Registró recibo ${receiptNumber} por $${params.totalAmount.toLocaleString('es-CO')} COP`,
        ownerId,
        'PaymentReceipt',
        receiptId
      );
    }

    return receiptId;
  };

  const updateSettings = async (updates: Partial<AppSettings>): Promise<void> => {
    if (!settings) return;
    const now = new Date().toISOString();
    const updated: AppSettings = {
      ...settings,
      ...updates,
      updatedAt: now,
    };

    if (currentUser) {
      try {
        await updateDoc(doc(db, 'settings', settings.id), {
          ...updates,
          updatedAt: now,
        });
        await logAudit('actualizar_ajustes', 'Actualizó configuración del negocio y numeración', ownerId, 'AppSettings', settings.id);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `settings/${settings.id}`);
      }
    } else {
      setSettings(updated);
      await logAudit('actualizar_ajustes', 'Actualizó configuración local', ownerId, 'AppSettings', settings.id);
    }
  };

  const clearAllData = async (): Promise<void> => {
    if (!currentUser) {
      setObjects([]);
      setRentals([]);
      setReceipts([]);
      setAllocations([]);
      setAuditLogs([]);
      return;
    }

    const uid = currentUser.uid;
    try {
      const batch = writeBatch(db);

      objects.forEach(o => batch.delete(doc(db, 'objects', o.id)));
      rentals.forEach(r => batch.delete(doc(db, 'rentals', r.id)));
      receipts.forEach(rc => batch.delete(doc(db, 'receipts', rc.id)));
      allocations.forEach(a => batch.delete(doc(db, 'allocations', a.id)));

      await batch.commit();

      setObjects([]);
      setRentals([]);
      setReceipts([]);
      setAllocations([]);

      await logAudit(
        'reiniciar_a_cero',
        'Se eliminaron todos los datos existentes para reiniciar la cuenta en cero.',
        uid
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'clearAll');
    }
  };

  // KPI Statistics calculations
  const stats = useMemo(() => {
    // Total received = sum of all receipts
    const totalReceived = receipts.reduce((sum, r) => sum + (r.totalAmount || 0), 0);

    // Total confirmed rental value: Only confirmed rentals generate debt / billing!
    // "No generes deudas por fechas cuyo alquiler no haya sido confirmado."
    const confirmedRentals = rentals.filter(r => r.status === 'confirmed_paid' || r.status === 'confirmed_unpaid');
    const totalConfirmedRentalValue = confirmedRentals.reduce((sum, r) => sum + (r.dailyRateSnapshot || 0), 0);

    // Total paid to date on confirmed rentals
    const totalPaidOnRentals = confirmedRentals.reduce((sum, r) => sum + (r.paidAmount || 0), 0);

    // Pending balance = total billed value minus paid amount
    const totalPendingBalance = Math.max(0, totalConfirmedRentalValue - totalPaidOnRentals);

    const paidDaysCount = rentals.filter(r => r.status === 'confirmed_paid').length;
    const confirmedUnpaidDaysCount = rentals.filter(r => r.status === 'confirmed_unpaid').length;
    const pendingDaysCount = rentals.filter(r => r.status === 'pending_confirmation').length;

    return {
      totalReceived,
      totalConfirmedRentalValue,
      totalPendingBalance,
      paidDaysCount,
      pendingDaysCount,
      confirmedUnpaidDaysCount,
    };
  }, [receipts, rentals]);

  return (
    <DataContext.Provider value={{
      objects,
      rentals,
      receipts,
      allocations,
      settings,
      auditLogs,
      loading,
      createObject,
      updateObject,
      archiveObject,
      deleteObject,
      registerDailyRentals,
      updateRentalStatus,
      deleteRental,
      createPaymentReceipt,
      updateSettings,
      clearAllData,
      stats,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
