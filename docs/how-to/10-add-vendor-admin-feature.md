# Add a New Vendor or Admin Feature

End-to-end walkthrough of adding a feature to the seller center or admin dashboard.

## Example: Add a "Storefront Customization" feature for vendors

This walks through adding a feature where vendors can set a tagline for their store page.

## Steps

### 1. Add field to the User model

In `server/models/User.js`, add:

```javascript
tagline: { type: String, default: '', trim: true },
```

### 2. Update the store's `toUserObj`

In `server/store.js`, add to `toUserObj`:

```javascript
tagline: u.tagline || '',
```

### 3. Add to the in-memory `mem.users` initialization

The `createUser` method already spreads data, so new fields pass through automatically. But `toUserObj` must include it for both branches.

### 4. Add API endpoint to update the field

In `server/routes/auth.js`, the `PATCH /me` handler already allows updating profile fields. Add `tagline` to the allowed fields:

```javascript
if (tagline !== undefined) {
  updates.tagline = typeof tagline === 'string' ? tagline.trim() : ''
}
```

The `publicUser` function in `server/middleware/auth.js` must also return the field:

```javascript
export const publicUser = (u) => ({
  // ...existing fields...
  tagline: u.tagline || '',
})
```

### 5. Add frontend API method

In `src/api.js`:

```javascript
updateMe: (payload) => request('/auth/me', { method: 'PATCH', body: payload }),
```

This already exists — the `updateMe` call handles all profile fields.

### 6. Add UI to vendor settings

In `src/pages/vendor/VendorSettings.jsx`, add a form field for the tagline. The existing profile update flow already handles name, logo, banner, bio, and whatsapp — add tagline the same way.

### 7. Display on the storefront

In `src/pages/StorePage.jsx`, the vendor data comes from `GET /api/vendors/:slug`. Add `tagline` to the vendor response in `server/routes/vendors.js`:

```javascript
res.json({
  vendor: {
    // ...existing fields...
    tagline: vendor.tagline || '',
  },
  // ...
})
```

Then display it in the StorePage component.

### 8. Test the full flow

1. Login as vendor → Settings → Set tagline → Save
2. Visit `/store/<vendor-slug>` → Tagline should appear
3. Run `npm test` → All 35 tests should pass
4. Check in-memory mode works (restart server without MongoDB)

## Checklist for Any New Feature

- [ ] Mongoose schema updated (if new field)
- [ ] `toXxxObj` converter updated in store.js
- [ ] Store methods have both `isMemoryDb()` branches
- [ ] Route validates input and uses auth middleware
- [ ] `publicUser` returns new fields (if user-facing)
- [ ] Frontend API method added (if new endpoint)
- [ ] Component uses `useAsync` for data fetching
- [ ] Protected routes wrapped with `ProtectedRoute`
- [ ] Lazy-loaded if behind auth guard and heavy
- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`

## See Also

- [Add a New API Endpoint](4-add-api-endpoint.md)
- [Add a New Data Model](6-add-data-model.md)
- [Add a New Frontend Page](5-add-frontend-page.md)
