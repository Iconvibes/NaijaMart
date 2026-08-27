/**
 * Repository facade.
 *
 * Composes all domain repositories into the single `repo` object that the
 * rest of the application imports. Every route, service, and middleware
 * continues to use `import { repo } from '../store.js'` — the internal
 * split into domain files is transparent to consumers.
 *
 * Cross-repo dependencies (analytics → orders/users, withdrawals → ledger)
 * are wired up once at the bottom of this file.
 */

import userRepo from './repositories/userRepo.js'
import productRepo from './repositories/productRepo.js'
import orderRepo from './repositories/orderRepo.js'
import ledgerRepo from './repositories/ledgerRepo.js'
import reviewRepo from './repositories/reviewRepo.js'
import notificationRepo from './repositories/notificationRepo.js'
import wishlistRepo from './repositories/wishlistRepo.js'
import followRepo from './repositories/followRepo.js'
import couponRepo from './repositories/couponRepo.js'
import withdrawalRepo from './repositories/withdrawalRepo.js'
import analyticsRepo from './repositories/analyticsRepo.js'

// ─── Compose the unified repo ────────────────────────────────────────────────
// Spread each domain's methods into a single flat object.
// IMPORTANT: do not destructure `repo` before calling methods — methods use
// `this` internally (e.g. createUser calls this.findUserBySlug).

export const repo = {
  // Users
  countUsers:            (...a) => userRepo.countUsers(...a),
  findUserByEmail:       (...a) => userRepo.findUserByEmail(...a),
  findUserById:          (...a) => userRepo.findUserById(...a),
  findUserBySlug:        (...a) => userRepo.findUserBySlug(...a),
  findVendors:           (...a) => userRepo.findVendors(...a),
  updateUser:            (...a) => userRepo.updateUser(...a),
  findAllUsers:          (...a) => userRepo.findAllUsers(...a),
  createUser:            (...a) => userRepo.createUser(...a),

  // Products
  findProducts:          (...a) => productRepo.findProducts(...a),
  findProductById:       (...a) => productRepo.findProductById(...a),
  createProduct:         (...a) => productRepo.createProduct(...a),
  updateProduct:         (...a) => productRepo.updateProduct(...a),
  deleteProduct:         (...a) => productRepo.deleteProduct(...a),
  decrementStock:        (...a) => productRepo.decrementStock(...a),
  restoreStock:          (...a) => productRepo.restoreStock(...a),

  // Orders
  createOrder:           (...a) => orderRepo.createOrder(...a),
  findOrders:            (...a) => orderRepo.findOrders(...a),
  findOrderById:         (...a) => orderRepo.findOrderById(...a),
  updateOrderStatus:     (...a) => orderRepo.updateOrderStatus(...a),
  updateOrderPayment:    (...a) => orderRepo.updateOrderPayment(...a),
  updateOrderRefunded:   (...a) => orderRepo.updateOrderRefunded(...a),
  updateOrderFulfillment:(...a) => orderRepo.updateOrderFulfillment(...a),

  // Ledger
  createLedgerEntry:     (...a) => ledgerRepo.createLedgerEntry(...a),
  findLedgerEntryByReference: (...a) => ledgerRepo.findLedgerEntryByReference(...a),
  findLedgerEntries:     (...a) => ledgerRepo.findLedgerEntries(...a),
  findVendorPayoutTotal: (...a) => ledgerRepo.findVendorPayoutTotal(...a),

  // Reviews
  createReview:          (...a) => reviewRepo.createReview(...a),
  findReviewById:        (...a) => reviewRepo.findReviewById(...a),
  findReviews:           (...a) => reviewRepo.findReviews(...a),
  countReviews:          (...a) => reviewRepo.countReviews(...a),
  updateReviewHelpful:   (...a) => reviewRepo.updateReviewHelpful(...a),
  updateProductRating:   (...a) => reviewRepo.updateProductRating(...a),
  findHelpfulVote:       (...a) => reviewRepo.findHelpfulVote(...a),
  createHelpfulVote:     (...a) => reviewRepo.createHelpfulVote(...a),

  // Notifications
  createNotification:    (...a) => notificationRepo.createNotification(...a),
  findNotifications:     (...a) => notificationRepo.findNotifications(...a),
  countNotifications:    (...a) => notificationRepo.countNotifications(...a),
  countUnreadNotifications: (...a) => notificationRepo.countUnreadNotifications(...a),
  markNotificationsRead: (...a) => notificationRepo.markNotificationsRead(...a),

  // Wishlist
  toggleWishlist:        (...a) => wishlistRepo.toggleWishlist(...a),
  findWishlist:          (...a) => wishlistRepo.findWishlist(...a),
  isWishlisted:          (...a) => wishlistRepo.isWishlisted(...a),

  // Follows
  toggleFollow:          (...a) => followRepo.toggleFollow(...a),
  findFollowing:         (...a) => followRepo.findFollowing(...a),
  countFollowers:        (...a) => followRepo.countFollowers(...a),
  isFollowing:           (...a) => followRepo.isFollowing(...a),

  // Coupons
  createCoupon:          (...a) => couponRepo.createCoupon(...a),
  findCouponByCode:      (...a) => couponRepo.findCouponByCode(...a),
  findCoupons:           (...a) => couponRepo.findCoupons(...a),
  incrementCouponUsage:  (...a) => couponRepo.incrementCouponUsage(...a),
  decrementCouponUsage:  (...a) => couponRepo.decrementCouponUsage(...a),
  incrementCouponUsageAtomic: (...a) => couponRepo.incrementCouponUsageAtomic(...a),
  toggleCouponActive:    (...a) => couponRepo.toggleCouponActive(...a),

  // Withdrawals
  createWithdrawal:      (...a) => withdrawalRepo.createWithdrawal(...a),
  createWithdrawalAtomic:(...a) => withdrawalRepo.createWithdrawalAtomic(...a),
  findWithdrawals:       (...a) => withdrawalRepo.findWithdrawals(...a),
  findWithdrawalById:    (...a) => withdrawalRepo.findWithdrawalById(...a),
  updateWithdrawalStatus:(...a) => withdrawalRepo.updateWithdrawalStatus(...a),
  getVendorBalance:      (...a) => withdrawalRepo.getVendorBalance(...a),

  // Analytics
  getVendorAnalytics:    (...a) => analyticsRepo.getVendorAnalytics(...a),
  getAdminAnalytics:     (...a) => analyticsRepo.getAdminAnalytics(...a),
  getAdminAnalyticsAggregated: (...a) => analyticsRepo.getAdminAnalyticsAggregated(...a),
}

// ─── Wire up cross-repo dependencies ─────────────────────────────────────────
// Repos that call methods on other repos receive references at init time.
// This avoids circular imports while keeping domain files focused.

withdrawalRepo.configure({ ledgerRepo, withdrawalRepo })
analyticsRepo.configure({ orderRepo, userRepo, productRepo })
