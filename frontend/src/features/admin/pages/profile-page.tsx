import { PageHeader } from '@/components/shared/page-header'
import { UserAvatar } from '@/components/shared/user-avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/auth-store'
import { formatCurrency, formatDate } from '@/lib/formatters'

const STATUT_VARIANT: Record<string, 'success' | 'warning' | 'muted'> = {
  Actif: 'success',
  Suspendu: 'warning',
  Desactive: 'muted',
}

const STATUT_LABELS: Record<string, string> = {
  Actif: 'Actif',
  Suspendu: 'Suspendu',
  Desactive: 'Désactivé',
}

export function ProfilePage() {
  const user = useAuthStore((s) => s.user)

  if (!user) return null

  const fullName = `${user.prenom} ${user.nom}`

  return (
    <div className="space-y-6">
      <PageHeader title="Mon profil" description="Les informations de votre compte, telles qu'enregistrées sur le serveur." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <UserAvatar name={fullName} className="h-20 w-20 text-lg" />
            <div>
              <p className="text-sm font-semibold text-foreground">{fullName}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <Badge variant="secondary">{user.role.libelle}</Badge>
            <div className="w-full space-y-1 border-t border-border pt-3 text-left text-xs text-muted-foreground">
              <p>
                Statut : <Badge variant={STATUT_VARIANT[user.statut] ?? 'muted'} className="ml-1">{STATUT_LABELS[user.statut] ?? user.statut}</Badge>
              </p>
              <p>Membre depuis le {formatDate(user.dateCreation)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Informations du compte</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoRow label="Prénom" value={user.prenom} />
            <InfoRow label="Nom" value={user.nom} />
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="Rôle" value={user.role.libelle} />
            <InfoRow label="Coût horaire" value={formatCurrency(user.coutHoraire)} />
            <InfoRow label="Statut" value={STATUT_LABELS[user.statut] ?? user.statut} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}
