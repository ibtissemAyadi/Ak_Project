import { useState, type ReactNode } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Briefcase, Download, FileSpreadsheet, ListPlus, PenLine, Pencil, Trash2 } from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { ErrorState } from '@/components/shared/error-state'
import { DetailSkeleton } from '@/components/shared/loading-state'
import { EmptyState } from '@/components/shared/empty-state'
import { FileDropzone } from '@/components/shared/file-dropzone'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
import { facturesService } from '@/services/factures-service'
import { EcheanceFormFields } from '@/features/factures/components/echeance-form-fields'
import { FACTURE_STATUT_META, MODE_REGLEMENT_LABELS } from '@/lib/constants'
import { formatCurrency, formatDate, formatNumber } from '@/lib/formatters'
import type { FactureStatut, ModeReglement, TypeEcheance } from '@/types'

const ligneSchema = z.object({
  description: z.string().min(1, 'La description est requise'),
  quantite: z.number().min(0).optional(),
  prixUnitaire: z.number().min(0).optional(),
  montant: z.number().min(0).optional(),
})

const editSchema = z.object({
  statut: z.enum(['Brouillon', 'Envoyee', 'Payee', 'Partiellement_payee', 'En_retard', 'Annulee']),
  dateFacture: z.string().optional(),
  modeReglement: z.enum(['virement', 'cheque', 'especes', 'carte', 'prelevement']),
  tauxTva: z.number().min(0).max(100),
  commentaire: z.string().optional(),
})

