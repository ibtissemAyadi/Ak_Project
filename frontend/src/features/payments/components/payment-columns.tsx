import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { BellRing, CreditCard } from 'lucide-react'

import type { Payment } from '@/types'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { FACTURE_STATUT_META, MODE_REGLEMENT_LABELS } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { cn } from '@/lib/utils'

export function estEnRetard(payment: Payment) {
  const aujourdHui = new Date().toISOString().slice(0, 10)
  return payment.dueDate < aujourdHui && payment.status !== 'Payee' && payment.status !== 'Annulee'
}

// Pas d'envoi automatique côté serveur (aucun service email configuré) :
// on ouvre Gmail dans un nouvel onglet avec le destinataire, l'objet et le
// message déjà pré-remplis — l'utilisateur relit et clique "Envoyer" lui-même.
export function ouvrirRelanceGmail(payment: Payment) {
  if (!payment.clientEmail) {
    toast.error("Ce client n'a pas d'adresse email enregistrée.")
    return
  }
  const objet = `Rappel de paiement — Facture ${payment.invoiceReference}`
  const corps = [
    'Bonjour,',
    '',
    `Sauf erreur de notre part, la facture ${payment.invoiceReference} d'un montant de ${formatCurrency(payment.amount, payment.currency)}, échue le ${formatDate(payment.dueDate)}, ne nous est pas encore parvenue.`,
    '',
    'Pourriez-vous nous indiquer où en est ce règlement ?',
    '',
    'Cordialement.',
  ].join('\n')

  const params = new URLSearchParams({ view: 'cm', fs: '1', to: payment.clientEmail, su: objet, body: corps })
  window.open(`https://mail.google.com/mail/?${params.toString()}`, '_blank', 'noopener,noreferrer')
}

export const paymentColumns: ColumnDef<Payment, any>[] = [
  {
    accessorKey: 'reference',
    header: 'Paiement',
    cell: ({ row }) => (
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/15 text-accent-foreground">
          <CreditCard className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{row.original.reference}</p>
          <p className="text-xs text-muted-foreground">{row.original.invoiceReference}</p>
        </div>
      </div>
    ),
  },
  { accessorKey: 'clientName', header: 'Client' },
  {
    accessorKey: 'method',
    header: 'Méthode',
    cell: ({ row }) => <span className="text-muted-foreground">{MODE_REGLEMENT_LABELS[row.original.method]}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Statut',
    cell: ({ row }) => <StatusBadge status={row.original.status} meta={FACTURE_STATUT_META} />,
  },
  {
    accessorKey: 'amount',
    header: 'Montant',
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">{formatCurrency(row.original.amount, row.original.currency)}</span>
    ),
  },
  {
    accessorKey: 'dueDate',
    header: 'Échéance',
    cell: ({ row }) => (
      <span className={cn('text-muted-foreground', estEnRetard(row.original) && 'font-medium text-destructive')}>
        {formatDate(row.original.dueDate)}
      </span>
    ),
  },
  {
    accessorKey: 'paidAt',
    header: 'Dernière modification',
    cell: ({ row }) => <span className="text-muted-foreground">{formatDate(row.original.paidAt)}</span>,
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) =>
      estEnRetard(row.original) ? (
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={(e) => {
            e.stopPropagation()
            ouvrirRelanceGmail(row.original)
          }}
        >
          <BellRing className="h-3.5 w-3.5" />
          Relancer
        </Button>
      ) : null,
  },
]
