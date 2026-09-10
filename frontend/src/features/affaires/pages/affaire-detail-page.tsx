import { useState, type ReactNode } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Download, FileText, Paperclip, Pencil, Plus, Receipt, Send, Trash2 } from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { ErrorState } from '@/components/shared/error-state'
import { DetailSkeleton } from '@/components/shared/loading-state'
import { EmptyState } from '@/components/shared/empty-state'
import { FileDropzone } from '@/components/shared/file-dropzone'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
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
import { affairesService } from '@/services/affaires-service'
import { facturesService } from '@/services/factures-service'
import { EcheanceFormFields } from '@/features/factures/components/echeance-form-fields'
import { AFFAIRE_PRIORITE_META, DEVIS_STATUT_META, FACTURE_STATUT_META } from '@/lib/constants'
import { formatCurrency, formatDate, formatNumber, formatRelativeTime } from '@/lib/formatters'
import type { AffairePriorite, TypeEcheance } from '@/types'

const editSchema = z.object({
  budget: z.number().min(0),
  heuresPrevues: z.number().min(0),
  heuresConsommees: z.number().min(0),
  etatAvancement: z.number().min(0).max(100),
  priorite: z.enum(['Basse', 'Normale', 'Haute', 'Critique']),
  dateDebut: z.string().optional(),
  dateFinPrevue: z.string().optional(),
  dateFinReelle: z.string().optional(),
})

