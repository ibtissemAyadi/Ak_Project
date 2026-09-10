import { useState } from 'react'
import type { ReactNode } from 'react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface KanbanColumn<T> {
  id: string
  label: string
  items: T[]
  accentClass?: string
}

interface KanbanBoardProps<T> {
  columns: KanbanColumn<T>[]
  getItemId: (item: T) => string
  onMoveItem: (itemId: string, targetColumnId: string) => void
  renderCard: (item: T) => ReactNode
}

export function KanbanBoard<T>({ columns, getItemId, onMoveItem, renderCard }: KanbanBoardProps<T>) {
  const [dragItemId, setDragItemId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => (
        <div
          key={column.id}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOverColumn(column.id)
          }}
          onDragLeave={() => setDragOverColumn((cur) => (cur === column.id ? null : cur))}
          onDrop={(e) => {
            e.preventDefault()
            if (dragItemId) onMoveItem(dragItemId, column.id)
            setDragItemId(null)
            setDragOverColumn(null)
          }}
          className={cn(
            'flex w-72 shrink-0 flex-col rounded-lg border border-border bg-muted/30 transition-colors',
            dragOverColumn === column.id && 'border-primary bg-primary/5',
          )}
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className={cn('h-2 w-2 rounded-full', column.accentClass ?? 'bg-primary')} />
              <p className="text-sm font-medium text-foreground">{column.label}</p>
            </div>
            <Badge variant="muted">{column.items.length}</Badge>
          </div>
          <div className="flex flex-1 flex-col gap-2 p-2 min-h-[120px]">
            {column.items.map((item) => {
              const id = getItemId(item)
              return (
                <div
                  key={id}
                  draggable
                  onDragStart={() => setDragItemId(id)}
                  onDragEnd={() => setDragItemId(null)}
                  className={cn(
                    'cursor-grab rounded-lg border border-border bg-card p-3 shadow-sm active:cursor-grabbing',
                    dragItemId === id && 'opacity-50',
                  )}
                >
                  {renderCard(item)}
                </div>
              )
            })}
            {column.items.length === 0 ? (
              <div className="rounded-md border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
                Déposer ici
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}
