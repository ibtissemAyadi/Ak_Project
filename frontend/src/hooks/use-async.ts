import { useCallback, useEffect, useRef, useState } from 'react'

interface AsyncState<T> {
  data: T | undefined
  isLoading: boolean
  error: string | null
}

// Generic data-fetching hook used across every module page. It mimics the
// loading/error/success lifecycle a real API call would have, so pages
// naturally get loading skeletons and error states without extra plumbing.
export function useAsync<T>(fn: () => Promise<T>, deps: React.DependencyList) {
  const [state, setState] = useState<AsyncState<T>>({ data: undefined, isLoading: true, error: null })
  const fnRef = useRef(fn)
  fnRef.current = fn

  const run = useCallback(() => {
    let cancelled = false
    setState((s) => ({ ...s, isLoading: true, error: null }))

    fnRef
      .current()
      .then((data) => {
        if (!cancelled) setState({ data, isLoading: false, error: null })
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Something went wrong.'
          setState((s) => ({ ...s, isLoading: false, error: message }))
        }
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => run(), [run])

  return { ...state, refetch: run }
}
