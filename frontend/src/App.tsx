import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppLayout } from '@/components/layout/app-layout'
import { ProtectedRoute } from '@/features/auth/components/protected-route'
import { LoginPage } from '@/features/auth/pages/login-page'
import { ForgotPasswordPage } from '@/features/auth/pages/forgot-password-page'
import { DashboardPage } from '@/features/dashboard/pages/dashboard-page'
import { useThemeStore } from '@/store/theme-store'

import { ClientsListPage } from '@/features/crm/pages/clients-list-page'
import { ClientDetailPage } from '@/features/crm/pages/client-detail-page'
import { ClientFormPage } from '@/features/crm/pages/client-form-page'

import { QuotationsListPage } from '@/features/quotations/pages/quotations-list-page'
import { QuotationDetailPage } from '@/features/quotations/pages/quotation-detail-page'
import { QuotationFormPage } from '@/features/quotations/pages/quotation-form-page'
import { QuotationsKanbanPage } from '@/features/quotations/pages/quotations-kanban-page'

import { ProjectsListPage } from '@/features/projects/pages/projects-list-page'
import { ProjectDetailPage } from '@/features/projects/pages/project-detail-page'

import { InvoicesListPage } from '@/features/invoices/pages/invoices-list-page'
import { InvoiceDetailPage } from '@/features/invoices/pages/invoice-detail-page'
import { InvoiceFormPage } from '@/features/invoices/pages/invoice-form-page'

import { PaymentsListPage } from '@/features/payments/pages/payments-list-page'
import { PaymentDetailPage } from '@/features/payments/pages/payment-detail-page'
import { PaymentRemindersPage } from '@/features/payments/pages/payment-reminders-page'

import { DocumentsPage } from '@/features/documents/pages/documents-page'

import { NotificationsPage } from '@/features/notifications/pages/notifications-page'
import { NotificationSettingsPage } from '@/features/notifications/pages/notification-settings-page'

import { UsersPage } from '@/features/admin/pages/users-page'
import { RolesPage } from '@/features/admin/pages/roles-page'
import { PermissionsPage } from '@/features/admin/pages/permissions-page'
import { ProfilePage } from '@/features/admin/pages/profile-page'
import { SettingsPage } from '@/features/admin/pages/settings-page'

import { NotFoundPage } from '@/pages/not-found-page'

export default function App() {
  const setMode = useThemeStore((s) => s.setMode)
  const mode = useThemeStore((s) => s.mode)

  useEffect(() => {
    setMode(mode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <TooltipProvider delayDuration={200}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />

            <Route path="/crm/clients" element={<ClientsListPage />} />
            <Route path="/crm/clients/new" element={<ClientFormPage />} />
            <Route path="/crm/clients/:clientId" element={<ClientDetailPage />} />
            <Route path="/crm/clients/:clientId/edit" element={<ClientFormPage />} />

            <Route path="/quotations" element={<QuotationsListPage />} />
            <Route path="/quotations/kanban" element={<QuotationsKanbanPage />} />
            <Route path="/quotations/new" element={<QuotationFormPage />} />
            <Route path="/quotations/:quotationId" element={<QuotationDetailPage />} />
            <Route path="/quotations/:quotationId/edit" element={<QuotationFormPage />} />

            <Route path="/projects" element={<ProjectsListPage />} />
            <Route path="/projects/:projectId" element={<ProjectDetailPage />} />

            <Route path="/invoices" element={<InvoicesListPage />} />
            <Route path="/invoices/new" element={<InvoiceFormPage />} />
            <Route path="/invoices/:invoiceId" element={<InvoiceDetailPage />} />

            <Route path="/payments" element={<PaymentsListPage />} />
            <Route path="/payments/reminders" element={<PaymentRemindersPage />} />
            <Route path="/payments/:paymentId" element={<PaymentDetailPage />} />

            <Route path="/documents" element={<DocumentsPage />} />

            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/notifications/settings" element={<NotificationSettingsPage />} />

            <Route path="/admin/users" element={<UsersPage />} />
            <Route path="/admin/roles" element={<RolesPage />} />
            <Route path="/admin/permissions" element={<PermissionsPage />} />
            <Route path="/admin/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </TooltipProvider>
  )
}
