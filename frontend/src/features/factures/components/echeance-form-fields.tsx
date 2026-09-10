import { useEffect, useState } from 'react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { calculerDateEcheance, JOURS_FIN_MOIS_PRESETS, JOURS_FIXES_PRESETS, JOURS_NETS_PRESETS, TYPE_ECHEANCE_LABELS } from '@/lib/echeance'
import { formatDate } from '@/lib/formatters'
import type { TypeEcheance } from '@/types'

const PERSONNALISE = 'personnalise'

interface EcheanceFormFieldsProps {
  typeEcheance: TypeEcheance
  nombreJours: number | null
  jourFixeMoisSuivant: number | null
  onChangeTypeEcheance: (v: TypeEcheance) => void
  onChangeNombreJours: (v: number | null) => void
  onChangeJourFixeMoisSuivant: (v: number | null) => void
  // Date de facture utilisée pour l'aperçu instantané (ex. aujourd'hui à la
  // création, ou la date de facture existante en modification).
  dateFacture: string
}

export function EcheanceFormFields({
  typeEcheance,
  nombreJours,
  jourFixeMoisSuivant,
  onChangeTypeEcheance,
  onChangeNombreJours,
  onChangeJourFixeMoisSuivant,
  dateFacture,
}: EcheanceFormFieldsProps) {
  const presets = typeEcheance === 'jour_fixe' ? JOURS_FIXES_PRESETS : typeEcheance === 'fin_mois' ? JOURS_FIN_MOIS_PRESETS : JOURS_NETS_PRESETS
  const valeurActuelle = typeEcheance === 'jour_fixe' ? jourFixeMoisSuivant : nombreJours

  // "Personnalisé" est un mode explicite, pas seulement déduit de la valeur :
  // sinon, saisir une valeur personnalisée qui coïncide par hasard avec un
  // preset (ex. la valeur de repli par défaut) ferait disparaître le champ
  // de saisie et reviendrait silencieusement à l'affichage du preset.
  const [modePersonnalise, setModePersonnalise] = useState(false)
  useEffect(() => setModePersonnalise(false), [typeEcheance])
  const estPersonnalise = modePersonnalise || (valeurActuelle !== null && !presets.includes(valeurActuelle))

  const echeancePreview = calculerDateEcheance(dateFacture, typeEcheance, nombreJours, jourFixeMoisSuivant)

  const setValeur = (v: number | null) => {
    if (typeEcheance === 'jour_fixe') onChangeJourFixeMoisSuivant(v)
    else onChangeNombreJours(v)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Modalité de paiement</label>
        <Select
          value={typeEcheance}
          onValueChange={(v) => {
            const type = v as TypeEcheance
            onChangeTypeEcheance(type)
            // Réinitialise l'autre champ pour éviter de garder une valeur
            // orpheline d'une modalité précédente.
            if (type === 'jour_fixe') onChangeNombreJours(null)
            else onChangeJourFixeMoisSuivant(null)
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(TYPE_ECHEANCE_LABELS) as [TypeEcheance, string][]).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {typeEcheance === 'jour_fixe' ? 'Jour du mois suivant' : 'Nombre de jours'}
          </label>
          <Select
            value={estPersonnalise ? PERSONNALISE : String(valeurActuelle ?? '')}
            onValueChange={(v) => {
              if (v === PERSONNALISE) {
                setModePersonnalise(true)
                // Repart d'une case vide pour forcer une saisie explicite si
                // la valeur actuelle est déjà l'un des presets proposés.
                if (valeurActuelle !== null && presets.includes(valeurActuelle)) setValeur(null)
              } else {
                setModePersonnalise(false)
                setValeur(Number(v))
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choisir…" />
            </SelectTrigger>
            <SelectContent>
              {presets.map((p) => (
                <SelectItem key={p} value={String(p)}>
                  {typeEcheance === 'jour_fixe' ? `Le ${p} du mois suivant` : `${p} jours`}
                </SelectItem>
              ))}
              <SelectItem value={PERSONNALISE}>Personnalisé…</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {estPersonnalise ? (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {typeEcheance === 'jour_fixe' ? 'Jour (1-31)' : 'Jours personnalisés'}
            </label>
            <Input
              type="number"
              min={typeEcheance === 'jour_fixe' ? 1 : 0}
              max={typeEcheance === 'jour_fixe' ? 31 : undefined}
              value={valeurActuelle ?? ''}
              onChange={(e) => setValeur(e.target.value === '' ? null : Number(e.target.value))}
            />
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
        <span className="text-muted-foreground">Date d'échéance (aperçu)</span>
        <span className="font-medium text-foreground">
          {echeancePreview ? formatDate(echeancePreview.toISOString().slice(0, 10)) : '—'}
        </span>
      </div>
    </div>
  )
}
