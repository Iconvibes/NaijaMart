import { useCallback, useEffect, useState } from 'react'

// Absorbs the fetch-and-effect idiom - the race-guard, loading/error state,
// and refetch-on-demand - behind one interface:
//
//   const { data, loading, error, reload } = useAsync(fn)
//
// `fn` must return a promise and its identity drives refetching: the effect
// re-runs whenever `fn` changes or `reload()` is called. Callers who fetch
// with changing inputs memoize `fn` with useCallback, so the refetch trigger
// stays explicit and lint-clean:
//
//   useAsync(useCallback(() => api.product(id), [id]))
//
// `initialData` seeds `data` for pages that render a fallback (e.g. the
// static catalog) while the fetch is in flight.
//
// State is only ever set inside the promise chain, never synchronously in the
// effect body, so renders stay one-pass and the react-hooks
// set-state-in-effect rule stays quiet. The `cancelled` guard replaces the
// per-page `let alive = true` cleanup idiom.
export function useAsync(fn, { initialData } = {}) {
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.resolve()
      .then(() => {
        if (!cancelled) {
          setLoading(true)
          setError(null)
        }
      })
      .then(fn)
      .then((value) => {
        if (!cancelled) {
          setData(value)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [fn, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])

  return { data, loading, error, reload }
}