export function FactureDetailPage() {
  const { factureId } = useParams<{ factureId: string }>()
  const user = useAuthStore((s) => s.user)
  const canAddLine = hasPermission(user, 'factures', 'creation')
  const canRemoveLine = hasPermission(user, 'factures', 'suppression')
  const canEdit = hasPermission(user, 'factures', 'modification')

  const { data: facture, isLoading, error, refetch } = useAsync(
    () => facturesService.getById(factureId!),
    [factureId],
  )

  const [ligneDialogOpen, setLigneDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editTypeEcheance, setEditTypeEcheance] = useState<TypeEcheance>('net')
  const [editNombreJours, setEditNombreJours] = useState<number | null>(30)
  const [editJourFixe, setEditJourFixe] = useState<number | null>(null)
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false)
  const [signatureFile, setSignatureFile] = useState<File | null>(null)
  const [signatureBusy, setSignatureBusy] = useState(false)

  const ligneForm = useForm<z.infer<typeof ligneSchema>>({
    resolver: zodResolver(ligneSchema),
    defaultValues: { description: '', quantite: undefined, prixUnitaire: undefined, montant: undefined },
  })
  const [ligneQuantite, lignePrixUnitaire] = ligneForm.watch(['quantite', 'prixUnitaire'])
  const ligneMontantLibre = ligneQuantite === undefined && lignePrixUnitaire === undefined

  const editForm = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      statut: 'Brouillon',
      dateFacture: '',
      modeReglement: 'virement',
      tauxTva: 0,
      commentaire: '',
    },
  })
  const editDateFacture = editForm.watch('dateFacture')

  if (isLoading) return <DetailSkeleton />
  if (error || !facture) return <ErrorState onRetry={refetch} description="Impossible de charger cette facture." />

  const submitLigne = async (values: z.infer<typeof ligneSchema>) => {
    try {
      await facturesService.addLigne(facture.id, values)
      setLigneDialogOpen(false)
      ligneForm.reset({ description: '', quantite: undefined, prixUnitaire: undefined, montant: undefined })
      refetch()
    } catch (err) {
      toast.error(err instanceof ApiHttpError ? err.message : "Impossible d'ajouter la ligne.")
    }
  }

  const removeLigne = async (ligneId: string) => {
    try {
      await facturesService.removeLigne(ligneId)
      refetch()
    } catch (err) {
      toast.error(err instanceof ApiHttpError ? err.message : 'Impossible de supprimer la ligne.')
    }
  }

  const openEditDialog = () => {
    editForm.reset({
      statut: facture.statut,
      dateFacture: facture.dateFacture ?? '',
      modeReglement: facture.modeReglement,
      tauxTva: facture.tauxTva,
      commentaire: facture.commentaire,
    })
    setEditTypeEcheance(facture.typeEcheance)
    setEditNombreJours(facture.nombreJours)
    setEditJourFixe(facture.jourFixeMoisSuivant)
    setEditDialogOpen(true)
  }

  const submitEdit = async (values: z.infer<typeof editSchema>) => {
    try {
      await facturesService.update(facture.id, {
        ...values,
        dateFacture: values.dateFacture || undefined,
        typeEcheance: editTypeEcheance,
        nombreJours: editNombreJours,
        jourFixeMoisSuivant: editJourFixe,
      })
      setEditDialogOpen(false)
      toast.success('Facture modifiée avec succès.')
      refetch()
    } catch (err) {
      toast.error(err instanceof ApiHttpError ? err.message : 'Impossible de modifier la facture.')
    }
  }

  const downloadPdf = async () => {
    try {
      await facturesService.downloadPdf(facture.id, `${facture.numeroFacture}.pdf`)
    } catch (err) {
      toast.error(err instanceof ApiHttpError ? err.message : 'Impossible de générer le PDF.')
    }
  }

  const downloadXlsx = async () => {
    try {
      await facturesService.downloadXlsx(facture.id, `${facture.numeroFacture}.xlsx`)
    } catch (err) {
      toast.error(err instanceof ApiHttpError ? err.message : 'Impossible de générer le fichier Excel.')
    }
  }

  const submitSignature = async () => {
    if (!signatureFile) return
    setSignatureBusy(true)
    try {
      await facturesService.uploadSignature(facture.id, signatureFile)
      setSignatureDialogOpen(false)
      setSignatureFile(null)
      toast.success('Signature ajoutée avec succès.')
      refetch()
    } catch (err) {
      toast.error(err instanceof ApiHttpError ? err.message : "Impossible d'ajouter la signature.")
    } finally {
      setSignatureBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={facture.numeroFacture}
        description={facture.objet}
        actions={
          <>
            <Button variant="outline" className="gap-2" asChild>
              <Link to={`/affaires/${facture.affaire}`}>
                <Briefcase className="h-4 w-4" />
                Voir l'affaire
              </Link>
            </Button>
            <Button variant="outline" className="gap-2" onClick={downloadPdf}>
              <Download className="h-4 w-4" />
              Télécharger le PDF
            </Button>
            <Button variant="outline" className="gap-2" onClick={downloadXlsx}>
              <FileSpreadsheet className="h-4 w-4" />
              Télécharger l'Excel
            </Button>
            {canEdit ? (
              <Button variant="outline" className="gap-2" onClick={openEditDialog}>
                <Pencil className="h-4 w-4" />
                Modifier
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <SummaryTile label="Client">
          <Link to={`/crm/clients/${facture.client.id}`} className="text-sm font-medium text-accent-foreground hover:underline">
            {facture.client.raisonSociale}
          </Link>
        </SummaryTile>
        <SummaryTile label="Statut">
          <StatusBadge status={facture.statut} meta={FACTURE_STATUT_META} />
        </SummaryTile>
        <SummaryTile label="Date de facture">
          <p className="text-sm font-medium text-foreground">{formatDate(facture.dateFacture)}</p>
        </SummaryTile>
        <SummaryTile label="Date d'échéance">
          <p className="text-sm font-medium text-foreground">{formatDate(facture.dateEcheance)}</p>
        </SummaryTile>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Lignes</CardTitle>
            {canAddLine ? (
              <Button size="sm" className="gap-1.5" onClick={() => setLigneDialogOpen(true)}>
                <ListPlus className="h-3.5 w-3.5" />
                Ajouter une ligne
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            {facture.lignes.length === 0 ? (
              <EmptyState title="Aucune ligne pour l'instant" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">Quantité</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Prix unitaire</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    {canRemoveLine ? <TableHead className="w-10" /> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facture.lignes.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-right tabular-nums">
                        {l.quantite !== null ? formatNumber(l.quantite) : '—'}
                      </TableCell>
                      <TableCell className="whitespace-pre-line font-medium text-foreground">{l.description}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {l.prixUnitaire !== null ? formatCurrency(l.prixUnitaire) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatCurrency(l.montant)}</TableCell>
                      {canRemoveLine ? (
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeLigne(l.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Totaux &amp; paiement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Sous-total</span>
                <span className="tabular-nums">{formatCurrency(facture.sousTotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>TVA ({formatNumber(facture.tauxTva)}%)</span>
                <span className="tabular-nums">{formatCurrency(facture.montantTva)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold text-foreground">
                <span>Total TTC</span>
                <span className="tabular-nums">{formatCurrency(facture.montantTotal)}</span>
              </div>
              <div className="flex justify-between pt-1 font-medium text-foreground">
                <span>À payer</span>
                <span className="tabular-nums">{formatCurrency(facture.montantAPayer)}</span>
              </div>
            </div>
            <div className="space-y-1.5 border-t border-border pt-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mode de règlement</span>
                <span className="font-medium text-foreground">{MODE_REGLEMENT_LABELS[facture.modeReglement]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Conditions de paiement</span>
                <span className="font-medium text-foreground">{facture.labelEcheance}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Signature</CardTitle>
          {canEdit ? (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setSignatureDialogOpen(true)}>
              <PenLine className="h-3.5 w-3.5" />
              {facture.signature ? 'Remplacer' : 'Ajouter'}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {facture.signature ? (
            <img
              src={facture.signature}
              alt="Signature électronique"
              className="max-h-24 rounded-md border border-border bg-white p-2"
            />
          ) : (
            <EmptyState
              title="Aucune signature ajoutée"
              description="La signature sera insérée dans le PDF généré une fois ajoutée."
              className="border-0 py-6"
            />
          )}
        </CardContent>
      </Card>

      {/* Dialogue d'ajout de ligne */}
      <Dialog open={ligneDialogOpen} onOpenChange={setLigneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une ligne</DialogTitle>
          </DialogHeader>
          <Form {...ligneForm}>
            <form onSubmit={ligneForm.handleSubmit(submitLigne)} className="space-y-4">
              <FormField
                control={ligneForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="Étude géotechnique préliminaire" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={ligneForm.control}
                  name="quantite"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantité (optionnel)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={ligneForm.control}
                  name="prixUnitaire"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prix unitaire (optionnel)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {ligneMontantLibre ? (
                <FormField
                  control={ligneForm.control}
                  name="montant"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total de la ligne (optionnel, ex. forfait)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Total de la ligne (calculé)</span>
                  <span className="font-medium tabular-nums text-foreground">
                    {formatCurrency((ligneQuantite ?? 0) * (lignePrixUnitaire ?? 0))}
                  </span>
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setLigneDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={ligneForm.formState.isSubmitting}>
                  Ajouter la ligne
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialogue de modification */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier la facture</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(submitEdit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="statut"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Statut</FormLabel>
                      <Select value={field.value} onValueChange={(v) => field.onChange(v as FactureStatut)}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(FACTURE_STATUT_META).map(([value, meta]) => (
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
                  control={editForm.control}
                  name="dateFacture"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date de facture</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="modeReglement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mode de règlement</FormLabel>
                      <Select value={field.value} onValueChange={(v) => field.onChange(v as ModeReglement)}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(MODE_REGLEMENT_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
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
                  name="tauxTva"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>TVA (%)</FormLabel>
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
              </div>

              <EcheanceFormFields
                typeEcheance={editTypeEcheance}
                nombreJours={editNombreJours}
                jourFixeMoisSuivant={editJourFixe}
                onChangeTypeEcheance={setEditTypeEcheance}
                onChangeNombreJours={setEditNombreJours}
                onChangeJourFixeMoisSuivant={setEditJourFixe}
                dateFacture={editDateFacture ?? ''}
              />

              <FormField
                control={editForm.control}
                name="commentaire"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commentaire (optionnel)</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={editForm.formState.isSubmitting}>
                  {editForm.formState.isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={signatureDialogOpen}
        onOpenChange={(open) => {
          setSignatureDialogOpen(open)
          if (!open) setSignatureFile(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{facture.signature ? 'Remplacer la signature' : 'Ajouter la signature'}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Importez une image de la signature électronique (déjà convertie en image) — elle sera insérée dans le
            PDF généré pour cette facture.
          </p>
          {signatureFile ? (
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
              <span className="truncate text-foreground">{signatureFile.name}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setSignatureFile(null)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ) : (
            <FileDropzone accept="image/*" multiple={false} onFilesSelected={(files) => setSignatureFile(files[0] ?? null)} />
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSignatureDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={submitSignature} disabled={signatureBusy || !signatureFile}>
              {signatureBusy ? 'Envoi…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SummaryTile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Card>
      <CardContent className="space-y-1.5 p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {children}
      </CardContent>
    </Card>
  )
}
