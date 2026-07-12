# Complete Auth Email Flow Documentation

## Overview

This document describes the fixed Supabase authentication email flow for signup verification and password recovery.

---

## 1. Signup Email Verification Flow

### Step-by-Step

1. User fills signup form with email, password, full name
2. Frontend calls `supabase.auth.signUp()` with:
   - `emailRedirectTo: ${getSiteUrl()}/auth/callback`
3. Supabase sends verification email to user
4. User clicks email link → browser redirected to `/auth/callback?code=XXX`
5. Callback route:
   - Receives `code` parameter
   - Calls `supabase.auth.exchangeCodeForSession(code)`
   - Verifies user session exists
   - Redirects to `/account?emailVerified=true`
6. Account page shows toast: "Email verified successfully!"

### Files Involved

- **Frontend**: `app/auth/signup/page.tsx`
  - Uses `getSiteUrl()` helper for redirect URL
  - Shows "check inbox" confirmation screen

- **Backend**: `app/auth/callback/route.ts`
  - Handles code exchange
  - Returns proper error messages if token is invalid
  - Redirects to `/account` with `emailVerified=true` param

- **Toast**: `components/AccountPageClient.tsx`
  - Detects `emailVerified` search param
  - Shows success toast on `/account` page

---

## 2. Password Reset Flow

### Step-by-Step

1. User goes to `/auth/forgot` (forgot password page)
2. User enters email address
3. Frontend calls `supabase.auth.resetPasswordForEmail(email)` with:
   - `redirectTo: ${getSiteUrl()}/reset-password`
4. Supabase sends password reset email
5. User clicks reset link → browser goes to `/reset-password` with hash token
   - URL looks like: `/reset-password#access_token=...&type=recovery`
6. Reset password page:
   - Verifies hash contains `type=recovery`
   - Checks if user session exists (Supabase auto-signs in from hash)
   - If valid: shows password form
   - If invalid/expired: shows error + "resend email" button
7. User enters new password + confirm password
8. Frontend calls `supabase.auth.updateUser({ password })`
9. Shows success screen
10. User clicks "Sign In" → redirects to `/auth/login`

### Files Involved

- **Frontend**: `app/auth/forgot/page.tsx`
  - Uses `getSiteUrl()` helper
  - Shows "check email" confirmation screen after sending

- **Frontend**: `app/reset-password/page.tsx`
  - Verifies recovery token in URL hash
  - Checks for active session
  - Handles expired/invalid tokens
  - Shows password form with eye-toggle visibility
  - Updates password via `supabase.auth.updateUser()`

---

## 3. Environment Variables

### Required

Add to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # Or your production domain
```

### Purpose of NEXT_PUBLIC_SITE_URL

- Used in email redirect links
- Must match your actual domain
- In development: `http://localhost:3000`
- In production: `https://yourdomain.com`
- **Why needed**: Email links are sent from Supabase servers. If user clicks email on different device/browser, `window.location.origin` won't work. This env var provides the correct origin.

---

## 4. Helper Function: getSiteUrl()

**File**: `lib/auth-helpers.ts`

```typescript
export function getSiteUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;  // Browser: use current origin
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) return siteUrl;      // Server/build: use env var
  return "http://localhost:3000";   // Fallback
}
```

**Usage**: Call in any client component doing auth redirects
```typescript
emailRedirectTo: `${getSiteUrl()}/auth/callback`
```

---

## 5. Error Handling

### Signup Verification Errors

| Scenario | Behavior |
|----------|----------|
| Invalid code | Error page: "Email verification failed. Please try signing up again." |
| Session exchange fails | Redirects to login with error |
| Already verified | Code exchange is idempotent, redirects to account |

### Password Reset Errors

| Scenario | Behavior |
|----------|----------|
| Missing/invalid token | Error page with "Get New Reset Link" button |
| Expired link (>24h) | Error message: "Link may have expired" + resend option |
| No active session | Error: "Session expired. Please request a new link." |
| Password update fails | Shows error on form, allows retry |

---

## 6. Edge Cases Handled

✅ **User already verified trying to sign up again**
- Code exchange is safe to retry; redirects to account

✅ **User clicks reset link but forgets password**
- "Resend Email" button on error page sends new link

✅ **Password reset link expires (>24 hours)**
- Shows friendly error + resend option

✅ **User navigates directly to `/reset-password` without token**
- Shows error: "Invalid reset link"

✅ **User bookmarks reset link and comes back later**
- Hash token is only valid once; shows error on second attempt

✅ **Email verification with `?next=/some-page` param**
- Callback respects `next` param and redirects there after verification

---

## 7. Security Considerations

✅ **HTTPS in production**
- All auth cookies sent over HTTPS only
- Email links use `redirectTo` with https:// URL

✅ **Token handling**
- Tokens never exposed in logs (only in URL hash)
- Hash fragment (`#`) is not sent to server, only processed by browser

✅ **Session validation**
- Reset page checks for active session before allowing password update
- Callback verifies session after code exchange

✅ **Rate limiting**
- Supabase handles rate limiting on email sends
- If user spams "resend", Supabase returns error

---

## 8. Testing the Flow

### Local Development

1. Set `.env.local`:
   ```
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

2. In Supabase dashboard → Auth → Settings:
   - Add `http://localhost:3000` to allowed redirect URLs

3. Sign up:
   - Go to `/auth/signup`
   - Submit form
   - Supabase email preview shows link (or check "Email Templates" in dashboard)
   - Click link → should see account page with green toast

4. Reset password:
   - Go to `/auth/forgot`
   - Enter email from step 3
   - Click reset link
   - Enter new password
   - Should see success page

### Production

1. In Supabase dashboard → Auth → Settings:
   - Add `https://yourdomain.com` to allowed redirect URLs

2. Update `.env.local` (or deploy config):
   ```
   NEXT_PUBLIC_SITE_URL=https://yourdomain.com
   ```

3. Test with real email (Supabase free tier has email limits)

---

## 9. Files Changed/Created

### Created
- `lib/auth-helpers.ts` — getSiteUrl() helper
- `components/PasswordInput.tsx` — Reusable password field with eye toggle
- `components/Toast.tsx` — Toast notification component
- `components/AccountPageClient.tsx` — Client wrapper for account page toast
- `app/reset-password/page.tsx` — Password reset page
- `.env.example` — Environment variable template

### Modified
- `app/auth/callback/route.ts` — Complete rewrite for both flows
- `app/auth/signup/page.tsx` — Use getSiteUrl() helper
- `app/auth/forgot/page.tsx` — Use getSiteUrl(), point to /reset-password
- `app/auth/login/page.tsx` — Use PasswordInput component
- `app/account/page.tsx` — Wrap with AccountPageClient for toast

### Deleted
- `app/auth/reset/page.tsx` — Old incorrect reset page

---

## 10. Common Issues & Solutions

### Issue: "Invalid reset link" on every load

**Cause**: Token hash is only valid once. Supabase consumes it on first access.

**Solution**: User must click the email link only once and immediately set password.

### Issue: Email links go to wrong domain in production

**Cause**: `NEXT_PUBLIC_SITE_URL` not set or incorrect.

**Solution**: 
1. Check `.env.local` has correct domain
2. Verify domain in Supabase → Auth → Settings → Redirect URLs

### Issue: "Session expired" on reset page

**Cause**: User waited >24 hours between clicking email and submitting form.

**Solution**: Ask user to request a new reset link.

### Issue: Toast doesn't show on account page

**Cause**: `AccountPageClient` component not wrapping content properly.

**Solution**: Verify `app/account/page.tsx` imports and wraps JSX with `<AccountPageClient>`.
