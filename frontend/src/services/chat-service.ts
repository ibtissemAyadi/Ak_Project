import { apiFetch, ApiHttpError } from '@/lib/api-http'
import type { ChatConversation, ChatMessage } from '@/types'

// Le backend (assistant/) est stateless : il ne stocke aucune conversation,
// juste {message, historique} -> {reponse, historique}. Les conversations
// elles-mêmes (pour l'historique affiché dans le widget) vivent uniquement
// dans le navigateur — pas besoin de les persister côté serveur pour ce cas
// d'usage, et ça évite une table de plus.
const CLE_STOCKAGE = 'ak-chat-conversations'

interface ChatApiResponse {
  reponse: string
}

function chargerConversations(): ChatConversation[] {
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE)
    return brut ? (JSON.parse(brut) as ChatConversation[]) : []
  } catch {
    return []
  }
}

function sauvegarderConversations(conversations: ChatConversation[]) {
  try {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(conversations))
  } catch {
    // Stockage indisponible (navigation privée, quota) : non bloquant.
  }
}

export const chatService = {
  listConversations: async (): Promise<ChatConversation[]> => chargerConversations(),

  sendMessage: async (conversationId: string | null, content: string) => {
    const conversations = chargerConversations()
    let conversation = conversations.find((c) => c.id === conversationId)
    const now = new Date().toISOString()

    const historiquePourApi = (conversation?.messages ?? []).map((m) => ({ role: m.role, content: m.content }))

    let reponseTexte: string
    try {
      const data = await apiFetch<ChatApiResponse>('/api/assistant/chat/', {
        method: 'POST',
        body: JSON.stringify({ message: content, historique: historiquePourApi }),
      })
      reponseTexte = data.reponse
    } catch (error) {
      reponseTexte = error instanceof ApiHttpError
        ? error.message
        : "Le copilot IA est momentanément indisponible. Réessayez."
    }

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content, createdAt: now }
    const assistantMessage: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: reponseTexte, createdAt: now }

    if (!conversation) {
      conversation = { id: crypto.randomUUID(), title: content.slice(0, 40), updatedAt: now, messages: [] }
      conversations.unshift(conversation)
    }
    conversation.messages = [...conversation.messages, userMessage, assistantMessage]
    conversation.updatedAt = now

    sauvegarderConversations(conversations)

    return { conversation, assistantMessage }
  },
}
