import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Building2,
  Globe,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Trash2,
} from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { Timeline } from '@/components/shared/timeline'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { DetailSkeleton } from '@/components/shared/loading-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { UserAvatar } from '@/components/shared/user-avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAsync } from '@/hooks/use-async'
import { clientsService } from '@/services/clients-service'
import { contactsService, clientHistoryService } from '@/services/contacts-service'
import { CLIENT_STATUS_META } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { toast } from 'sonner'

export function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const navigate = useNavigate()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data: client, isLoading, error, refetch } = useAsync(
    () => clientsService.getById(clientId!),
    [clientId],
  )
  const { data: contacts, isLoading: contactsLoading } = useAsync(
    () => contactsService.listByClient(clientId!),
    [clientId],
  )
  const { data: history, isLoading: historyLoading } = useAsync(
    () => clientHistoryService.listByClient(clientId!),
    [clientId],
  )

  if (isLoading) return <DetailSkeleton />
  if (error || !client) return <ErrorState onRetry={refetch} description="We could not load this client." />

  return (
    <div className="space-y-6">
      <PageHeader
        title={client.name}
        description={`${client.industry} · ${client.city}, ${client.country}`}
        actions={
          <>
            <Button variant="outline" className="gap-2" onClick={() => navigate(`/crm/clients/${client.id}/edit`)}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            <Button variant="outline" className="gap-2 text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Overview</CardTitle>
            <StatusBadge status={client.status} meta={CLIENT_STATUS_META} />
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoRow icon={Mail} label="Email" value={client.email} />
            <InfoRow icon={Phone} label="Phone" value={client.phone} />
            <InfoRow icon={Globe} label="Website" value={client.website ?? '—'} />
            <InfoRow icon={MapPin} label="Address" value={`${client.address}, ${client.city}`} />
            <InfoRow icon={Building2} label="Account Manager" value={client.accountManagerName} />
            <InfoRow icon={Building2} label="Tax ID" value={client.taxId ?? '—'} />
            <div className="sm:col-span-2 flex flex-wrap gap-1.5 pt-1">
              {client.tags.map((tag) => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-1">
              <Metric label="Total Revenue" value={formatCurrency(client.totalRevenue)} />
              <Metric label="Open Quotations" value={String(client.openQuotations)} />
              <Metric label="Active Projects" value={String(client.activeProjects)} />
              <Metric label="Client Since" value={formatDate(client.createdAt)} />
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="contacts">
        <TabsList>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Contacts</CardTitle>
              <Button size="sm" className="gap-1.5" onClick={() => toast.info('Contact creation form would open here.')}>
                <Plus className="h-3.5 w-3.5" />
                Add Contact
              </Button>
            </CardHeader>
            <CardContent>
              {contactsLoading ? (
                <DetailSkeleton />
              ) : !contacts || contacts.length === 0 ? (
                <EmptyState title="No contacts yet" description="Add a contact person for this client." />
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {contacts.map((contact) => (
                    <div key={contact.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                      <UserAvatar name={`${contact.firstName} ${contact.lastName}`} className="h-10 w-10" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-foreground">
                            {contact.firstName} {contact.lastName}
                          </p>
                          {contact.isPrimary ? <Badge variant="info">Primary</Badge> : null}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{contact.jobTitle}</p>
                        <p className="truncate text-xs text-muted-foreground">{contact.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Client History</CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <DetailSkeleton />
              ) : !history || history.length === 0 ? (
                <EmptyState title="No history yet" description="Interactions with this client will appear here." />
              ) : (
                <Timeline
                  entries={history.map((h) => ({
                    id: h.id,
                    title: h.title,
                    description: `${h.description} — ${h.authorName}`,
                    timestamp: h.createdAt,
                  }))}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete client"
        description={`Are you sure you want to delete ${client.name}? This action cannot be undone.`}
        confirmLabel="Delete client"
        onConfirm={async () => {
          await clientsService.remove(client.id)
          toast.success('Client deleted.')
          navigate('/crm/clients')
        }}
      />
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}
