import { useEffect } from 'react'

/**
 * SEO component that manages document head meta tags and structured data.
 * Replaces the <title>, meta description, Open Graph, and Twitter Card tags.
 * Also injects JSON-LD structured data for rich search results.
 *
 * @param {Object} props
 * @param {string} props.title - Page title (will be suffixed with " | NaijaMart")
 * @param {string} props.description - Meta description (max 160 chars recommended)
 * @param {string} props.canonical - Canonical URL
 * @param {string} props.image - Open Graph image URL
 * @param {string} props.type - Open Graph type (product, website, profile, etc.)
 * @param {Object} props.structuredData - JSON-LD structured data object
 * @param {string} props.productPrice - For product OG tag
 * @param {string} props.productCurrency - Currency for product (default NGN)
 * @param {string} props.availability - Schema.org availability
 */
export default function SEOHead({
  title,
  description,
  canonical,
  image,
  type = 'website',
  structuredData,
  productPrice,
  productCurrency = 'NGN',
  availability,
}) {
  const fullTitle = title ? `${title} | NaijaMart` : 'NaijaMart — Nigeria\'s Online Marketplace'
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://naijamart.com'
  const fullCanonical = canonical ? `${siteUrl}${canonical}` : undefined
  const ogImage = image ? (image.startsWith('http') ? image : `${siteUrl}${image}`) : `${siteUrl}/images/og-default.jpg`

  useEffect(() => {
    // Title
    document.title = fullTitle

    // Meta tags
    const setMeta = (name, content, attr = 'name') => {
      let el = document.querySelector(`meta[${attr}="${name}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attr, name)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }

    if (description) setMeta('description', description)
    setMeta('og:title', fullTitle, 'property')
    setMeta('og:type', type, 'property')
    setMeta('og:image', ogImage, 'property')
    if (description) setMeta('og:description', description, 'property')
    setMeta('og:site_name', 'NaijaMart', 'property')
    if (fullCanonical) setMeta('og:url', fullCanonical, 'property')

    // Twitter Card
    setMeta('twitter:card', 'summary_large_image')
    setMeta('twitter:title', fullTitle)
    if (description) setMeta('twitter:description', description)
    setMeta('twitter:image', ogImage)

    // Canonical
    let canonicalEl = document.querySelector('link[rel="canonical"]')
    if (!canonicalEl) {
      canonicalEl = document.createElement('link')
      canonicalEl.setAttribute('rel', 'canonical')
      document.head.appendChild(canonicalEl)
    }
    canonicalEl.setAttribute('href', fullCanonical || window.location.href)

    // JSON-LD structured data
    let ldScript = document.querySelector('script[type="application/ld+json"]')
    if (structuredData) {
      if (!ldScript) {
        ldScript = document.createElement('script')
        ldScript.type = 'application/ld+json'
        document.head.appendChild(ldScript)
      }
      ldScript.textContent = JSON.stringify(structuredData)
    } else if (ldScript) {
      ldScript.remove()
    }
  }, [fullTitle, description, fullCanonical, ogImage, type, structuredData])

  return null // Head-only component — no DOM output
}

/**
 * Generate Product structured data (JSON-LD) for a product page.
 */
export function productStructuredData(product, siteUrl = 'https://naijamart.com') {
  if (!product) return null

  const offers = {
    '@type': 'Offer',
    price: product.price,
    priceCurrency: 'NGN',
    availability: product.inStock !== false
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock',
    url: `${siteUrl}/product/${product.id}`,
    seller: product.vendor ? {
      '@type': 'Organization',
      name: product.vendor,
    } : undefined,
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || undefined,
    image: product.images?.length > 0
      ? product.images.map((img) => (img.startsWith('http') ? img : `${siteUrl}${img}`))
      : product.image ? [product.image.startsWith('http') ? product.image : `${siteUrl}${product.image}`] : undefined,
    category: product.category || undefined,
    brand: product.vendor ? { '@type': 'Brand', name: product.vendor } : undefined,
    offers,
    aggregateRating: product.reviews > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.reviews,
      bestRating: 5,
      worstRating: 1,
    } : undefined,
    sku: product.id,
  }
}

/**
 * Generate BreadcrumbList structured data.
 */
export function breadcrumbStructuredData(items, siteUrl = 'https://naijamart.com') {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url ? `${siteUrl}${item.url}` : undefined,
    })),
  }
}

/**
 * Generate Organization structured data for the marketplace.
 */
export function organizationStructuredData(siteUrl = 'https://naijamart.com') {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'NaijaMart',
    url: siteUrl,
    description: 'Nigeria\'s online marketplace — buy and sell electronics, fashion, home goods, and more from verified Nigerian vendors.',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Lagos',
      addressCountry: 'NG',
    },
    sameAs: [],
  }
}
