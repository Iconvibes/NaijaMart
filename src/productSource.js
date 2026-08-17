import { api } from './api.js'

// Storefront product source. One real adapter (the API) behind a tiny
// interface; the static catalog is NOT smuggled in as a second adapter here -
// its products have no database identity, so they can't be ordered and are not
// interchangeable with live products. Pages that render a catalog-first
// experience seed their own initialData from the catalog instead.
//
// The seam is the factory: production wires it to the HTTP client, tests wire
// it to a fake fetcher - one interface, one place to reason about caching.
//
// Contract:
//   fetchProducts()       cached promise; concurrent callers share one request
//   invalidateProducts()  call after creating/deleting catalog products so
//                         the storefront refetches
export function createProductSource({ fetchProducts: fetcher }) {
  let cache = null

  return {
    fetchProducts() {
      if (!cache) {
        // Cache the promise, not the result, so simultaneous storefront
        // mounts (FlashSales + TopSelling + ListingPage) issue one request.
        // A failure clears the cache so a later retry actually refetches
        // instead of replaying the outage.
        cache = fetcher().catch((err) => {
          cache = null
          throw err
        })
      }
      return cache
    },

    invalidateProducts() {
      cache = null
    },
  }
}

export const productSource = createProductSource({ fetchProducts: () => api.products() })
