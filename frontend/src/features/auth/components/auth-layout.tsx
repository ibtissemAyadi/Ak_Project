import type { ReactNode } from 'react'
import { BarChart3, ClipboardCheck, ShieldCheck } from 'lucide-react'

import { COMPANY_NAME } from '@/lib/constants'

interface AuthLayoutProps {
  children: ReactNode
  title: string
  subtitle: string
}

const HIGHLIGHTS = [
  { icon: ClipboardCheck, text: 'Track quotations, projects and invoices in one workspace' },
  { icon: BarChart3, text: 'Real-time KPIs and revenue insights across every client' },
  { icon: ShieldCheck, text: 'Role-based access control for your whole organization' },
]

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="grid min-h-svh grid-cols-1 lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary-900 p-10 text-white lg:flex bg-gradient-to-br from-primary-800 via-primary-900 to-slate-950">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,white,transparent_35%),radial-gradient(circle_at_80%_60%,white,transparent_30%)]" />
        <div className="relative z-10 flex items-center gap-2 text-lg font-semibold">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
            <ShieldCheck className="h-5 w-5" />
          </div>
          {COMPANY_NAME}
        </div>

        <div className="relative z-10 space-y-8 max-w-md">
          <h2 className="text-3xl font-semibold leading-tight">
            The enterprise workspace built for engineering consulting teams.
          </h2>
          <ul className="space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-primary-100">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/10">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-primary-200">© {new Date().getFullYear()} {COMPANY_NAME}. All rights reserved.</p>
      </div>

      <div className="flex items-center justify-center bg-background p-6 sm:p-10">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex items-center gap-2 text-lg font-semibold lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>
            {COMPANY_NAME}
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
