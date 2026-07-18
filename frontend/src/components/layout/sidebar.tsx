import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDown, ChevronsLeft, ChevronsRight, ShieldCheck } from 'lucide-react'

import { NAV_ITEMS } from '@/config/nav'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/store/ui-store'
import { COMPANY_NAME } from '@/lib/constants'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

function isActivePath(current: string, to: string) {
  return current === to || current.startsWith(`${to}/`)
}

export function SidebarContent({ collapsed }: { collapsed: boolean }) {
  const location = useLocation()
  const [openGroups, setOpenGroups] = useState<string[]>(
    NAV_ITEMS.filter((i) => i.children?.some((c) => isActivePath(location.pathname, c.to))).map((i) => i.label),
  )

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => (prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]))
  }

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className={cn('flex h-14 items-center gap-2 border-b border-sidebar-border px-4', collapsed && 'justify-center px-0')}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <ShieldCheck className="h-4.5 w-4.5" />
        </div>
        {!collapsed ? <span className="truncate text-sm font-semibold">{COMPANY_NAME}</span> : null}
      </div>

      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-0.5 p-2">
          {NAV_ITEMS.map((item) => {
            const active = isActivePath(location.pathname, item.to)
            const hasChildren = !!item.children?.length
            const isOpen = openGroups.includes(item.label)

            const linkContent = (
              <Link
                to={item.to}
                onClick={(e) => {
                  if (hasChildren && !collapsed) {
                    e.preventDefault()
                    toggleGroup(item.label)
                  }
                }}
                className={cn(
                  'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  active && 'bg-sidebar-accent text-sidebar-accent-foreground',
                  collapsed && 'justify-center px-0',
                )}
              >
                <item.icon className="h-4.5 w-4.5 shrink-0" />
                {!collapsed ? (
                  <>
                    <span className="flex-1 truncate">{item.label}</span>
                    {hasChildren ? (
                      <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isOpen && 'rotate-180')} />
                    ) : null}
                  </>
                ) : null}
              </Link>
            )

            return (
              <div key={item.label}>
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                ) : (
                  linkContent
                )}

                {hasChildren && !collapsed && isOpen ? (
                  <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-sidebar-border pl-4">
                    {item.children!.map((child) => {
                      const childActive = isActivePath(location.pathname, child.to)
                      return (
                        <Link
                          key={child.to}
                          to={child.to}
                          className={cn(
                            'rounded-md px-3 py-1.5 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                            childActive && 'bg-sidebar-accent text-sidebar-accent-foreground',
                          )}
                        >
                          {child.label}
                        </Link>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )
          })}
        </nav>
      </ScrollArea>
    </div>
  )
}

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUiStore()

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-svh shrink-0 border-r border-sidebar-border transition-all duration-200 lg:flex lg:flex-col',
        sidebarCollapsed ? 'w-16' : 'w-64',
      )}
    >
      <div className="relative flex-1">
        <SidebarContent collapsed={sidebarCollapsed} />
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-16 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm hover:text-foreground"
        >
          {sidebarCollapsed ? <ChevronsRight className="h-3.5 w-3.5" /> : <ChevronsLeft className="h-3.5 w-3.5" />}
        </button>
      </div>
    </aside>
  )
}
