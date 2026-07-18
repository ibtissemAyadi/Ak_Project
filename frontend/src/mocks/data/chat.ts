import type { ChatConversation } from '@/types'
import { daysFromNow } from '@/mocks/generators'

export const SUGGESTED_PROMPTS = [
  'Summarize overdue invoices this month',
  'Which projects are at risk of missing their deadline?',
  'Draft a follow-up email for a pending quotation',
  'Show me clients with no activity in 60 days',
]

export const MOCK_CONVERSATIONS: ChatConversation[] = [
  {
    id: 'conv-1',
    title: 'Overdue invoices summary',
    updatedAt: daysFromNow(-1),
    messages: [
      {
        id: 'm-1',
        role: 'user',
        content: 'Can you summarize which invoices are overdue right now?',
        createdAt: daysFromNow(-1.02),
      },
      {
        id: 'm-2',
        role: 'assistant',
        content:
          'You currently have several overdue invoices, mostly concentrated with clients in the construction and energy sectors. The largest is INV-5012 for Atlas Construction Group, 6 days overdue. Would you like me to draft reminder emails for the top 3?',
        createdAt: daysFromNow(-1.01),
      },
    ],
  },
  {
    id: 'conv-2',
    title: 'Project risk check',
    updatedAt: daysFromNow(-3),
    messages: [
      {
        id: 'm-3',
        role: 'user',
        content: 'Which of our in-progress projects are at risk of missing their deadline?',
        createdAt: daysFromNow(-3.05),
      },
      {
        id: 'm-4',
        role: 'assistant',
        content:
          'Based on current progress vs. timeline, "Bridge Deck Replacement" and "Metro Line Extension Study" are trending behind schedule. Both have less than 40% progress with under 30% of their timeline remaining.',
        createdAt: daysFromNow(-3.04),
      },
    ],
  },
]

export function buildAssistantReply(prompt: string): string {
  const normalized = prompt.toLowerCase()
  if (normalized.includes('overdue') || normalized.includes('invoice')) {
    return 'Here is a quick read on your receivables: overdue invoices are concentrated in 2-3 accounts. I can prepare reminder drafts or export a list if that helps.'
  }
  if (normalized.includes('project') || normalized.includes('deadline')) {
    return 'Looking at progress vs. planned timeline, a couple of projects are trending behind schedule. I would recommend a status check-in with their project managers this week.'
  }
  if (normalized.includes('quotation') || normalized.includes('email')) {
    return 'Sure — here is a draft: "Hello, I wanted to follow up on the quotation we shared and see if you had any questions before we move forward. Happy to jump on a call this week."'
  }
  if (normalized.includes('client')) {
    return 'A handful of accounts have had no logged activity in the last 60 days. I can flag them to the relevant account managers for a re-engagement outreach.'
  }
  return "I've noted that. I can pull data from CRM, Quotations, Projects, Invoices and Payments to help answer questions like this once connected to live data."
}
