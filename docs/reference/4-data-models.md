# Data Models Reference

Mongoose schema definitions for all collections.

## User

**Collection:** `users`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | String | Yes | Display name (trimmed) |
| `email` | String | Yes | Unique, lowercase, trimmed |
| `passwordHash` | String | Yes | bcrypt hash (10 rounds) |
| `role` | String | No | `"customer"` (default), `"vendor"`, `"admin"` |
| `vendorStatus` | String | No | `"pending"`, `"approved"`, `"rejected"` — vendors only |
| `logo` | String | No | Vendor logo path (`/images/vendors/...`) |
| `banner` | String | No | Vendor banner image path |
| `bio` | String | No | Vendor bio text |
| `whatsapp` | String | No | Vendor WhatsApp number (for order notifications) |
| `slug` | String | No | URL-friendly vendor slug (auto-generated, unique) |

## Product

**Collection:** `products`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | String | Yes | Product name (trimmed) |
| `description` | String | No | Product description |
| `category` | String | Yes | Category name |
| `price` | Number | Yes | Current price (min: 0) |
| `oldPrice` | Number | No | Original price for discount display |
| `image` | String | Yes | Primary image path |
| `images` | [String] | No | Additional image paths |
| `inStock` | Boolean | No | Whether product is available (default: true) |
| `badge` | String | No | Display badge (e.g., "Flash Sale") |
| `rating` | Number | No | Average rating (0-5, default: 4.0) |
| `reviews` | Number | No | Review count (default: 0) |
| `tags` | [String] | No | SEO tags (lowercase) |
| `approved` | Boolean | No | Moderation flag (default: true) |
| `vendorId` | ObjectId→User | Yes | Owning vendor (indexed) |

**Indexes:** Text index on `name`, `description`, `category`, `tags`

## Order

**Collection:** `orders`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `customerName` | String | Yes | Buyer's name |
| `customerEmail` | String | No | Buyer's email (for notifications) |
| `customerPhone` | String | Yes | Buyer's phone |
| `customerAddress` | String | Yes | Delivery address |
| `customerId` | ObjectId→User | No | Logged-in buyer's ID (null for guest checkout) |
| `items` | [OrderItem] | Yes | Line items (see below) |
| `total` | Number | Yes | Order total |
| `payment` | Payment | Yes | Payment details (see below) |
| `status` | String | No | `"pending"`, `"processing"`, `"shipped"`, `"delivered"`, `"cancelled"` |
| `deliveredAt` | Date | No | When order was marked delivered |
| `couponCode` | String | No | Applied coupon code |
| `discountAmount` | Number | No | Discount amount applied |

**OrderItem:**
| Field | Type | Description |
|-------|------|-------------|
| `productId` | ObjectId→Product | Product reference |
| `vendorId` | ObjectId→User | Vendor who owns this product |
| `name` | String | Product name (snapshot at time of order) |
| `image` | String | Product image (snapshot) |
| `price` | Number | Price at time of order (snapshot) |
| `qty` | Number | Quantity (min: 1) |
| `fulfillment` | String | `"pending"`, `"sent"`, `"received"` |
| `refunded` | Boolean | Whether this line has been refunded |

**Payment:**
| Field | Type | Description |
|-------|------|-------------|
| `method` | String | `"card"`, `"transfer"`, `"cod"` |
| `status` | String | `"pending"`, `"captured"`, `"refunded"` |
| `amount` | Number | Payment amount |
| `capturedAt` | Date | When payment was captured |

**Indexes:** `{ "items.vendorId": 1 }`

## Ledger

**Collection:** `ledgers`

| Field | Type | Description |
|-------|------|-------------|
| `type` | String | `"capture"`, `"commission"`, `"payout"`, `"refund"`, `"commission_reversal"`, `"clawback"` |
| `orderId` | ObjectId→Order | Related order |
| `vendorId` | ObjectId→User | Related vendor (nullable for platform entries) |
| `from` | String | Source account (e.g., `"buyer"`, `"platform:escrow"`) |
| `to` | String | Destination account (e.g., `"platform:escrow"`, `"seller:<id>"`) |
| `amount` | Number | Amount in naira (whole numbers only) |
| `reference` | String | Unique idempotency key (e.g., `"capture:<orderId>"`) |
| `description` | String | Human-readable description |
| `actor` | String | Who triggered this (`"system"` or user ID) |

## Review

**Collection:** `reviews`

| Field | Type | Description |
|-------|------|-------------|
| `orderId` | ObjectId→Order | Verified purchase order |
| `productId` | ObjectId→Product | Product being reviewed |
| `vendorId` | ObjectId→User | Product's vendor |
| `customerId` | ObjectId→User | Reviewer |
| `rating` | Number | 1-5 stars |
| `title` | String | Review title |
| `text` | String | Review text |
| `images` | [String] | Review images |
| `isVerifiedPurchase` | Boolean | Always true (enforced by route) |
| `helpful` | Number | Helpful vote count |

## Notification

**Collection:** `notifications`

| Field | Type | Description |
|-------|------|-------------|
| `userId` | ObjectId→User | Recipient |
| `type` | String | Notification type (e.g., `"new_order"`, `"product_approved"`) |
| `message` | String | Display message |
| `read` | Boolean | Whether dismissed (default: false) |
| `link` | String | Route to navigate to on click |

## Wishlist

**Collection:** `wishlists`

| Field | Type | Description |
|-------|------|-------------|
| `customerId` | ObjectId→User | Who wishlisted |
| `productId` | ObjectId→Product | What was wishlisted |

## Follow

**Collection:** `follows`

| Field | Type | Description |
|-------|------|-------------|
| `customerId` | ObjectId→User | Who is following |
| `vendorId` | ObjectId→User | Which vendor |

## Coupon

**Collection:** `coupons`

| Field | Type | Description |
|-------|------|-------------|
| `code` | String | Unique uppercase code |
| `vendorId` | ObjectId→User | Creating vendor (null = platform-wide) |
| `discountType` | String | `"percent"` or `"fixed"` |
| `discountValue` | Number | Discount amount |
| `minOrder` | Number | Minimum order total to apply |
| `maxUses` | Number | Maximum total uses (null = unlimited) |
| `usedCount` | Number | Current usage count |
| `expiresAt` | Date | Expiration date |
| `active` | Boolean | Whether coupon is active |

## Withdrawal

**Collection:** `withdrawals`

| Field | Type | Description |
|-------|------|-------------|
| `vendorId` | ObjectId→User | Requesting vendor |
| `amount` | Number | Withdrawal amount |
| `status` | String | `"requested"`, `"approved"`, `"paid"`, `"rejected"` |
| `bankName` | String | Bank name |
| `accountNumber` | String | Account number |
| `accountName` | String | Account holder name |
| `processedBy` | ObjectId→User | Admin who processed |
| `processedAt` | Date | When processed |
| `notes` | String | Admin notes |
