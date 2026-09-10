import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, FolderKanban, Receipt, Users } from 'lucide-react'

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { useUiStore } from '@/store/ui-store'
import { MOCK_CLIENTS } from '@/mocks/data/clients'
import { MOCK_QUOTATIONS } from '@/mocks/data/quotations'
import { MOCK_PROJECTS } from '@/mocks/data/projects'
import { MOCK_INVOICES } from '@/mocks/data/invoices'

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen } = useUiStore()
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(!commandPaletteOpen)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [commandPaletteOpen, setCommandPaletteOpen])

  const go = (path: string) => {
    navigate(path)
    setCommandPaletteOpen(false)
  }

  const clients = useMemo(() => MOCK_CLIENTS.slice(0, 8), [])
  const quotations = useMemo(() => MOCK_QUOTATIONS.slice(0, 6), [])
  const projects = useMemo(() => MOCK_PROJECTS.slice(0, 6), [])
  const invoices = useMemo(() => MOCK_INVOICES.slice(0, 6), [])

  return (
    <CommandDialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <CommandInput placeholder="Rechercher clients, devis, projets, factures…" />
      <CommandList>
        <CommandEmpty>Aucun résultat.</CommandEmpty>
        <CommandGroup heading="Clients">
          {clients.map((c) => (
            <CommandItem key={c.id} value={`client ${c.name}`} onSelect={() => go(`/crm/clients/${c.id}`)}>
              <Users className="h-4 w-4 text-muted-foreground" />
              {c.name}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Devis">
          {quotations.map((q) => (
            <CommandItem key={q.id} value={`devis ${q.reference} ${q.title}`} onSelect={() => go(`/devis/${q.id}`)}>
              <FileText className="h-4 w-4 text-muted-foreground" />
              {q.reference} — {q.title}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Projets">
          {projects.map((p) => (
            <CommandItem key={p.id} value={`project ${p.reference} ${p.name}`} onSelect={() => go(`/projects/${p.id}`)}>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
              {p.reference} — {p.name}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Factures">
          {invoices.map((i) => (
            <CommandItem key={i.id} value={`invoice ${i.reference} ${i.clientName}`} onSelect={() => go(`/invoices/${i.id}`)}>
              <Receipt className="h-4 w-4 text-muted-foreground" />
              {i.reference} — {i.clientName}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
