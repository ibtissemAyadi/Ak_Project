import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useController, useFieldArray, useForm, useWatch, type Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { FilterSelect } from '@/components/shared/filter-select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
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
import { useAuthStore } from '@/store/auth-store'
import { hasPermission } from '@/lib/permissions'
import { ApiHttpError } from '@/lib/api-http'
import { devisService } from '@/services/devis-service'
import { clientsService } from '@/services/clients-service'
import { devisColumns } from '@/features/quotations/components/devis-columns'
import { DEVIS_STATUT_META } from '@/lib/constants'
import { formatCurrency } from '@/lib/formatters'
import type { DevisTypeValeur } from '@/types'

const schema = z.object({
  client: z.string().min(1, 'Sélectionnez un client'),
  chargeAffaires: z.string().min(1, 'Sélectionnez un chargé d\'affaires'),
  objet: z.string().min(2, "L'objet est requis"),
  tauxTvaDefaut: z.number().min(0).max(100),
  dateValidite: z.string().optional(),
  typeMarge: z.enum(['pourcentage', 'valeur']),
  valeurMarge: z.number().min(0),
  typeRemise: z.enum(['pourcentage', 'valeur']),
  valeurRemise: z.number().min(0),
  lignes: z.array(z.object({
    description: z.string(),
    quantite: z.number().optional(),
    prixUnitaire: z.number().optional(),
    montant: z.number().optional(),
  })).optional(),
})

type FormValues = z.infer<typeof schema>

