import { useState, type ReactNode } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Briefcase, Download, FileSpreadsheet, Info, ListPlus, Pencil, Send, Trash2 } from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { ErrorState } from '@/components/shared/error-state'
import { DetailSkeleton } from '@/components/shared/loading-state'
import { EmptyState } from '@/components/shared/empty-state'
import { Timeline } from '@/components/shared/timeline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { DEVIS_STATUT_META } from '@/lib/constants'
import { formatCurrency, formatDate, formatDateTime, formatNumber, formatRelativeTime } from '@/lib/formatters'
import type { DevisStatut, DevisTypeValeur } from '@/types'

// Miroir de devis/views.py ACTION_PAR_TRANSITION côté backend — juste pour
// activer/désactiver les boutons ; le serveur reste seul juge final.
const ACTION_PAR_TRANSITION: Record<string, 'modification' | 'validation'> = {
  'Brouillon->En_preparation': 'modification',
  'Brouillon->Annule': 'modification',
  'En_preparation->A_valider': 'modification',
  'En_preparation->Annule': 'modification',
  'A_valider->Envoye': 'validation',
  'Envoye->Accepte': 'validation',
  'Envoye->Refuse': 'validation',
}

const ligneSchema = z.object({
  description: z.string().min(1, 'La description est requise'),
  quantite: z.number().min(0).optional(),
  prixUnitaire: z.number().min(0).optional(),
  // Saisi directement seulement si quantite/prixUnitaire sont vides
  // (ex. forfait global) — sinon le total est calculé et ce champ ignoré.
  montant: z.number().min(0).optional(),
})

function formatAjustement(type: DevisTypeValeur, valeur: number): string {
  return type === 'pourcentage' ? `${valeur}%` : formatCurrency(valeur)
}

const editSchema = z.object({
  objet: z.string().min(2, "L'objet est requis"),
  tauxTvaDefaut: z.number().min(0).max(100),
  dateValidite: z.string().optional(),
  typeMarge: z.enum(['pourcentage', 'valeur']),
  valeurMarge: z.number().min(0),
  typeRemise: z.enum(['pourcentage', 'valeur']),
  valeurRemise: z.number().min(0),
  commentaireJustification: z.string().optional(),
})

