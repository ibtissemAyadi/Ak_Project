import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Trash2, UserPlus } from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useAsync } from '@/hooks/use-async'
import { adminRolesService, adminUsersService } from '@/services/admin-api'
import { userColumns } from '@/features/admin/components/user-columns'
import type { AuthUser } from '@/types'

const STATUT_OPTIONS = ['Actif', 'Suspendu', 'Desactive'] as const
const STATUT_LABELS: Record<(typeof STATUT_OPTIONS)[number], string> = {
  Actif: 'Actif',
  Suspendu: 'Suspendu',
  Desactive: 'Désactivé',
}

const createSchema = z.object({
  nom: z.string().min(1, 'Requis'),
  prenom: z.string().min(1, 'Requis'),
  email: z.string().email('Saisissez un email valide'),
  password: z.string().min(8, 'Au moins 8 caractères'),
  role: z.string().min(1, 'Sélectionnez un rôle'),
  coutHoraire: z.number().min(0).optional(),
})

type CreateFormValues = z.infer<typeof createSchema>

const editSchema = z.object({
  role: z.string().min(1, 'Sélectionnez un rôle'),
  statut: z.enum(STATUT_OPTIONS),
})

type EditFormValues = z.infer<typeof editSchema>

export function UsersPage() {
  const { data, isLoading, error, refetch } = useAsync(() => adminUsersService.list(), [])
  const { data: roles } = useAsync(() => adminRolesService.list(), [])
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<AuthUser | null>(null)
  const [deleteUser, setDeleteUser] = useState<AuthUser | null>(null)

  const createForm = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { nom: '', prenom: '', email: '', password: '', role: '', coutHoraire: 0 },
  })

  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    values: editUser ? { role: editUser.role.id, statut: editUser.statut } : undefined,
  })

  const onCreateSubmit = async (values: CreateFormValues) => {
    try {
      await adminUsersService.create(values)
      toast.success(`Utilisateur ${values.email} créé avec succès.`)
      createForm.reset()
      setCreateOpen(false)
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de créer l'utilisateur.")
    }
  }

  const onEditSubmit = async (values: EditFormValues) => {
    if (!editUser) return
    try {
      await adminUsersService.update(editUser.id, values)
      toast.success('Utilisateur modifié avec succès.')
      setEditUser(null)
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de modifier l'utilisateur.")
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utilisateurs"
        description="Gérez les membres de l'équipe, leurs rôles et leurs accès à la plateforme."
        actions={
          <Button className="gap-2" onClick={() => setCreateOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Nouvel utilisateur
          </Button>
        }
      />

      <DataTable
        columns={userColumns}
        data={data ?? []}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        searchPlaceholder="Rechercher un utilisateur…"
        onRowClick={(row) => setEditUser(row)}
        emptyTitle="Aucun utilisateur pour l'instant"
        emptyActionLabel="Nouvel utilisateur"
        onEmptyAction={() => setCreateOpen(true)}
      />

      {/* Créer un utilisateur */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un nouvel utilisateur</DialogTitle>
            <DialogDescription>
              Le backend n'a pas encore de flux d'invitation par email — le compte est créé directement avec le mot de passe ci-dessous.
            </DialogDescription>
          </DialogHeader>

          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={createForm.control}
                  name="prenom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prénom</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="nom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={createForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="name@ak-consulting.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={createForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rôle</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez un rôle" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(roles ?? []).map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.libelle}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="coutHoraire"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coût horaire (€)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={createForm.formState.isSubmitting}>
                  {createForm.formState.isSubmitting ? 'Création…' : "Créer l'utilisateur"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modifier un utilisateur (rôle / statut) */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editUser ? `${editUser.prenom} ${editUser.nom}` : ''}</DialogTitle>
            <DialogDescription>Modifiez le rôle ou le statut du compte de cet utilisateur.</DialogDescription>
          </DialogHeader>

          {editUser ? (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rôle</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(roles ?? []).map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.libelle}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="statut"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Statut</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {STATUT_OPTIONS.map((statut) => (
                            <SelectItem key={statut} value={statut}>
                              {STATUT_LABELS[statut]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="sm:justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    className="gap-2 text-destructive hover:text-destructive"
                    onClick={() => setDeleteUser(editUser)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Supprimer l'utilisateur
                  </Button>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setEditUser(null)}>
                      Annuler
                    </Button>
                    <Button type="submit" disabled={editForm.formState.isSubmitting}>
                      {editForm.formState.isSubmitting ? 'Enregistrement…' : 'Enregistrer les modifications'}
                    </Button>
                  </div>
                </DialogFooter>
              </form>
            </Form>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteUser}
        onOpenChange={(open) => !open && setDeleteUser(null)}
        title="Supprimer l'utilisateur"
        description={`Êtes-vous sûr de vouloir supprimer ${deleteUser?.prenom} ${deleteUser?.nom} ? Cette action est irréversible.`}
        confirmLabel="Supprimer l'utilisateur"
        onConfirm={async () => {
          if (!deleteUser) return
          await adminUsersService.remove(deleteUser.id)
          toast.success('Utilisateur supprimé.')
          setDeleteUser(null)
          setEditUser(null)
          refetch()
        }}
      />
    </div>
  )
}
