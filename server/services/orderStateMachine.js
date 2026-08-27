// Order State Machine
//
// Enforces legal order status transitions. Prevents invalid state changes
// such as "delivered → pending" or "cancelled → delivered".
//
// Legal transitions (admin-controlled):
//   pending   → processing, cancelled
//   processing → shipped, cancelled
//   shipped   → delivered, cancelled (only if not yet delivered)
//   delivered → (terminal — no transitions except via refund flow)
//   cancelled → (terminal — no transitions)

export const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']

// Map of allowed transitions: fromStatus → Set of allowed toStatus
const ALLOWED_TRANSITIONS = new Map([
  ['pending', new Set(['processing', 'cancelled'])],
  ['processing', new Set(['shipped', 'cancelled'])],
  ['shipped', new Set(['delivered', 'cancelled'])],
  ['delivered', new Set()],     // terminal
  ['cancelled', new Set()],     // terminal
])

/**
 * Check if a status transition is legal.
 * @param {string} from - Current order status
 * @param {string} to - Desired new status
 * @returns {boolean} Whether the transition is allowed
 */
export function canTransition(from, to) {
  if (!ORDER_STATUSES.includes(from) || !ORDER_STATUSES.includes(to)) return false
  if (from === to) return true // idempotent
  const allowed = ALLOWED_TRANSITIONS.get(from)
  return allowed ? allowed.has(to) : false
}

/**
 * Get the list of legal transitions from a given status.
 * @param {string} from - Current order status
 * @returns {string[]} Allowed target statuses
 */
export function legalTransitions(from) {
  const allowed = ALLOWED_TRANSITIONS.get(from)
  return allowed ? [...allowed] : []
}

/**
 * Validate a transition or throw an error.
 * @param {string} from - Current order status
 * @param {string} to - Desired new status
 * @throws {Error} If the transition is not allowed
 */
export function assertTransition(from, to) {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid order status transition: ${from} → ${to}. Allowed: ${legalTransitions(from).join(', ') || '(terminal)'}`)
  }
}
