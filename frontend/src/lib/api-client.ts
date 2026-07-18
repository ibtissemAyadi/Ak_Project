// Lightweight mock network layer.
// Every service function goes through here so it behaves like a real HTTP call
// (latency + occasional failures) even though everything is served from memory.
// When the Django REST API is ready, only the `services/*` files need to change.

export class ApiError extends Error {
  status: number

  constructor(message: string, status = 500) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

interface DelayOptions {
  minMs?: number
  maxMs?: number
  failRate?: number
  errorMessage?: string
}

export async function withLatency<T>(factory: () => T, options: DelayOptions = {}): Promise<T> {
  const { minMs = 350, maxMs = 850, failRate = 0, errorMessage = 'Something went wrong. Please try again.' } = options
  const delay = minMs + Math.random() * (maxMs - minMs)
  await new Promise((resolve) => setTimeout(resolve, delay))

  if (failRate > 0 && Math.random() < failRate) {
    throw new ApiError(errorMessage, 500)
  }

  return factory()
}

export function generateId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}
