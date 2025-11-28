/**
 * Página de Ajustes del Revisor
 */

'use client'

import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/base'

export default function AjustesRevisorPage() {
  const { theme, toggleTheme } = useTheme()
  const { usuario } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ajustes</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Configura tus preferencias y personaliza tu experiencia
        </p>
      </div>

      {/* Información del Usuario */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Información del Perfil
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Nombre
              </label>
              <p className="mt-1 text-gray-900 dark:text-white">{usuario?.nombre}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Correo Electrónico
              </label>
              <p className="mt-1 text-gray-900 dark:text-white">{usuario?.correo}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Rol
              </label>
              <p className="mt-1 text-gray-900 dark:text-white capitalize">
                {usuario?.rol}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Apariencia */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Apariencia
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Modo Oscuro
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Cambia entre tema claro y oscuro
                </p>
              </div>
              <button
                onClick={toggleTheme}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                  theme === 'dark' ? 'bg-primary-600' : 'bg-gray-200'
                }`}
                aria-label="Toggle dark mode"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Preview del tema actual */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                Vista previa
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <div className="h-2 w-12 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                  <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                  <div className="h-2 w-12 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                  <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Notificaciones */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Notificaciones
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Notificaciones en la Plataforma
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Recibe alertas dentro de la aplicación
                </p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Alertas de Documentos Pendientes
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Notificar cuando hay documentos por revisar
                </p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
