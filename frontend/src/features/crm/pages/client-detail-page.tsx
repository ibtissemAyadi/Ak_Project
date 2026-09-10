import { useNavigate, useParams } from 'react-router-dom'
import { Building2, Globe2, Mail, MapPin, Pencil, Phone } from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { ErrorState } from '@/components/shared/error-state'
import { DetailSkeleton } from '@/components/shared/loading-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAsync } from '@/hooks/use-async'
import { useAuthStore } from '@/store/auth-store'
import { hasPermission } from '@/lib/permissions'
import { clientsService } from '@/services/clients-service'
import { CLIENT_STATUS_META } from '@/lib/constants'
import { formatDate } from '@/lib/formatters'

export function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const canEdit = hasPermission(user, 'clients', 'modification')

  const { data: client, isLoading, error, refetch } = useAsync(
    () => clientsService.getById(clientId!),
    [clientId],
  )

  if (isLoading) return <DetailSkeleton />
  if (error || !client) return <ErrorState onRetry={refetch} description="Impossible de charger ce client." />

  return (
    <div className="space-y-6">
      <PageHeader
        title={client.raisonSociale}
        description={client.matriculeFiscal || undefined}
        actions={
          canEdit ? (
            <Button variant="outline" className="gap-2" onClick={() => navigate(`/crm/clients/${client.id}/edit`)}>
              <Pencil className="h-4 w-4" />
              Modifier
            </Button>
          ) : null
        }
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Aperçu</CardTitle>
          <StatusBadge status={client.statut} meta={CLIENT_STATUS_META} />
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoRow icon={Mail} label="Email" value={client.email || '—'} />
          <InfoRow icon={Phone} label="Téléphone" value={client.telephone || '—'} />
          <InfoRow icon={MapPin} label="Adresse" value={client.adresse || '—'} />
          <InfoRow icon={Globe2} label="Pays" value={client.pays || '—'} />
          <InfoRow icon={Building2} label="Secteur" value={client.secteurActivite || '—'} />
          <InfoRow icon={Building2} label="Matricule fiscal" value={client.matriculeFiscal || '—'} />
          <InfoRow icon={Building2} label="Client depuis" value={formatDate(client.dateCreation)} />
        </CardContent>
      </Card>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  )
}
