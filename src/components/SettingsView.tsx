import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Settings, ShieldCheck, Database, Building2, Phone, Hash, Save, CheckCircle2, AlertTriangle, Trash2 } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, clearAllData } = useData();
  const { currentUser, signInWithGoogle, logout } = useAuth();

  const [businessName, setBusinessName] = useState(settings?.businessName || 'Alquileres y Rentas');
  const [phone, setPhone] = useState(settings?.phone || '300 123 4567');
  const [receiptPrefix, setReceiptPrefix] = useState(settings?.receiptPrefix || 'REC');
  const [nextReceiptNumber, setNextReceiptNumber] = useState(settings?.nextReceiptNumber || 1);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset to zero modal
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSaveSuccess(false);

    try {
      await updateSettings({
        businessName: businessName.trim(),
        phone: phone.trim(),
        receiptPrefix: receiptPrefix.trim().toUpperCase(),
        nextReceiptNumber: Number(nextReceiptNumber),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-emerald-600" />
          Configuración del Negocio & Base de Datos
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-1">
          Personaliza los datos de tu empresa, los comprobantes de caja y revisa la seguridad en la nube.
        </p>
      </div>

      {/* Cloud & Database Security Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Estado de la Base de Datos & Seguridad
            </h2>
            <p className="text-xs text-slate-500">
              Almacenamiento persistente en Google Cloud Firestore con Reglas de Acceso Desplegadas
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-slate-500 font-medium">Motor de Datos:</span>
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Firebase Firestore (Enterprise)
            </div>
            <p className="text-[11px] text-slate-400">
              Persistencia segura con sincronización en tiempo real.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-slate-500 font-medium">Reglas de Seguridad:</span>
            <div className="flex items-center gap-2 font-bold text-emerald-700">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              firestore.rules desplegadas y activas
            </div>
            <p className="text-[11px] text-slate-400">
              Aislamiento estricto por usuario y validación de tipos y rangos.
            </p>
          </div>
        </div>

        {/* User Account / Google Login Status */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-semibold text-slate-700">Cuenta de usuario activa: </span>
            {currentUser ? (
              <span className="font-bold text-emerald-700">
                {currentUser.displayName || currentUser.email} ({currentUser.email})
              </span>
            ) : (
              <span className="text-amber-700 font-semibold">
                Modo local / Invitado (Conecta Google para respaldar en tu nube privada)
              </span>
            )}
          </div>

          {currentUser ? (
            <button
              onClick={() => logout()}
              className="px-3 py-1.5 rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100 font-semibold self-start sm:self-auto"
            >
              Cerrar sesión
            </button>
          ) : (
            <button
              onClick={() => signInWithGoogle()}
              className="px-3 py-1.5 rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 font-semibold self-start sm:self-auto"
            >
              Conectar Google
            </button>
          )}
        </div>
      </div>

      {/* Business Details Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-800">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Datos Comerciales y Recibos
            </h2>
            <p className="text-xs text-slate-500">
              Información que aparecerá en los comprobantes de caja impresos y encabezados de Excel
            </p>
          </div>
        </div>

        {saveSuccess && (
          <div className="p-3 mb-4 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Configuración guardada correctamente.
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nombre comercial del negocio *
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Teléfono / WhatsApp de contacto
              </label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Prefijo para recibos de caja
              </label>
              <input
                type="text"
                maxLength={6}
                value={receiptPrefix}
                onChange={e => setReceiptPrefix(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono uppercase font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Siguiente número consecutivo de recibo
              </label>
              <input
                type="number"
                min={1}
                value={nextReceiptNumber}
                onChange={e => setNextReceiptNumber(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4 text-emerald-400" />
              {isSubmitting ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </div>
        </form>
      </div>

      {/* Danger Zone: Reset all data to zero */}
      <div className="bg-rose-50/50 rounded-2xl border border-rose-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-rose-950 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              Reiniciar Aplicación en Cero
            </h3>
            <p className="text-xs text-rose-800 mt-1 max-w-xl">
              Elimina de forma irreversible todos los objetos, fechas de alquiler registradas, recibos de pago y distribuciones de tu cuenta en Firestore para iniciar completamente desde cero.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Reiniciar Todo a Cero
          </button>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">
                ¿Estás seguro de reiniciar todo a cero?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Esta acción eliminará de inmediato todos tus objetos, alquileres, pagos y registros de la base de datos Firestore. La cuenta quedará completamente limpia en cero.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={async () => {
                  setIsResetting(true);
                  try {
                    await clearAllData();
                    setShowResetConfirm(false);
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setIsResetting(false);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold shadow-xs transition"
              >
                {isResetting ? 'Reiniciando...' : 'Sí, Eliminar y Reiniciar a Cero'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
