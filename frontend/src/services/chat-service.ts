import type { ChatConversation, ChatMessage } from '@/types'
import { withLatency, generateId } from '@/lib/api-client'
import { MOCK_CONVERSATIONS, buildAssistantReply } from '@/mocks/data/chat'

let conversations: ChatConversation[] = [...MOCK_CONVERSATIONS]

export const chatService = {
  listConversations: () => withLatency(() => [...conversations], { minMs: 150, maxMs: 350 }),

  sendMessage: (conversationId: string | null, content: string) =>
    withLatency(
      () => {
        const now = new Date().toISOString()
        const userMessage: ChatMessage = { id: generateId('m'), role: 'user', content, createdAt: now }
        const assistantMessage: ChatMessage = {
          id: generateId('m'),
          role: 'assistant',
          content: buildAssistantReply(content),
          createdAt: now,
        }

        let conversation = conversations.find((c) => c.id === conversationId)
        if (!conversation) {
          conversation = {
            id: generateId('conv'),
            title: content.slice(0, 40),
            updatedAt: now,
            messages: [],
          }
          conversations = [conversation, ...conversations]
        }

        conversation.messages = [...conversation.messages, userMessage, assistantMessage]
        conversation.updatedAt = now

        return { conversation, assistantMessage }
      },
      { minMs: 500, maxMs: 1100 },
    ),
}
