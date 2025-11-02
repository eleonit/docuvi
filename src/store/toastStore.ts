/**
 * Store para Toasts (Notificaciones)
 */

import { create } from 'zustand'
import type { ToastProps } from '@/components/base/Toast'

interface ToastStore {
  toasts: ToastProps[]
  addToast: (toast: Omit<ToastProps, 'id' | 'onClose'>) => void
  removeToast: (id: string) => void
  clearAll: () => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = Math.random().toString(36).substring(7)
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          ...toast,
          id,
          onClose: (id: string) => state.removeToast(id),
        },
      ],
    }))
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  },

  clearAll: () => {
    set({ toasts: [] })
  },
}))

// Helpers para uso fácil
export const toast = {
  success: (message: string, duration?: number) => {
    useToastStore.getState().addToast({ message, type: 'success', duration })
  },
  error: (message: string, duration?: number) => {
    useToastStore.getState().addToast({ message, type: 'error', duration })
  },
  warning: (message: string, duration?: number) => {
    useToastStore.getState().addToast({ message, type: 'warning', duration })
  },
  info: (message: string, duration?: number) => {
    useToastStore.getState().addToast({ message, type: 'info', duration })
  },
}
