import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { PageHeader } from '@/components/shared/page-header'
import { DetailSkeleton } from '@/components/shared/loading-state'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { clientsService } from '@/services/clients-service'
import { CLIENT_STATUS_META } from '@/lib/constants'
import { ApiHttpError } from '@/lib/api-http'

const schema = z.object({
  raisonSociale: z.string().min(2, 'La raison sociale est requise'),
  matriculeFiscal: z.string().optional(),
  statut: z.enum(['Prospect', 'Actif', 'Inactif']),
  secteurActivite: z.string().optional(),
  email: z.string().email('Saisissez un email valide').optional().or(z.literal('')),
  telephone: z.string().optional(),
  adresse: z.string().optional(),
  pays: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function ClientFormPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const isEdit = !!clientId
  const navigate = useNavigate()

  const { data: existing, isLoading } = useAsync(
    () => (isEdit ? clientsService.getById(clientId!) : Promise.resolve(null)),
    [clientId],
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      raisonSociale: '',
      matriculeFiscal: '',
      statut: 'Prospect',
      secteurActivite: '',
      email: '',
      telephone: '',
      adresse: '',
      pays: '',
    },
  })

  useEffect(() => {
    if (existing) {
      form.reset({
        raisonSociale: existing.raisonSociale,
        matriculeFiscal: existing.matriculeFiscal,
        statut: existing.statut,
        secteurActivite: existing.secteurActivite,
        email: existing.email,
        telephone: existing.telephone,
        adresse: existing.adresse,
        pays: existing.pays,
      })
    }
  }, [existing, form])

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEdit && existing) {
        await clientsService.update(existing.id, values)
        toast.success('Client modifié avec succès.')
        navigate(`/crm/clients/${existing.id}`)
      } else {
        const created = await clientsService.create(values)
        toast.success('Client créé avec succès.')
        navigate(`/crm/clients/${created.id}`)
      }
    } catch (err) {
      const message = err instanceof ApiHttpError ? err.message : "Une erreur est survenue lors de l'enregistrement du client."
      toast.error(message)
    }
  }

  if (isEdit && isLoading) return <DetailSkeleton />

  return (
    <div className="space-y-6">
      <PageHeader title={isEdit ? 'Modifier le client' : 'Nouveau client'} description="Renseignez les informations de l'entreprise et du contact." />

      <Card className="max-w-3xl">
        <CardContent className="pt-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="raisonSociale"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Raison sociale</FormLabel>
                      <FormControl>
                        <Input placeholder="Meridian Infrastructure" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="matriculeFiscal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Matricule fiscal (optionnel)</FormLabel>
                      <FormControl>
                        <Input placeholder="FR12345678901" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
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
                          {Object.entries(CLIENT_STATUS_META).map(([value, meta]) => (
                            <SelectItem key={value} value={value}>
                              {meta.label}
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
                  name="secteurActivite"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Secteur</FormLabel>
                      <FormControl>
                        <Input placeholder="Mines, Énergie, Construction…" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="contact@company.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="telephone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone</FormLabel>
                      <FormControl>
                        <Input placeholder="+33 1 40 00 00 00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="adresse"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Adresse</FormLabel>
                      <FormControl>
                        <Input placeholder="12 Avenue de l'Industrie, Paris" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pays</FormLabel>
                      <FormControl>
                        <Input placeholder="France" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Enregistrement…' : isEdit ? 'Enregistrer les modifications' : 'Créer le client'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