export function QuotationsListPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const canCreate = hasPermission(user, 'devis', 'creation')

  const { data, isLoading, error, refetch } = useAsync(() => devisService.list(), [])
  const [statusFilter, setStatusFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data: clients } = useAsync(() => clientsService.list(), [])
  const { data: intervenants } = useAsync(() => devisService.intervenants(), [])

  const filtered = useMemo(() => {
    if (!data) return []
    return data.filter((d) => statusFilter === 'all' || d.statut === statusFilter)
  }, [data, statusFilter])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      client: '',
      chargeAffaires: '',
      objet: '',
      tauxTvaDefaut: 0,
      dateValidite: '',
      typeMarge: 'pourcentage',
      valeurMarge: 0,
      typeRemise: 'pourcentage',
      valeurRemise: 0,
      lignes: [],
    },
  })

  const lignesArray = useFieldArray({ control: form.control, name: 'lignes' })

  const onSubmit = async (values: FormValues) => {
    try {
      const created = await devisService.create({
        client: values.client,
        chargeAffaires: values.chargeAffaires,
        objet: values.objet,
        tauxTvaDefaut: values.tauxTvaDefaut,
        dateValidite: values.dateValidite || undefined,
        typeMarge: values.typeMarge,
        valeurMarge: values.valeurMarge,
        typeRemise: values.typeRemise,
        valeurRemise: values.valeurRemise,
      })

      const lignesRenseignees = (values.lignes ?? []).filter((l) => l.description.trim())
      for (const ligne of lignesRenseignees) {
        try {
          await devisService.addLigne(created.id, ligne)
        } catch {
          toast.error(`Devis créé, mais la ligne "${ligne.description}" n'a pas pu être ajoutée.`)
        }
      }

      toast.success('Devis créé avec succès.')
      setDialogOpen(false)
      form.reset()
      navigate(`/devis/${created.id}`)
    } catch (err) {
      const message = err instanceof ApiHttpError ? err.message : "Une erreur est survenue lors de la création du devis."
      toast.error(message)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Devis"
        description="Suivez et gérez les devis tout au long de leur cycle de vie."
        actions={
          canCreate ? (
            <Button className="gap-2" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Nouveau devis
            </Button>
          ) : null
        }
      />

      <DataTable
        columns={devisColumns}
        data={filtered}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        searchPlaceholder="Rechercher un devis…"
        onRowClick={(row) => navigate(`/devis/${row.id}`)}
        emptyTitle="Aucun devis pour l'instant"
        emptyDescription="Créez votre premier devis pour commencer."
        emptyActionLabel={canCreate ? 'Nouveau devis' : undefined}
        onEmptyAction={canCreate ? () => setDialogOpen(true) : undefined}
        toolbar={
          <FilterSelect
            label="Statut"
            value={statusFilter}
            onChange={setStatusFilter}
            options={Object.entries(DEVIS_STATUT_META).map(([value, meta]) => ({ value, label: meta.label }))}
          />
        }
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[95vh]">
          <DialogHeader>
            <DialogTitle>Nouveau devis</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="client"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez un client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(clients ?? []).map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.raisonSociale}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="chargeAffaires"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chargé d'affaires</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez un chargé d'affaires" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(intervenants ?? []).map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.prenom} {u.nom}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="objet"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Objet</FormLabel>
                    <FormControl>
                      <Input placeholder="Étude sismique - Bâtiment A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tauxTvaDefaut"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>TVA par défaut (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dateValidite"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valable jusqu'au</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3 rounded-lg border border-border p-3">
                  <p className="text-sm font-medium text-foreground">Marge (optionnel)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="typeMarge"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Type</FormLabel>
                          <Select value={field.value} onValueChange={(v) => field.onChange(v as DevisTypeValeur)}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pourcentage">Pourcentage</SelectItem>
                              <SelectItem value="valeur">Valeur (€)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="valeurMarge"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Valeur</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              value={field.value}
                              onChange={(e) => field.onChange(e.target.valueAsNumber)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border border-border p-3">
                  <p className="text-sm font-medium text-foreground">Remise (optionnel)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="typeRemise"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Type</FormLabel>
                          <Select value={field.value} onValueChange={(v) => field.onChange(v as DevisTypeValeur)}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pourcentage">Pourcentage</SelectItem>
                              <SelectItem value="valeur">Valeur (€)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="valeurRemise"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Valeur</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              value={field.value}
                              onChange={(e) => field.onChange(e.target.valueAsNumber)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Lignes (optionnel)</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => lignesArray.append({ description: '', quantite: undefined, prixUnitaire: undefined, montant: undefined })}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Ajouter une ligne
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Vous pouvez aussi laisser cette section vide et ajouter les lignes après la création du devis.
                </p>
                {lignesArray.fields.map((field, index) => (
                  <div key={field.id} className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
                    <div className="flex items-start gap-2">
                      <FormField
                        control={form.control}
                        name={`lignes.${index}.description`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel className="text-xs">Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Étude préliminaire, déplacement, journée d'ingénieur…"
                                rows={3}
                                className="text-base"
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mt-6 h-9 w-9 shrink-0"
                        onClick={() => lignesArray.remove(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <FormField
                        control={form.control}
                        name={`lignes.${index}.quantite`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Quantité</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                value={field.value ?? ''}
                                onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`lignes.${index}.prixUnitaire`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Prix unitaire</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                value={field.value ?? ''}
                                onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-foreground">Total</p>
                        <LigneTotalField control={form.control} index={index} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Création…' : 'Créer le devis'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function LigneTotalField({ control, index }: { control: Control<FormValues>; index: number }) {
  const quantite = useWatch({ control, name: `lignes.${index}.quantite` })
  const prixUnitaire = useWatch({ control, name: `lignes.${index}.prixUnitaire` })
  const montantLibre = quantite === undefined && prixUnitaire === undefined

  const { field } = useController({ control, name: `lignes.${index}.montant` })

  if (montantLibre) {
    return (
      <Input
        type="number"
        step="0.01"
        placeholder="Forfait"
        value={field.value ?? ''}
        onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)}
      />
    )
  }

  return (
    <div className="flex h-9 items-center justify-end text-sm tabular-nums text-muted-foreground">
      {formatCurrency((quantite ?? 0) * (prixUnitaire ?? 0))}
    </div>
  )
}