export function AffaireDetailPage() {
  const { affaireId } = useParams<{ affaireId: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const canEdit = hasPermission(user, 'affaires', 'modification')
  const canCreateFacture = hasPermission(user, 'factures', 'creation')

  const { data: affaire, isLoading, error, refetch } = useAsync(
    () => affairesService.getById(affaireId!),
    [affaireId],
  )
  const { data: facture } = useAsync(
    () => (affaire?.factureId ? facturesService.getById(affaire.factureId) : Promise.resolve(null)),
    [affaire?.factureId],
  )

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [commentaire, setCommentaire] = useState('')
  const [commentBusy, setCommentBusy] = useState(false)
  const [pieceDialogOpen, setPieceDialogOpen] = useState(false)
  const [pieceDesignation, setPieceDesignation] = useState('')
  const [pieceFile, setPieceFile] = useState<File | null>(null)
  const [pieceBusy, setPieceBusy] = useState(false)
  const [factureDialogOpen, setFactureDialogOpen] = useState(false)
  const [factureTypeEcheance, setFactureTypeEcheance] = useState<TypeEcheance>('net')
  const [factureNombreJours, setFactureNombreJours] = useState<number | null>(30)
  const [factureJourFixe, setFactureJourFixe] = useState<number | null>(null)
  const [factureSignature, setFactureSignature] = useState<File | null>(null)
  const [factureBusy, setFactureBusy] = useState(false)

  const editForm = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      budget: 0, heuresPrevues: 0, heuresConsommees: 0, etatAvancement: 0,
      priorite: 'Normale', dateDebut: '', dateFinPrevue: '', dateFinReelle: '',
    },
  })

  if (isLoading) return <DetailSkeleton />
  if (error || !affaire) return <ErrorState onRetry={refetch} description="Impossible de charger cette affaire." />

  const openEditDialog = () => {
    editForm.reset({
      budget: affaire.budget,
      heuresPrevues: affaire.heuresPrevues,
      heuresConsommees: affaire.heuresConsommees,
      etatAvancement: affaire.etatAvancement,
      priorite: affaire.priorite,
      dateDebut: affaire.dateDebut ?? '',
      dateFinPrevue: affaire.dateFinPrevue ?? '',
      dateFinReelle: affaire.dateFinReelle ?? '',
    })
    setEditDialogOpen(true)
  }

  const submitEdit = async (values: z.infer<typeof editSchema>) => {
    try {
      await affairesService.update(affaire.id, {
        ...values,
        dateDebut: values.dateDebut || undefined,
        dateFinPrevue: values.dateFinPrevue || undefined,
        dateFinReelle: values.dateFinReelle || undefined,
      })
      setEditDialogOpen(false)
      toast.success('Affaire mise à jour avec succès.')
      refetch()
    } catch (err) {
      toast.error(err instanceof ApiHttpError ? err.message : "Impossible de modifier l'affaire.")
    }
  }

  const submitCommentaire = async () => {
    if (!commentaire.trim()) return
    setCommentBusy(true)
    try {
      await affairesService.addCommentaire(affaire.id, commentaire.trim())
      setCommentaire('')
      refetch()
    } catch (err) {
      toast.error(err instanceof ApiHttpError ? err.message : "Impossible d'ajouter le commentaire.")
    } finally {
      setCommentBusy(false)
    }
  }

  const submitPieceJointe = async () => {
    if (!pieceFile || !pieceDesignation.trim()) return
    setPieceBusy(true)
    try {
      await affairesService.uploadPieceJointe(affaire.id, pieceDesignation.trim(), pieceFile)
      setPieceDialogOpen(false)
      setPieceDesignation('')
      setPieceFile(null)
      toast.success('Pièce jointe ajoutée avec succès.')
      refetch()
    } catch (err) {
      toast.error(err instanceof ApiHttpError ? err.message : "Impossible d'ajouter la pièce jointe.")
    } finally {
      setPieceBusy(false)
    }
  }

  const removePieceJointe = async (pieceId: string) => {
    try {
      await affairesService.removePieceJointe(pieceId)
      toast.success('Pièce jointe supprimée.')
      refetch()
    } catch (err) {
      toast.error(err instanceof ApiHttpError ? err.message : 'Impossible de supprimer la pièce jointe.')
    }
  }

  const creerFacture = async () => {
    setFactureBusy(true)
    try {
      const facture = await facturesService.createFromAffaire(affaire.id, {
        typeEcheance: factureTypeEcheance,
        nombreJours: factureNombreJours,
        jourFixeMoisSuivant: factureJourFixe,
      })
      if (factureSignature) {
        try {
          await facturesService.uploadSignature(facture.id, factureSignature)
        } catch {
          toast.error("Facture créée, mais la signature n'a pas pu être ajoutée. Vous pouvez réessayer depuis la facture.")
        }
      }
      setFactureDialogOpen(false)
      toast.success('Facture créée avec succès.')
      navigate(`/factures/${facture.id}`)
    } catch (err) {
      toast.error(err instanceof ApiHttpError ? err.message : 'Impossible de créer la facture.')
    } finally {
      setFactureBusy(false)
    }
  }

  const prioriteMeta = AFFAIRE_PRIORITE_META[affaire.priorite]

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {affaire.numeroAffaire}
            <Badge variant={prioriteMeta?.variant ?? 'muted'}>{prioriteMeta?.label ?? affaire.priorite}</Badge>
          </span>
        }
        description={affaire.objet}
        actions={
          canEdit ? (
            <Button variant="outline" className="gap-2" onClick={openEditDialog}>
              <Pencil className="h-4 w-4" />
              Modifier
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <SummaryTile label="Client">
          <Link to={`/crm/clients/${affaire.client.id}`} className="text-sm font-medium text-accent-foreground hover:underline">
            {affaire.client.raisonSociale}
          </Link>
        </SummaryTile>
        <SummaryTile label="Devis d'origine">
          <Link to={`/devis/${affaire.devis}`} className="text-sm font-medium text-accent-foreground hover:underline">
            {affaire.devisNumero}
          </Link>
        </SummaryTile>
        <SummaryTile label="Chargé d'affaires">
          <p className="text-sm font-medium text-foreground">
            {affaire.chargeAffaires.prenom} {affaire.chargeAffaires.nom}
          </p>
        </SummaryTile>
        <SummaryTile label="Échéance prévue">
          <p className="text-sm font-medium text-foreground">
            {affaire.dateFinPrevue ? formatDate(affaire.dateFinPrevue) : '—'}
          </p>
        </SummaryTile>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Devis d'origine</CardTitle>
          <div className="flex items-center gap-2">
            <StatusBadge status={affaire.devisDetail.statut} meta={DEVIS_STATUT_META} />
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link to={`/devis/${affaire.devisDetail.id}`}>
                <FileText className="h-3.5 w-3.5" />
                Voir le devis
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Numéro</p>
              <p className="font-medium text-foreground">{affaire.devisDetail.numero}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date de création</p>
              <p className="font-medium text-foreground">{formatDate(affaire.devisDetail.dateCreation)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valable jusqu'au</p>
              <p className="font-medium text-foreground">
                {affaire.devisDetail.dateValidite ? formatDate(affaire.devisDetail.dateValidite) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">TVA</p>
              <p className="font-medium text-foreground">{formatNumber(affaire.devisDetail.tauxTvaDefaut)}%</p>
            </div>
          </div>

          {affaire.devisDetail.lignes.length === 0 ? (
            <EmptyState title="Aucune ligne sur ce devis" className="border-0 py-6" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Quantité</TableHead>
                  <TableHead className="text-right">Prix unitaire</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {affaire.devisDetail.lignes.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-pre-line font-medium text-foreground">{l.description}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {l.quantite !== null ? formatNumber(l.quantite) : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {l.prixUnitaire !== null ? formatCurrency(l.prixUnitaire) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatCurrency(l.montant)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="ml-auto max-w-xs space-y-1.5 border-t border-border pt-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Sous-total</span>
              <span className="tabular-nums">{formatCurrency(affaire.devisDetail.sousTotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Marge</span>
              <span className="tabular-nums">+{formatCurrency(affaire.devisDetail.montantMarge)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Remise</span>
              <span className="tabular-nums">-{formatCurrency(affaire.devisDetail.montantRemise)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-1.5 font-medium text-foreground">
              <span>Total HT</span>
              <span className="tabular-nums">{formatCurrency(affaire.devisDetail.montantHt)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>TVA ({formatNumber(affaire.devisDetail.tauxTvaDefaut)}%)</span>
              <span className="tabular-nums">{formatCurrency(affaire.devisDetail.montantTva)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold text-foreground">
              <span>Total TTC</span>
              <span className="tabular-nums">{formatCurrency(affaire.devisDetail.montantTtc)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Avancement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Progress value={affaire.etatAvancement} className="h-2.5 flex-1" />
              <span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
                {affaire.etatAvancement}%
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Heures prévues</p>
                <p className="font-medium tabular-nums text-foreground">{formatNumber(affaire.heuresPrevues)} h</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Heures consommées</p>
                <p className="font-medium tabular-nums text-foreground">{formatNumber(affaire.heuresConsommees)} h</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Heures restantes</p>
                <p className="font-medium tabular-nums text-foreground">{formatNumber(affaire.heuresRestantes)} h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums text-foreground">{formatCurrency(affaire.budget)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Début : {affaire.dateDebut ? formatDate(affaire.dateDebut) : '—'}
            </p>
            {affaire.dateFinReelle ? (
              <p className="text-xs text-muted-foreground">Terminée le {formatDate(affaire.dateFinReelle)}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Pièces jointes</CardTitle>
            {canEdit ? (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setPieceDialogOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                Ajouter
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            {affaire.piecesJointes.length === 0 ? (
              <EmptyState title="Aucune pièce jointe pour l'instant" className="border-0 py-6" />
            ) : (
              <div className="space-y-2">
                {affaire.piecesJointes.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{p.designation}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.ajouteParNom ?? 'Utilisateur inconnu'} · {formatRelativeTime(p.dateAjout)}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button asChild size="icon" variant="ghost" className="h-8 w-8">
                        <a href={p.fichierUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                      {canEdit ? (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removePieceJointe(p.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Facturation</CardTitle>
          </CardHeader>
          <CardContent>
            {facture ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{facture.numeroFacture}</span>
                  </div>
                  <StatusBadge status={facture.statut} meta={FACTURE_STATUT_META} />
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Total TTC</p>
                    <p className="font-medium tabular-nums text-foreground">{formatCurrency(facture.montantTotal)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Échéance</p>
                    <p className="font-medium text-foreground">{formatDate(facture.dateEcheance)}</p>
                  </div>
                </div>
                <Button asChild variant="outline" className="w-full gap-2">
                  <Link to={`/factures/${facture.id}`}>
                    <FileText className="h-4 w-4" />
                    Voir la facture
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Aucune facture n'a encore été créée pour cette affaire.</p>
                {canCreateFacture ? (
                  <Button className="w-full gap-2" onClick={() => setFactureDialogOpen(true)}>
                    <Receipt className="h-4 w-4" />
                    Créer la facture
                  </Button>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Commentaires</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {canEdit ? (
            <div className="flex gap-2">
              <Textarea
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                placeholder="Ajouter un commentaire sur cette affaire…"
                rows={2}
                className="flex-1"
              />
              <Button
                size="icon"
                className="h-auto shrink-0"
                onClick={submitCommentaire}
                disabled={commentBusy || !commentaire.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          ) : null}

          {affaire.commentaires.length === 0 ? (
            <EmptyState title="Aucun commentaire pour l'instant" className="border-0 py-6" />
          ) : (
            <div className="space-y-4">
              {affaire.commentaires.map((c) => (
                <div key={c.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{c.auteurNom}</p>
                    <p className="text-xs text-muted-foreground">{formatRelativeTime(c.dateCreation)}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{c.texte}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier l'affaire</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(submitEdit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget (€)</FormLabel>
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
                  control={editForm.control}
                  name="priorite"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priorité</FormLabel>
                      <Select value={field.value} onValueChange={(v) => field.onChange(v as AffairePriorite)}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(AFFAIRE_PRIORITE_META).map(([value, meta]) => (
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
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={editForm.control}
                  name="heuresPrevues"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Heures prévues</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.5"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="heuresConsommees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Heures consommées</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.5"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="etatAvancement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Avancement (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={editForm.control}
                  name="dateDebut"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Début</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="dateFinPrevue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fin prévue</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="dateFinReelle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fin réelle</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
        open={pieceDialogOpen}
        onOpenChange={(open) => {
          setPieceDialogOpen(open)
          if (!open) {
            setPieceDesignation('')
            setPieceFile(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une pièce jointe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Désignation</label>
              <Input
                value={pieceDesignation}
                onChange={(e) => setPieceDesignation(e.target.value)}
                placeholder="Bon de commande"
              />
            </div>
            {pieceFile ? (
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span className="truncate text-foreground">{pieceFile.name}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setPieceFile(null)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ) : (
              <FileDropzone multiple={false} onFilesSelected={(files) => setPieceFile(files[0] ?? null)} />
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPieceDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={submitPieceJointe} disabled={pieceBusy || !pieceFile || !pieceDesignation.trim()}>
              {pieceBusy ? 'Envoi…' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={factureDialogOpen}
        onOpenChange={(open) => {
          setFactureDialogOpen(open)
          if (!open) setFactureSignature(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer la facture</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Choisissez la modalité de paiement à appliquer à cette facture. La date d'échéance sera calculée
            automatiquement à partir de la date d'émission (aujourd'hui) et de cette modalité.
          </p>
          <EcheanceFormFields
            typeEcheance={factureTypeEcheance}
            nombreJours={factureNombreJours}
            jourFixeMoisSuivant={factureJourFixe}
            onChangeTypeEcheance={setFactureTypeEcheance}
            onChangeNombreJours={setFactureNombreJours}
            onChangeJourFixeMoisSuivant={setFactureJourFixe}
            dateFacture={new Date().toISOString().slice(0, 10)}
          />
          <div className="space-y-2">
            <label className="text-sm font-medium">Signature électronique (optionnel)</label>
            {factureSignature ? (
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span className="truncate text-foreground">{factureSignature.name}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setFactureSignature(null)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ) : (
              <FileDropzone accept="image/*" multiple={false} onFilesSelected={(files) => setFactureSignature(files[0] ?? null)} />
            )}
            <p className="text-xs text-muted-foreground">
              Image de la signature électronique à insérer dans le PDF de la facture — ajoutable aussi plus tard
              depuis la facture.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setFactureDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={creerFacture}
              disabled={
                factureBusy ||
                (factureTypeEcheance === 'jour_fixe' ? factureJourFixe === null : factureNombreJours === null)
              }
            >
              {factureBusy ? 'Création…' : 'Générer la facture'}
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