export function QuotationDetailPage() {
  const { devisId } = useParams<{ devisId: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const canAddLine = hasPermission(user, 'devis', 'creation')
  const canRemoveLine = hasPermission(user, 'devis', 'suppression')
  const canEdit = hasPermission(user, 'devis', 'modification')
  const isChargeAffaires = user?.role.libelle === "Chargé d'affaires"

  const { data: devis, isLoading, error, refetch } = useAsync(
    () => devisService.getById(devisId!),
    [devisId],
  )
  const { data: versions } = useAsync(
    () => (devisId ? devisService.versions(devisId) : Promise.resolve([])),
    [devisId],
  )

  const [transitionTarget, setTransitionTarget] = useState<DevisStatut | null>(null)
  const [transitionComment, setTransitionComment] = useState('')
  const [transitionBusy, setTransitionBusy] = useState(false)
  const [ligneDialogOpen, setLigneDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [commentaire, setCommentaire] = useState('')
  const [commentBusy, setCommentBusy] = useState(false)

  const ligneForm = useForm<z.infer<typeof ligneSchema>>({
    resolver: zodResolver(ligneSchema),
    defaultValues: { description: '', quantite: undefined, prixUnitaire: undefined, montant: undefined },
  })
  const [ligneQuantite, lignePrixUnitaire] = ligneForm.watch(['quantite', 'prixUnitaire'])
  const ligneMontantLibre = ligneQuantite === undefined && lignePrixUnitaire === undefined
  const editForm = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      objet: '',
      tauxTvaDefaut: 0,
      dateValidite: '',
      typeMarge: 'pourcentage',
      valeurMarge: 0,
      typeRemise: 'pourcentage',
      valeurRemise: 0,
      commentaireJustification: '',
    },
  })

  // Seulement au tout premier chargement (pas de données encore) : un
  // refetch() ultérieur (transition, ajout de ligne/commentaire...) garde
  // l'écran actuel affiché pendant le rechargement, plutôt que de le
  // démonter et le remonter — ce qui réinitialiserait sinon l'onglet actif
  // des <Tabs> non contrôlées à leur valeur par défaut à chaque refetch.
  if (isLoading && !devis) return <DetailSkeleton />
  if (error || !devis) return <ErrorState onRetry={refetch} description="Impossible de charger ce devis." />

  const allowedTransitions = devis.transitionsPossibles.filter((next) => {
    const action = ACTION_PAR_TRANSITION[`${devis.statut}->${next}`] ?? 'modification'
    return hasPermission(user, 'devis', action)
  })

  const runTransition = async () => {
    if (!transitionTarget) return
    if (transitionTarget === 'Refuse' && !transitionComment.trim()) {
      toast.error('Un motif est requis pour refuser un devis.')
      return
    }
    setTransitionBusy(true)
    try {
      await devisService.transition(devis.id, transitionTarget, transitionComment)
      toast.success(`Devis marqué comme ${DEVIS_STATUT_META[transitionTarget]?.label ?? transitionTarget}.`)
      setTransitionTarget(null)
      setTransitionComment('')
      refetch()
    } catch (err) {
      toast.error(err instanceof ApiHttpError ? err.message : 'Impossible de mettre à jour le statut.')
    } finally {
      setTransitionBusy(false)
    }
  }

  const handleNewVersionRedirect = (newDevisId: string) => {
    if (newDevisId !== devis.id) {
      toast.info('Ce devis était verrouillé — une nouvelle version a été créée pour votre modification.')
      navigate(`/devis/${newDevisId}`)
      return true
    }
    return false
  }

  const submitLigne = async (values: z.infer<typeof ligneSchema>) => {
    try {
      const ligne = await devisService.addLigne(devis.id, values)
      setLigneDialogOpen(false)
      ligneForm.reset({ description: '', quantite: undefined, prixUnitaire: undefined, montant: undefined })
      if (!handleNewVersionRedirect(ligne.devis)) refetch()
    } catch (err) {
      toast.error(err instanceof ApiHttpError ? err.message : "Impossible d'ajouter la ligne.")
    }
  }

  const removeLigne = async (ligneId: string) => {
    try {
      await devisService.removeLigne(ligneId)
      refetch()
    } catch (err) {
      toast.error(err instanceof ApiHttpError ? err.message : 'Impossible de supprimer la ligne.')
    }
  }

  const openEditDialog = () => {
    editForm.reset({
      objet: devis.objet,
      tauxTvaDefaut: devis.tauxTvaDefaut,
      dateValidite: devis.dateValidite ?? '',
      typeMarge: devis.typeMarge,
      valeurMarge: devis.valeurMarge,
      typeRemise: devis.typeRemise,
      valeurRemise: devis.valeurRemise,
      commentaireJustification: devis.commentaireJustification,
    })
    setEditDialogOpen(true)
  }

  const downloadPdf = async () => {
    try {
      await devisService.downloadPdf(devis.id, `${devis.numero}-v${devis.version}.pdf`)
    } catch (err) {
      toast.error(err instanceof ApiHttpError ? err.message : 'Impossible de générer le PDF.')
    }
  }

  const downloadXlsx = async () => {
    try {
      await devisService.downloadXlsx(devis.id, `${devis.numero}-v${devis.version}.xlsx`)
    } catch (err) {
      toast.error(err instanceof ApiHttpError ? err.message : 'Impossible de générer le fichier Excel.')
    }
  }

  const submitEdit = async (values: z.infer<typeof editSchema>) => {
    try {
      const updated = await devisService.update(devis.id, {
        ...values,
        dateValidite: values.dateValidite || undefined,
      })
      setEditDialogOpen(false)
      if (!handleNewVersionRedirect(updated.id)) {
        toast.success('Devis modifié avec succès.')
        refetch()
      }
    } catch (err) {
      toast.error(err instanceof ApiHttpError ? err.message : 'Impossible de modifier le devis.')
    }
  }

  const submitCommentaire = async () => {
    if (!commentaire.trim()) return
    setCommentBusy(true)
    try {
      await devisService.addCommentaire(devis.id, commentaire.trim())
      setCommentaire('')
      refetch()
    } catch (err) {
      toast.error(err instanceof ApiHttpError ? err.message : "Impossible d'ajouter le commentaire.")
    } finally {
      setCommentBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {devis.numero}
            <Badge variant="muted">v{devis.version}</Badge>
            {!devis.estCourante ? <Badge variant="secondary">Lecture seule (remplacé)</Badge> : null}
          </span>
        }
        description={devis.objet}
        actions={
          <>
            {devis.affaireId && isChargeAffaires ? (
              <Button variant="outline" className="gap-2" onClick={() => navigate(`/affaires/${devis.affaireId}`)}>
                <Briefcase className="h-4 w-4" />
                Voir l'affaire
              </Button>
            ) : null}
            <Button variant="outline" className="gap-2" onClick={downloadPdf}>
              <Download className="h-4 w-4" />
              Télécharger le PDF
            </Button>
            <Button variant="outline" className="gap-2" onClick={downloadXlsx}>
              <FileSpreadsheet className="h-4 w-4" />
              Télécharger l'Excel
            </Button>
            {canEdit && devis.estCourante ? (
              <Button variant="outline" className="gap-2" onClick={openEditDialog}>
                <Pencil className="h-4 w-4" />
                Modifier
              </Button>
            ) : null}
            {devis.estCourante &&
              allowedTransitions.map((next) => (
                <Button key={next} variant="outline" onClick={() => setTransitionTarget(next)}>
                  {DEVIS_STATUT_META[next]?.label ?? next}
                </Button>
              ))}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <SummaryTile label="Client">
          <Link to={`/crm/clients/${devis.client.id}`} className="text-sm font-medium text-accent-foreground hover:underline">
            {devis.client.raisonSociale}
          </Link>
        </SummaryTile>
        <SummaryTile label="Chargé d'affaires">
          <p className="text-sm font-medium text-foreground">
            {devis.chargeAffaires.prenom} {devis.chargeAffaires.nom}
          </p>
        </SummaryTile>
        <SummaryTile label="Statut">
          <StatusBadge status={devis.statut} meta={DEVIS_STATUT_META} />
        </SummaryTile>
        <SummaryTile label="Valable jusqu'au">
          <p className="text-sm font-medium text-foreground">
            {devis.dateValidite ? formatDate(devis.dateValidite) : '—'}
          </p>
        </SummaryTile>
      </div>

      <Tabs defaultValue="lines">
        <TabsList>
          <TabsTrigger value="lines">Lignes</TabsTrigger>
          <TabsTrigger value="history">Historique des statuts</TabsTrigger>
          <TabsTrigger value="versions">Versions ({versions?.length ?? 1})</TabsTrigger>
          <TabsTrigger value="comments">Commentaires ({devis.commentaires.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="lines" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Lignes</CardTitle>
              {canAddLine && devis.estCourante ? (
                <Button size="sm" className="gap-1.5" onClick={() => setLigneDialogOpen(true)}>
                  <ListPlus className="h-3.5 w-3.5" />
                  Ajouter une ligne
                </Button>
              ) : null}
            </CardHeader>
            <CardContent>
              {devis.lignes.length === 0 ? (
                <EmptyState title="Aucune ligne pour l'instant" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Quantité</TableHead>
                      <TableHead className="text-right">Prix unitaire</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      {canRemoveLine && devis.estCourante ? <TableHead className="w-10" /> : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devis.lignes.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="whitespace-pre-line font-medium text-foreground">{l.description}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {l.quantite !== null ? formatNumber(l.quantite) : '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {l.prixUnitaire !== null ? formatCurrency(l.prixUnitaire) : '—'}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{formatCurrency(l.montant)}</TableCell>
                        {canRemoveLine && devis.estCourante ? (
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
              <CardTitle>Totaux</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="ml-auto max-w-xs space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Sous-total</span>
                  <span className="tabular-nums">{formatCurrency(devis.sousTotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Marge</span>
                  <span className="tabular-nums">+{formatCurrency(devis.montantMarge)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Remise</span>
                  <span className="tabular-nums">-{formatCurrency(devis.montantRemise)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1.5 font-medium text-foreground">
                  <span>Total HT</span>
                  <span className="tabular-nums">{formatCurrency(devis.montantHt)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>TVA ({formatNumber(devis.tauxTvaDefaut)}%)</span>
                  <span className="tabular-nums">{formatCurrency(devis.montantTva)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailDialogOpen(true)}
                  className="flex w-full items-center justify-between gap-2 rounded-md border-t border-border pt-1.5 text-base font-semibold text-foreground transition-colors hover:text-accent-foreground"
                >
                  <span className="flex items-center gap-1.5">
                    Total TTC
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </span>
                  <span className="tabular-nums">{formatCurrency(devis.montantTtc)}</span>
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Historique des statuts</CardTitle>
            </CardHeader>
            <CardContent>
              {devis.historiqueStatuts.length === 0 ? (
                <EmptyState title="Aucun changement de statut pour l'instant" />
              ) : (
                <Timeline
                  entries={devis.historiqueStatuts.map((h) => ({
                    id: h.id,
                    title: `${DEVIS_STATUT_META[h.ancienStatut]?.label ?? (h.ancienStatut || 'Création')} → ${DEVIS_STATUT_META[h.nouveauStatut]?.label ?? h.nouveauStatut}`,
                    description: [h.utilisateurNom, h.commentaire].filter(Boolean).join(' — '),
                    timestamp: h.date,
                  }))}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="versions">
          <Card>
            <CardHeader>
              <CardTitle>Historique des versions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Créé le</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Total TTC</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(versions ?? []).map((v) => (
                    <TableRow key={v.id} className="cursor-pointer" onClick={() => navigate(`/devis/${v.id}`)}>
                      <TableCell>
                        <Badge variant={v.id === devis.id ? 'default' : 'muted'}>v{v.version}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDateTime(v.dateCreation)}</TableCell>
                      <TableCell>
                        <StatusBadge status={v.statut} meta={DEVIS_STATUT_META} />
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatCurrency(v.montantTtc)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments">
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
                    placeholder="Ajouter un commentaire sur ce devis…"
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

              {devis.commentaires.length === 0 ? (
                <EmptyState title="Aucun commentaire pour l'instant" className="border-0 py-6" />
              ) : (
                <div className="space-y-4">
                  {devis.commentaires.map((c) => (
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
        </TabsContent>
      </Tabs>

      {/* Dialogue de transition de statut */}
      <Dialog open={!!transitionTarget} onOpenChange={(open) => !open && setTransitionTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Marquer comme {transitionTarget ? DEVIS_STATUT_META[transitionTarget]?.label ?? transitionTarget : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Commentaire {transitionTarget === 'Refuse' ? '(requis)' : '(optionnel)'}
            </label>
            <Textarea
              value={transitionComment}
              onChange={(e) => setTransitionComment(e.target.value)}
              placeholder={transitionTarget === 'Refuse' ? 'Motif du refus…' : 'Note optionnelle…'}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransitionTarget(null)}>
              Annuler
            </Button>
            <Button onClick={runTransition} disabled={transitionBusy}>
              {transitionBusy ? 'Enregistrement…' : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Dialogue de modification de l'en-tête */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier le devis</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(submitEdit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="objet"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Objet</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="tauxTvaDefaut"
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
                <FormField
                  control={editForm.control}
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

              <div className="space-y-3 rounded-lg border border-border p-3">
                <p className="text-sm font-medium text-foreground">Marge (optionnel)</p>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={editForm.control}
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
                    control={editForm.control}
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
                    control={editForm.control}
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
                    control={editForm.control}
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

              <FormField
                control={editForm.control}
                name="commentaireJustification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commentaire / justification (optionnel)</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="Raison de la marge/remise appliquée…" {...field} />
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

      {/* Dialogue de détail du calcul du Total TTC */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Détail du calcul du Total TTC</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sous-total ({devis.lignes.length} ligne{devis.lignes.length > 1 ? 's' : ''})</span>
                <span className="tabular-nums">{formatCurrency(devis.sousTotal)}</span>
              </div>
            </div>

            <div className="space-y-1.5 border-t border-border pt-3">
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">
                  Marge
                  <span className="block text-xs">{formatAjustement(devis.typeMarge, devis.valeurMarge)}</span>
                </span>
                <span className="whitespace-nowrap tabular-nums">+{formatCurrency(devis.montantMarge)}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">
                  Remise
                  <span className="block text-xs">{formatAjustement(devis.typeRemise, devis.valeurRemise)}</span>
                </span>
                <span className="whitespace-nowrap tabular-nums">-{formatCurrency(devis.montantRemise)}</span>
              </div>
            </div>

            <div className="space-y-1 border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">
                {formatCurrency(devis.sousTotal)} + {formatCurrency(devis.montantMarge)} − {formatCurrency(devis.montantRemise)}
              </p>
              <div className="flex justify-between font-medium text-foreground">
                <span>Total HT</span>
                <span className="tabular-nums">{formatCurrency(devis.montantHt)}</span>
              </div>
            </div>

            <div className="space-y-1.5 border-t border-border pt-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">TVA ({formatNumber(devis.tauxTvaDefaut)}%)</span>
                <span className="tabular-nums">{formatCurrency(devis.montantTva)}</span>
              </div>
            </div>

            <div className="flex justify-between border-t border-border pt-3 text-base font-semibold text-foreground">
              <span>Total TTC</span>
              <span className="tabular-nums">
                {formatCurrency(devis.montantHt)} + {formatCurrency(devis.montantTva)} = {formatCurrency(devis.montantTtc)}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              Fermer
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
