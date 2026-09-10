import type { TypeEcheance } from '@/types'

// Miroir exact de factures/models.py calculer_date_echeance et
// formater_conditions_paiement — utilisé uniquement pour un aperçu
// instantané côté client ; le serveur reste seul juge de la vraie valeur.

export const JOURS_NETS_PRESETS = [7, 10, 15, 30, 45, 60, 90]
export const JOURS_FIN_MOIS_PRESETS = [7, 10, 15, 30, 45, 60, 90]
export const JOURS_FIXES_PRESETS = [5, 10, 15, 20, 25]

export const TYPE_ECHEANCE_LABELS: Record<TypeEcheance, string> = {
  net: 'Paiement net (nombre de jours)',
  fin_mois: 'X jours fin de mois',
  jour_fixe: 'Jour fixe du mois suivant',
}

function finDeMois(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

function ajouterJours(d: Date, jours: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + jours)
  return r
}

function moisSuivant(d: Date): { annee: number; mois: number } {
  return d.getMonth() === 11 ? { annee: d.getFullYear() + 1, mois: 0 } : { annee: d.getFullYear(), mois: d.getMonth() + 1 }
}

function dernierJourDuMois(annee: number, mois: number): number {
  return new Date(annee, mois + 1, 0).getDate()
}

export function calculerDateEcheance(
  dateFactureStr: string,
  typeEcheance: TypeEcheance,
  nombreJours: number | null,
  jourFixeMoisSuivant: number | null,
): Date | null {
  if (!dateFactureStr) return null
  const dateFacture = new Date(dateFactureStr)
  if (Number.isNaN(dateFacture.getTime())) return null

  if (typeEcheance === 'net') {
    return ajouterJours(dateFacture, nombreJours ?? 0)
  }
  if (typeEcheance === 'fin_mois') {
    return ajouterJours(finDeMois(dateFacture), nombreJours ?? 0)
  }
  if (typeEcheance === 'jour_fixe') {
    const { annee, mois } = moisSuivant(dateFacture)
    const dernierJour = dernierJourDuMois(annee, mois)
    const jour = Math.min(jourFixeMoisSuivant ?? 1, dernierJour)
    return new Date(annee, mois, jour)
  }
  return null
}

export function formaterConditionsPaiement(
  typeEcheance: TypeEcheance,
  nombreJours: number | null,
  jourFixeMoisSuivant: number | null,
): string {
  if (typeEcheance === 'net') {
    return nombreJours ? `${nombreJours} jours nets` : 'Comptant (à réception)'
  }
  if (typeEcheance === 'fin_mois') {
    return `${nombreJours} jours fin de mois`
  }
  if (typeEcheance === 'jour_fixe') {
    return `Le ${jourFixeMoisSuivant} du mois suivant`
  }
  return typeEcheance
}
