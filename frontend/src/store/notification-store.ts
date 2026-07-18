import { create } from 'zustand'

import type { AppNotification } from '@/types'
import { MOCK_NOTIFICATIONS } from '@/mocks/data/notifications'

interface NotificationState {
  notifications: AppNotification[]
  unreadCount: number
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  dismiss: (id: string) => void
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: MOCK_NOTIFICATIONS,
  unreadCount: MOCK_NOTIFICATIONS.filter((n) => !n.read).length,
  markAsRead: (id) => {
    const notifications = get().notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    set({ notifications, unreadCount: notifications.filter((n) => !n.read).length })
  },
  markAllAsRead: () => {
    const notifications = get().notifications.map((n) => ({ ...n, read: true }))
    set({ notifications, unreadCount: 0 })
  },
  dismiss: (id) => {
    const notifications = get().notifications.filter((n) => n.id !== id)
    set({ notifications, unreadCount: notifications.filter((n) => !n.read).length })
  },
}))
