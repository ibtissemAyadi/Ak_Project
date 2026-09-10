import { Link } from 'react-router-dom'
import { AlertCircle, ArrowRight, Calendar, Clock } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/shared/user-avatar'
import { EmptyState } from '@/components/shared/empty-state'
import { formatDate, formatRelativeTime } from '@/lib/formatters'
import type { Affaire, Facture, RecentActivity, UpcomingDeadline } from '@/types'

export function ProjectsInProgressPanel({ affaires }: { affaires: Affaire[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Projets en cours</CardTitle>
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" asChild>
          <Link to="/affaires">
            Voir tout <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {affaires.length === 0 ? (
          <EmptyState title="Aucun projet actif" className="border-0 py-6" />
        ) : (
          affaires.map((a) => (
            <Link key={a.id} to={`/affaires/${a.id}`} className="block space-y-1.5 rounded-md p-2 -mx-2 hover:bg-accent/50">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-foreground">{a.objet}</p>
                <span className="shrink-0 text-xs font-medium text-muted-foreground">{a.etatAvancement}%</span>
              </div>
              <Progress value={a.etatAvancement} className="h-1.5" />
              <p className="text-xs text-muted-foreground">
                {a.client.raisonSociale}
                {a.dateFinPrevue ? ` · Échéance ${formatDate(a.dateFinPrevue)}` : ''}
              </p>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  )
}

export function LateInvoicesPanel({ invoices }: { invoices: Facture[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Factures en retard</CardTitle>
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" asChild>
          <Link to="/factures">
            Voir tout <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-1">
        {invoices.length === 0 ? (
          <EmptyState title="Aucune facture en retard" description="Parfait ! Tout est à jour." className="border-0 py-6" />
        ) : (
          invoices.map((inv) => (
            <Link
              key={inv.id}
              to={`/factures/${inv.id}`}
              className="flex items-center justify-between gap-2 rounded-md p-2 -mx-2 hover:bg-accent/50"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{inv.numeroFacture}</p>
                  <p className="truncate text-xs text-muted-foreground">{inv.client.raisonSociale}</p>
                </div>
              </div>
              <span className="shrink-0 text-xs font-medium text-destructive">Échéance {formatDate(inv.dateEcheance)}</span>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  )
}

export function UpcomingDeadlinesPanel({ deadlines }: { deadlines: UpcomingDeadline[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Échéances à venir</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {deadlines.length === 0 ? (
          <EmptyState title="Rien à venir prochainement" className="border-0 py-6" icon={Calendar} />
        ) : (
          deadlines.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-2 rounded-md p-2 -mx-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{d.title}</p>
                  <p className="truncate text-xs capitalize text-muted-foreground">{d.type} · {d.owner}</p>
                </div>
              </div>
              <span className="shrink-0 text-xs font-medium text-muted-foreground">{formatDate(d.dueDate)}</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

export function RecentActivityPanel({ activities }: { activities: RecentActivity[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activité récente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.length === 0 ? (
          <EmptyState title="Aucune activité récente" className="border-0 py-6" icon={Clock} />
        ) : (
          activities.map((a) => (
            <div key={a.id} className="flex items-start gap-3">
              <UserAvatar name={a.actorName} avatarUrl={a.actorAvatarUrl} className="h-7 w-7" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">
                  <span className="font-medium">{a.actorName}</span> {a.action}{' '}
                  <span className="font-medium">{a.target}</span>
                </p>
                <p className="text-xs text-muted-foreground">{formatRelativeTime(a.createdAt)}</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
