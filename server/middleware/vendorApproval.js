// Middleware that blocks vendors whose application is still pending or rejected.
// Admins are always allowed through.
export function requireApprovedVendor(req, res, next) {
  if (req.user?.role === 'admin') return next()
  if (req.user?.role === 'vendor' && req.user?.vendorStatus !== 'approved') {
    return res.status(403).json({
      message:
        req.user?.vendorStatus === 'rejected'
          ? 'Your vendor application was not approved. Please contact support.'
          : 'Your vendor application is still under review. You will be able to list products once approved.',
    })
  }
  next()
}
