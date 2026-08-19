import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { rateLimit } from '../middleware/rateLimit.js'

const router = Router()

// Rate limit AI generation to prevent abuse
const aiRateLimit = rateLimit({ windowMs: 60_000, max: 5, message: 'Too many AI requests — please wait a minute' })

// POST /api/ai/generate-product - generate product titles, descriptions, and tags
router.post('/generate-product', requireAuth, requireRole('vendor'), aiRateLimit, async (req, res) => {
  const { prompt } = req.body || {}
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
    return res.status(400).json({ message: 'Please provide a short product description (at least 3 characters)' })
  }

  // If no OpenAI key is configured, return a helpful message
  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({
      message: 'AI generation is not configured. Set OPENAI_API_KEY to enable this feature.',
    })
  }

  try {
    const { default: OpenAI } = await import('openai')
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const systemPrompt = `You are a product listing assistant for a Nigerian e-commerce marketplace called NaijaMart.
Given a short product description, generate:
1. Three product title options (concise, SEO-friendly, max 80 chars each)
2. Three product description options (2-3 sentences, highlight key features, speak to Nigerian buyers)
3. Ten SEO tags (single words or short phrases, lowercase)

Return ONLY valid JSON with this structure:
{
  "titles": ["title1", "title2", "title3"],
  "descriptions": ["desc1", "desc2", "desc3"],
  "tags": ["tag1", "tag2", ...]
}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt.trim() },
      ],
      temperature: 0.7,
      max_tokens: 500,
    })

    const content = completion.choices[0]?.message?.content || ''
    // Try to parse JSON from the response (may be wrapped in markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return res.status(500).json({ message: 'AI returned an unexpected response' })
    }

    const result = JSON.parse(jsonMatch[0])
    res.json({
      titles: Array.isArray(result.titles) ? result.titles.slice(0, 3) : [],
      descriptions: Array.isArray(result.descriptions) ? result.descriptions.slice(0, 3) : [],
      tags: Array.isArray(result.tags) ? result.tags.slice(0, 10) : [],
    })
  } catch (err) {
    console.error('AI generation error:', err.message)
    res.status(500).json({ message: 'Failed to generate product details. Please try again.' })
  }
})

export default router
