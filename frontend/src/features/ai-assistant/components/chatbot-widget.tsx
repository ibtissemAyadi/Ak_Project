import { useEffect, useRef, useState } from 'react'
import { Bot, History, MessageCircle, Send, Sparkles, User, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/formatters'
import { SUGGESTED_PROMPTS } from '@/mocks/data/chat'
import { chatService } from '@/services/chat-service'
import type { ChatConversation } from '@/types'

export function ChatbotWidget() {
  const [open, setOpen] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && conversations.length === 0) {
      chatService.listConversations().then((list) => {
        setConversations(list)
        setActiveId(list[0]?.id ?? null)
      })
    }
  }, [open, conversations.length])

  const activeConversation = conversations.find((c) => c.id === activeId)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [activeConversation?.messages.length])

  const handleSend = async (text?: string) => {
    const content = (text ?? draft).trim()
    if (!content || isSending) return
    setDraft('')
    setIsSending(true)
    try {
      const { conversation } = await chatService.sendMessage(activeId, content)
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === conversation.id)
        return exists ? prev.map((c) => (c.id === conversation.id ? conversation : c)) : [conversation, ...prev]
      })
      setActiveId(conversation.id)
    } finally {
      setIsSending(false)
    }
  }

  const startNewConversation = () => {
    setActiveId(null)
    setShowHistory(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg"
          aria-label="Open AI Assistant"
        >
          {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={14}
        className="flex h-[32rem] w-[24rem] flex-col overflow-hidden p-0 sm:w-[26rem]"
      >
        <div className="flex items-center justify-between border-b border-border bg-primary/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-none">AK Assistant</p>
              <p className="text-[11px] text-muted-foreground">Ask about clients, projects, invoices…</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowHistory((s) => !s)}>
            <History className="h-4 w-4" />
          </Button>
        </div>

        <div className="relative flex flex-1 overflow-hidden">
          {showHistory ? (
            <div className="absolute inset-0 z-10 flex flex-col bg-popover">
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Conversation history</p>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={startNewConversation}>
                  New chat
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="divide-y divide-border">
                  {conversations.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setActiveId(c.id)
                        setShowHistory(false)
                      }}
                      className={cn(
                        'flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left hover:bg-accent/50',
                        c.id === activeId && 'bg-accent/40',
                      )}
                    >
                      <span className="truncate text-sm font-medium text-foreground">{c.title}</span>
                      <span className="text-[11px] text-muted-foreground">{formatRelativeTime(c.updatedAt)}</span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : null}

          <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3">
            {!activeConversation || activeConversation.messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <MessageCircle className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">How can I help today?</p>
                  <p className="text-xs text-muted-foreground">Try one of the suggested actions below.</p>
                </div>
                <div className="grid w-full gap-2">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleSend(prompt)}
                      className="rounded-md border border-border px-3 py-2 text-left text-xs text-foreground transition-colors hover:border-primary/40 hover:bg-accent/50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {activeConversation.messages.map((m) => (
                  <div key={m.id} className={cn('flex gap-2', m.role === 'user' && 'flex-row-reverse')}>
                    <div
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                        m.role === 'user' ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-primary-foreground',
                      )}
                    >
                      {m.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                    </div>
                    <div
                      className={cn(
                        'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                        m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
                      )}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {isSending ? (
                  <div className="flex gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex items-center gap-1 rounded-lg bg-muted px-3 py-2.5">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="flex items-end gap-2 border-t border-border p-3"
        >
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Ask the AI assistant…"
            className="min-h-9 flex-1 resize-none py-2"
            rows={1}
          />
          <Button type="submit" size="icon" disabled={!draft.trim() || isSending}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  )
}
