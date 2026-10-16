import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { RentalObject, ObjectStatus } from '../types';
import { formatCOP } from '../utils/formatters';
import {
  Layers,
  Plus,
  Edit2,
  Archive,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  Info,
  DollarSign,
  AlertTriangle,
  Trash2
} from 'lucide-react';

export const ObjectsView: React.FC = () => {
  const { objects, createObject, updateObject, archiveObject, deleteObject, rentals } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingObject, setEditingObject] = useState<RentalObject | null>(null);

  // Delete Confirm Modal
  const [confirmDeleteObj, setConfirmDeleteObj] = useState<RentalObject | null>(null);
  const [cascadeDeleteRentals, setCascadeDeleteRentals] = useState<boolean>(true);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Motos');
  const [dailyRate, setDailyRate] = useState<number>(31000);
  const [licensePlateOrSerial, setLicensePlateOrSerial] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Archive Confirm Modal
  const [confirmArchiveObj, setConfirmArchiveObj] = useState<RentalObject | null>(null);

  const categories = ['Motos', 'Herramientas', 'Maquinaria', 'Vehículos', 'Equipos Eléctricos', 'Otro'];

  const openCreateModal = () => {
    setEditingObject(null);
    setName('');
    setCategory('Motos');
    setDailyRate(31000);
    setLicensePlateOrSerial('');
    setDescription('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (obj: RentalObject) => {
    setEditingObject(obj);
    setName(obj.name);
    setCategory(obj.category);
    setDailyRate(obj.dailyRate);
    setLicensePlateOrSerial(obj.licensePlateOrSerial || '');
    setDescription(obj.description || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('El nombre del objeto es obligatorio.');
      return;
    }
    if (isNaN(dailyRate) || dailyRate < 0) {
      setFormError('La tarifa diaria debe ser un número mayor o igual a 0 COP.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editingObject) {
        await updateObject(editingObject.id, {
          name: name.trim(),
          category,
          dailyRate,
          licensePlateOrSerial: licensePlateOrSerial.trim() || undefined,
          description: description.trim() || undefined,
        });
      } else {
        await createObject({
          name: name.trim(),
          category,
          dailyRate,
          licensePlateOrSerial: licensePlateOrSerial.trim() || undefined,
          description: description.trim() || undefined,
        });
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar el objeto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveToggle = async (obj: RentalObject) => {
    try {
      await archiveObject(obj.id, obj.status === 'active');
      setConfirmArchiveObj(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDeleteObj) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteObject(confirmDeleteObj.id, cascadeDeleteRentals);
      setConfirmDeleteObj(null);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Error al eliminar el objeto.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredObjects = objects.filter(obj => {
    const matchesSearch =
      obj.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      obj.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (obj.licensePlateOrSerial && obj.licensePlateOrSerial.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && obj.status === 'active') ||
      (statusFilter === 'archived' && obj.status === 'archived');

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-emerald-600" />
            Gestión de Objetos Alquilables
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Administra motos, herramientas, maquinaria y activos. Puedes editar sus tarifas sin alterar el historial pasado.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          Nuevo Objeto
        </button>
      </div>

      {/* Info notice about rate immutability */}
      <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/80 rounded-xl flex items-start gap-3 text-xs text-emerald-900">
        <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Protección de tarifas históricas:</span> Cuando modificas la tarifa diaria de un objeto, se aplica únicamente a las nuevas fechas registradas. Los alquileres y recibos anteriores conservan su valor original inmutable.
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por nombre, categoría o placa..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto self-end">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({objects.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Activos ({objects.filter(o => o.status === 'active').length})
          </button>
          <button
            onClick={() => setStatusFilter('archived')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              statusFilter === 'archived'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Archivados ({objects.filter(o => o.status === 'archived').length})
          </button>
        </div>
      </div>

      {/* Objects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {objects.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-8 sm:p-12 text-center col-span-full shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <Layers className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              No tienes objetos registrados aún
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-6">
              Tu aplicación ha iniciado completamente en cero. Registra tu primer activo alquilable (motos, herramientas, maquinaria, etc.) con su tarifa diaria en COP para comenzar a registrar fechas y pagos.
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Crear Primer Objeto
            </button>
          </div>
        ) : filteredObjects.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-400 col-span-full">
            No se encontraron objetos con los filtros aplicados.
          </div>
        ) : (
          filteredObjects.map(obj => {
            const objRentals = rentals.filter(r => r.objectId === obj.id);
            const totalDays = objRentals.length;
            const paidDays = objRentals.filter(r => r.status === 'confirmed_paid').length;
            const unpaidDays = objRentals.filter(r => r.status === 'confirmed_unpaid').length;
            const isArchived = obj.status === 'archived';

            return (
              <div
                key={obj.id}
                className={`bg-white rounded-2xl border p-5 transition shadow-xs flex flex-col justify-between ${
                  isArchived
                    ? 'border-slate-300 bg-slate-50/70 border-dashed'
                    : 'border-slate-200 hover:border-emerald-300'
                }`}
              >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {obj.category}
                    </span>
                    <h3 className="font-extrabold text-lg text-slate-900 mt-1">
                      {obj.name}
                    </h3>
                    {obj.licensePlateOrSerial && (
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        Ref / Placa: {obj.licensePlateOrSerial}
                      </p>
                    )}
                  </div>

                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      isArchived
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isArchived ? 'Archivado' : 'Activo'}
                  </span>
                </div>

                {obj.description && (
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                    {obj.description}
                  </p>
                )}

                {/* Rate showcase */}
                <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-medium text-slate-500">Tarifa actual por día:</span>
                  <div className="text-xl font-black text-slate-900">
                    {formatCOP(obj.dailyRate)}
                  </div>
                </div>

                {/* Rental History Stats */}
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="block font-bold text-slate-800">{totalDays}</span>
                    <span className="text-[10px] text-slate-400">Total días</span>
                  </div>
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <span className="block font-bold text-emerald-700">{paidDays}</span>
                    <span className="text-[10px] text-emerald-600">Pagados</span>
                  </div>
                  <div className="p-2 bg-rose-50 rounded-lg">
                    <span className="block font-bold text-rose-700">{unpaidDays}</span>
                    <span className="text-[10px] text-rose-600">Sin pagar</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-1 flex-wrap">
                <button
                  onClick={() => openEditModal(obj)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                  title="Editar nombre, tarifa o datos"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Editar
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setConfirmArchiveObj(obj)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition ${
                      isArchived
                        ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        : 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                    }`}
                    title={isArchived ? "Reactivar objeto" : "Archivar (ocultar manteniendo historial)"}
                  >
                    {isArchived ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" /> Reactivar
                      </>
                    ) : (
                      <>
                        <Archive className="w-3.5 h-3.5" /> Archivar
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setConfirmDeleteObj(obj);
                      setCascadeDeleteRentals(true);
                      setDeleteError(null);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 transition"
                    title="Eliminar objeto permanentemente"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          );
        }))}
      </div>

      {/* Modal: Create / Edit Object */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              {editingObject ? 'Editar Objeto Alquilable' : 'Registrar Nuevo Objeto'}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Ingresa los datos del activo y su tarifa diaria habitual en pesos colombianos.
            </p>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nombre del objeto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Moto 4, Taladro Percutor, Camión..."
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Categoría
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tarifa diaria (COP) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      required
                      min={0}
                      step={500}
                      value={dailyRate}
                      onChange={e => setDailyRate(parseFloat(e.target.value) || 0)}
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Placa, Serial o Identificador (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: ABC-12D o SER-9981"
                  value={licensePlateOrSerial}
                  onChange={e => setLicensePlateOrSerial(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Descripción o Notas (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre el objeto, estado o condiciones..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                >
                  {isSubmitting ? 'Guardando...' : editingObject ? 'Guardar Cambios' : 'Crear Objeto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Archive */}
      {confirmArchiveObj && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {confirmArchiveObj.status === 'active' ? '¿Archivar este objeto?' : '¿Reactivar objeto?'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {confirmArchiveObj.status === 'active'
                ? `Al archivar "${confirmArchiveObj.name}", no aparecerá en el registro rápido de nuevos alquileres, pero todo su historial de fechas, pagos y saldos permanecerá intacto y disponible en reportes.`
                : `"${confirmArchiveObj.name}" volverá a estar disponible para nuevos alquileres.`}
            </p>

            <div className="flex items-center justify-end gap-2 text-xs">
              <button
                onClick={() => setConfirmArchiveObj(null)}
                className="px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleArchiveToggle(confirmArchiveObj)}
                className={`px-4 py-2 rounded-xl text-white font-bold ${
                  confirmArchiveObj.status === 'active'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {confirmArchiveObj.status === 'active' ? 'Confirmar Archivo' : 'Reactivar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Permanent Deletion */}
      {confirmDeleteObj && (() => {
        const objRentals = rentals.filter(r => r.objectId === confirmDeleteObj.id);
        const totalPaidOnObj = objRentals.reduce((sum, r) => sum + (r.paidAmount || 0), 0);
        const confirmedRentals = objRentals.filter(r => r.status === 'confirmed_paid' || r.status === 'confirmed_unpaid');
        const totalBilled = confirmedRentals.reduce((sum, r) => sum + r.dailyRateSnapshot, 0);
        const pendingDebt = Math.max(0, totalBilled - totalPaidOnObj);

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    ¿Eliminar permanentemente este objeto?
                  </h3>
                  <p className="text-xs text-slate-500">
                    Estás a punto de borrar "{confirmDeleteObj.name}" de la base de datos.
                  </p>
                </div>
              </div>

              {deleteError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800">
                  {deleteError}
                </div>
              )}

              {/* Object Stats Summary */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Objeto:</span>
                  <span className="font-bold text-slate-900">{confirmDeleteObj.name} ({confirmDeleteObj.category})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tarifa actual:</span>
                  <span className="font-bold text-slate-900">{formatCOP(confirmDeleteObj.dailyRate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Días de alquiler registrados:</span>
                  <span className="font-bold text-slate-900">{objRentals.length} día(s)</span>
                </div>
                {totalPaidOnObj > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total cobrado en este objeto:</span>
                    <span className="font-bold text-emerald-700">{formatCOP(totalPaidOnObj)}</span>
                  </div>
                )}
                {pendingDebt > 0 && (
                  <div className="flex justify-between border-t border-slate-200 pt-1 text-rose-700 font-bold">
                    <span>Saldo pendiente asociado:</span>
                    <span>{formatCOP(pendingDebt)}</span>
                  </div>
                )}
              </div>

              {/* Cascade delete toggle if has rentals */}
              {objRentals.length > 0 && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-2">
                  <label className="flex items-start gap-2 cursor-pointer font-semibold">
                    <input
                      type="checkbox"
                      checked={cascadeDeleteRentals}
                      onChange={e => setCascadeDeleteRentals(e.target.checked)}
                      className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                    />
                    <span>
                      Eliminar también los {objRentals.length} días de alquiler asociados a este objeto para evitar registros huérfanos.
                    </span>
                  </label>
                </div>
              )}

              {/* Archiving recommendation note */}
              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/70 text-[11px] text-blue-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Recomendación:</strong> Si solo quieres que el objeto no aparezca para nuevos alquileres, te recomendamos <strong>Archivarlo</strong> para no alterar los libros contables anteriores.
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    handleArchiveToggle(confirmDeleteObj);
                    setConfirmDeleteObj(null);
                  }}
                  className="w-full sm:w-auto px-3 py-2 rounded-xl text-amber-800 bg-amber-100 hover:bg-amber-200 font-bold transition text-center"
                >
                  <Archive className="w-3.5 h-3.5 inline mr-1" />
                  Solo Archivar
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteObj(null)}
                    className="px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleDeleteConfirm}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold shadow-xs transition"
                  >
                    {isDeleting ? 'Eliminando...' : 'Eliminar Objeto'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
