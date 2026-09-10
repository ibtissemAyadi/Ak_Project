import type { ReactNode } from 'react'
import { Compass, Info, Mail, Phone, Settings2, ShieldCheck, Users } from 'lucide-react'

import { COMPANY_NAME } from '@/lib/constants'

interface AuthLayoutProps {
  children: ReactNode
  title: string
  subtitle: string
}

const ABOUT_CARDS = [
  {
    icon: Compass,
    title: 'Notre expertise',
    text: "Conseil et ingénierie sur des projets techniques complexes.",
  },
  {
    icon: Settings2,
    title: 'Solutions sur mesure',
    text: "Conception, optimisation et mise en œuvre adaptées à chaque client.",
  },
  {
    icon: ShieldCheck,
    title: 'Fiabilité',
    text: 'Des solutions performantes, pensées pour durer.',
  },
]

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="grid min-h-svh grid-cols-1 font-brand lg:grid-cols-12">
      <div className="relative hidden flex-col justify-between overflow-y-auto bg-primary p-16 text-primary-foreground lg:col-span-7 lg:flex">
        <img src="/ak_logo.png" alt={COMPANY_NAME} className="h-16 w-auto self-start animate-fade-in-up" />

        <div className="max-w-md space-y-10 animate-fade-in-up [animation-delay:80ms]">
          <div className="space-y-3">
            <h2 className="font-display text-page-title font-normal leading-tight">Bienvenue sur la plateforme interne A&K conseil et ingénierie</h2>
            <p className="text-sm font-medium text-primary-foreground/90">
            </p>
            <p className="text-sm leading-relaxed text-primary-foreground/80">
              Centralisez la gestion de vos clients, devis, affaires, documents, paiements et outils d'assistance IA
              dans un espace sécurisé.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Info className="h-4 w-4" />
              À propos de nous
            </h3>
            <div className="space-y-2.5">
              {ABOUT_CARDS.map(({ icon: Icon, title: cardTitle, text }) => (
                <div key={cardTitle} className="flex items-start gap-3 rounded-xl bg-white/10 p-3.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium leading-none">{cardTitle}</p>
                    <p className="text-xs leading-snug text-primary-foreground/75">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4" />
              Rejoignez-nous
            </h3>
            <p className="text-sm font-medium text-primary-foreground/90">Contactez-nous</p>
            <ul className="space-y-1.5">
              <li>
                <a
                  href="mailto:contact@ak-ingenierie.fr"
                  className="flex items-center gap-2 text-sm text-primary-foreground/80 transition-colors duration-300 hover:text-primary-foreground hover:underline"
                >
                  <Mail className="h-4 w-4 shrink-0" />
                  contact@ak-ingenierie.fr
                </a>
              </li>
              <li>
                <a
                  href="tel:+33760105589"
                  className="flex items-center gap-2 text-sm text-primary-foreground/80 transition-colors duration-300 hover:text-primary-foreground hover:underline"
                >
                  <Phone className="h-4 w-4 shrink-0" />
                  +33 7 60 10 55 89
                </a>
              </li>
            </ul>
          </div>
        </div>

        <svg
          className="pointer-events-none absolute inset-x-0 bottom-14 h-28 w-full opacity-[0.07]"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          fill="none"
          aria-hidden="true"
        >
          <path d="M0,64 C240,120 480,0 720,32 C960,64 1200,128 1440,80 L1440,120 L0,120 Z" fill="white" />
        </svg>
        <p className="relative mt-auto pt-6 text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} {COMPANY_NAME}. Tous droits réservés.
        </p>
      </div>

      <div className="flex items-center justify-center bg-muted/60 p-6 sm:p-10 lg:col-span-5">
        <div className="w-full max-w-[450px] rounded-[20px] border border-border/60 bg-card p-8 shadow-xl sm:p-12">
          <img src="/ak_logo.png" alt={COMPANY_NAME} className="mb-8 h-14 w-auto lg:hidden" />
          <div className="space-y-2">
            <h1 className="font-display text-section-title font-normal tracking-tight text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  )
}
