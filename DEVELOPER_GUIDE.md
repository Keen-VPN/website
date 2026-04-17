# Website Developer Guide

This document covers the features, architecture decisions, and integration points of the KeenVPN marketing and account management website. It is intended for both existing team members and new developers onboarding to the project.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Feature Map](#feature-map)
3. [Architecture Decisions](#architecture-decisions)
4. [File Map](#file-map)
5. [Integration Points](#integration-points)
6. [Authentication Flows](#authentication-flows)
7. [Deployment](#deployment)
8. [Common Patterns](#common-patterns)
9. [Known Gotchas](#known-gotchas)

---

## Tech Stack

- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** with custom brand theme
- **shadcn/ui** for component primitives (`src/components/ui/`)
- **Firebase** for authentication (Google + Apple Sign-In)
- **Path alias:** `@/*` maps to `src/*`

---

## Feature Map

### Pricing System

**Files:** `src/pages/Pricing.tsx`, `src/components/Pricing.tsx`, `src/constants/pricing.ts`, `src/lib/pricing.ts`

The pricing page is one of the most complex features:

- **Dynamic plan loading** -- Plans are fetched from the backend API (`/api/subscription/plans`), not hardcoded. The `Pricing` component handles loading/error states with fallback to constants.
- **Plan tiers** -- Free, Premium Monthly, Premium Yearly, Enterprise. Enterprise shows "Custom" pricing and opens the Contact Sales dialog.
- **Feature comparison** -- Per-plan feature lists defined in `src/constants/pricing.ts`.
- **FAQ accordion** -- Common questions with answers, also in constants.
- **Pricing utility** -- `src/lib/pricing.ts` provides helpers for plan data transformation (monthly equivalent for annual plans, billing period labels).

### Contact Sales (Enterprise)

**Files:** `src/components/ContactSalesForm.tsx`, `src/constants/contact-enterprise.ts`

- Full-featured form with Zod validation for enterprise customers.
- Fields: name, email, company, team size, use case.
- Submits to the backend `POST /api/sales-contact` endpoint.
- Reference ID generated and copyable to clipboard after submission.
- Opens as a dialog from the Enterprise pricing card.

### Subscription Checkout Flow

**Files:** `src/pages/Subscribe.tsx`, `src/auth/backend.ts`

- User selects a plan (defaults to Premium Monthly).
- `createCheckoutSession()` calls the backend to create a Stripe checkout session.
- User is redirected to Stripe's hosted checkout page.
- On completion, Stripe redirects to `PaymentSuccess.tsx` or `PaymentCancel.tsx`.
- Success/cancel pages include deep link generation for native app users.

### Account Management

**Files:** `src/pages/Account.tsx`, `src/auth/backend.ts`

The account page is the hub for authenticated users:

- **Subscription status** -- Displays current plan, renewal date, and management actions.
- **Manage Subscription** -- Opens Stripe billing portal via `createBillingPortalSession()`.
- **Cancel Subscription** -- Cancels auto-renewal with confirmation dialog.
- **Linked Accounts** -- Shows connected auth providers (Google/Apple) with link/unlink actions.
- **Account Deletion** -- Delete account with confirmation.
- **Refund information** -- Instructions and mailto link for refund requests.
- **Deep link support** -- Detects if the user came from a native app and provides return deep links.
- **Skeleton loading** -- Uses skeleton UI while loading subscription and account data.

### Account Linking

**Files:** `src/components/LinkedAccounts.tsx`, `src/auth/backend.ts`, `src/contexts/AuthContext.tsx`

Users can link multiple auth providers (Google + Apple) to a single account:

- `LinkedAccounts` component shows each connected provider with a status badge.
- **Link** -- Initiates OAuth flow for the new provider, sends token to backend `linkProvider()`.
- **Unlink** -- Confirmation dialog, calls backend `unlinkProvider()`. Validates at least one provider remains.
- **Error handling** -- Firebase-specific error types for credential conflicts.
- **Loading states** -- Skeleton placeholders while fetching linked providers.

### Subscription History

**Files:** `src/pages/SubscriptionHistory.tsx`, `src/components/SubscriptionEventDetail.tsx`, `src/components/SubscriptionHistoryFilters.tsx`, `src/components/SubscriptionHistoryEmptyState.tsx`, `src/components/SubscriptionHistoryErrorState.tsx`, `src/hooks/useSubscriptionHistory.ts`, `src/lib/subscription-history-api.ts`

A complete subscription event timeline:

- **History page** -- Shows summary stats (total paid, active duration, event count) and a chronological event list.
- **Event detail** -- Each event (charge, renewal, cancellation, etc.) expands to show full details. Responsive layout for mobile.
- **Filters** -- Filter by event type, date range, and search. Built as a dedicated `SubscriptionHistoryFilters` component.
- **API client** -- `subscription-history-api.ts` (562 lines) handles data fetching, transformation, pagination, and error mapping. This is the most substantial API client in the frontend.
- **Custom hook** -- `useSubscriptionHistory` encapsulates all state management and data fetching logic.
- **Empty/error states** -- Dedicated components for zero-data and failure scenarios.

### ASWebAuthenticationSession Bridge

**Files:** `src/auth/firebase.ts`, `src/contexts/AuthContext.tsx`, `src/pages/Account.tsx`

The website serves as an OAuth bridge for the native macOS app:

1. macOS app opens the website in `ASWebAuthenticationSession`.
2. User authenticates via Firebase (Google/Apple OAuth).
3. Website processes the auth redirect result.
4. Website redirects back to the native app via custom URL scheme, passing the access token.

This flow is handled in `firebase.ts` (redirect result processing) and `AuthContext.tsx` (token extraction and deeplink generation).

### App Store Downloads

**Files:** `src/constants/app-store-urls.ts`, `src/hooks/use-app-store-url.ts`, `src/lib/device-detection.ts`

- Platform detection (`device-detection.ts`) identifies macOS, iOS, and other platforms via user agent.
- `use-app-store-url` hook returns the appropriate download URL for the detected platform.
- Download buttons in `Header.tsx` and `Hero.tsx` link to the correct app store.
- Deep link functions for `PaymentSuccess.tsx` and `PaymentCancel.tsx` redirect native app users back to the app.

### Refund Information

**Files:** `src/pages/Account.tsx`, `src/pages/Pricing.tsx`, `src/pages/Support.tsx`, `src/constants/pricing.ts`

- Refund FAQ entry in pricing constants.
- Refund request instructions with support email link on Account, Pricing, and Support pages.

### Branding

**Files:** `tailwind.config.ts`, `src/index.css`, `index.html`

- Custom color palette with "rich-black" as the primary dark color.
- CSS variables for brand colors in `src/index.css`.
- Custom font families configured in Tailwind.
- Logo assets in `public/` (dark and white variants).
- Consistent branding applied across all components.

---

## Architecture Decisions

### Constants-Driven UI

All static data (pricing plans, features, FAQs, contact form schemas, app store URLs) lives in `src/constants/`. Components are pure renderers that receive data, not data sources. This makes it easy to update copy, add plans, or modify features without touching component logic.

### API Client Abstraction

Backend API calls are centralized in two files:

- `src/auth/backend.ts` -- Auth-related calls (checkout, billing portal, account linking, deletion).
- `src/lib/subscription-history-api.ts` -- Subscription history data fetching.

These files handle request construction, error extraction, and response transformation. Components never make raw `fetch` calls.

### AuthContext as State Hub

`src/contexts/AuthContext.tsx` is the central state manager for:

- Firebase auth state (user, loading, error)
- Auth provider tracking (Google/Apple) with localStorage persistence
- Linked accounts state
- Session token management
- Subscription loading state

It's been heavily modified over time (10+ commits) and is one of the most critical files.

### Session Token over Firebase ID Token

The app migrated from using Firebase ID tokens directly to session tokens for backend calls. This aligns with the backend's session-based auth model and avoids issues with token expiration during long sessions.

### Skeleton Loading over Spinners

The Account page and LinkedAccounts component use skeleton UI patterns (gray animated placeholders matching the layout) instead of loading spinners. This provides better perceived performance and prevents layout shifts.

### Netlify Deployment

Migrated from GitHub Pages to Netlify in December 2025. The `netlify.toml` configures:
- Build command: `npm run build`
- Publish directory: `dist`
- Node.js version specification

---

## File Map

### Pages (`src/pages/`)

| File | Route | Purpose |
|------|-------|---------|
| `Pricing.tsx` | `/pricing` | Plan comparison, FAQ, enterprise contact |
| `Subscribe.tsx` | `/subscribe` | Plan selection and Stripe checkout |
| `Account.tsx` | `/account` | Account management hub |
| `SubscriptionHistory.tsx` | `/subscription-history` | Event timeline and filters |
| `SignIn.tsx` | `/signin` | Firebase auth (primary) |
| `SignInNew.tsx` | `/signin-new` | Updated sign-in design |
| `Support.tsx` | `/support` | Support info and contact |
| `PaymentSuccess.tsx` | `/payment-success` | Post-checkout success with deep links |
| `PaymentCancel.tsx` | `/payment-cancel` | Post-checkout cancellation with deep links |

### Components (`src/components/`)

| File | Purpose |
|------|---------|
| `Header.tsx` | Navigation bar with download button |
| `Hero.tsx` | Landing page hero section |
| `Features.tsx` | Feature showcase section |
| `Footer.tsx` | Site footer with links |
| `Pricing.tsx` | Pricing card grid component |
| `ContactSalesForm.tsx` | Enterprise contact form with validation |
| `LinkedAccounts.tsx` | Provider linking/unlinking UI |
| `SubscriptionEventDetail.tsx` | Individual subscription event display |
| `SubscriptionHistoryFilters.tsx` | Filter controls for subscription history |
| `SubscriptionHistoryEmptyState.tsx` | Empty state for no subscription events |
| `SubscriptionHistoryErrorState.tsx` | Error state for failed data loading |
| `ui/*` | shadcn/ui primitives (do not edit directly) |

### Auth (`src/auth/`)

| File | Purpose |
|------|---------|
| `firebase.ts` | Firebase initialization, OAuth redirect handling |
| `backend.ts` | Backend API client for auth-related operations |
| `types.ts` | Auth type definitions |
| `index.ts` | Re-exports |

### Hooks (`src/hooks/`)

| File | Purpose |
|------|---------|
| `useSubscriptionHistory.ts` | Subscription history data fetching and state |
| `use-app-store-url.ts` | Platform-appropriate app store URL |

### Libraries (`src/lib/`)

| File | Purpose |
|------|---------|
| `subscription-history-api.ts` | Subscription history API client (562 lines) |
| `device-detection.ts` | Platform/OS detection and deep link generation |
| `pricing.ts` | Pricing data transformation helpers |
| `utils.ts` | `cn()` utility for className merging (Tailwind + clsx) |

### Constants (`src/constants/`)

| File | Contents |
|------|----------|
| `pricing.ts` | Plans, features, FAQs, refund info |
| `contact-enterprise.ts` | Contact form schema and options |
| `app-store-urls.ts` | iOS App Store and Mac App Store URLs |

### Context (`src/contexts/`)

| File | Purpose |
|------|---------|
| `AuthContext.tsx` | Central auth state provider |

---

## Integration Points

### With Backend (`vpn-backend-service-v2`)

All backend calls go through `src/auth/backend.ts` or `src/lib/subscription-history-api.ts`:

| Function | Backend Endpoint | Purpose |
|----------|-----------------|---------|
| `createCheckoutSession` | `POST /api/v1/payment/stripe/create-checkout-session` | Start Stripe checkout |
| `createBillingPortalSession` | `POST /api/v1/subscription/billing-portal` | Open Stripe billing portal |
| `cancelSubscription` | `POST /api/v1/subscription/cancel` | Cancel auto-renewal |
| `linkProvider` | `POST /api/v1/auth/link-provider` | Link Google/Apple account |
| `unlinkProvider` | `POST /api/v1/auth/unlink-provider` | Remove linked provider |
| `getLinkedProviders` | `GET /api/v1/account/linked-providers` | Fetch linked accounts |
| `deleteAccount` | `DELETE /api/v1/account` | Delete user account |
| `fetchSubscriptionPlans` | `GET /api/v1/subscription/plans` | Get available plans |
| (subscription history) | `GET /api/v1/subscription/history` | Fetch event timeline |
| (contact sales) | `POST /api/v1/sales-contact` | Submit enterprise inquiry |

### With Apple Apps (`vpn-app-apple`)

- **ASWebAuthenticationSession** -- The website is the OAuth target for macOS Google Sign-In. The auth flow completes on the website and passes the token back via custom URL scheme.
- **Deep links** -- `PaymentSuccess.tsx` and `PaymentCancel.tsx` generate deep links to redirect native app users back after payment.
- **Device detection** -- `device-detection.ts` identifies the user's platform to show appropriate download links and deep link buttons.
- **App Store URLs** -- Platform-specific download links in `app-store-urls.ts`.

### With Stripe

- Checkout sessions redirect to Stripe's hosted page.
- Billing portal sessions redirect to Stripe's subscription management.
- No direct Stripe.js integration on the frontend; everything goes through the backend.

### With Firebase

- Firebase Authentication for Google and Apple Sign-In.
- Firebase config in `src/auth/firebase.ts`.
- Auth state management in `src/contexts/AuthContext.tsx`.

---

## Authentication Flows

### Standard Web Login

```
1. User clicks "Sign In" → SignIn.tsx
2. Firebase signInWithPopup (Google) or signInWithApple
3. AuthContext receives Firebase user
4. Backend session created with Firebase ID token
5. Session token stored for subsequent API calls
```

### macOS App OAuth Bridge

```
1. macOS app opens ASWebAuthenticationSession → website/account
2. Website triggers Firebase Google OAuth redirect
3. Firebase processes redirect, returns user + token
4. Website detects ASWebAuth context
5. Website constructs deep link URL with access token
6. Redirect to keenvpn://auth?token=... → macOS app receives token
```

### Account Linking

```
1. User logged in with Provider A (e.g., Google)
2. Clicks "Link Apple Account" in LinkedAccounts component
3. Firebase linkWithPopup/linkWithApple for Provider B
4. On success, calls backend linkProvider() with Provider B's token
5. Backend validates, checks conflicts, creates LinkedAccount record
6. UI updates to show both providers
```

---

## Deployment

### Netlify Configuration (`netlify.toml`)

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"
```

### Build Commands

```bash
npm install        # Install dependencies
npm run dev        # Dev server (port 8080)
npm run build      # Production build
npm run lint       # ESLint
npm run typecheck  # TypeScript type checking
```

### Environment Variables

Firebase configuration and backend URL are embedded at build time. Check `.env` or `.env.production` for:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_BACKEND_URL` (defaults to `https://vpnkeen.netlify.app`)

---

## Common Patterns

### Backend Error Extraction

```typescript
// src/auth/backend.ts
function extractBackendErrorMessage(error: unknown): string {
  // Extracts human-readable error from backend response format:
  // { success: false, error: { message: "..." } }
}
```

Used across all API calls for consistent error messaging in toasts.

### Toast Notifications

Success/error feedback uses toast notifications consistently:
- Account linking success/failure
- Subscription cancellation
- Clipboard copy confirmation
- Auth errors

### Protected Routes

Authenticated pages use `ProtectedRoute` wrapper in `App.tsx` that redirects to sign-in if the user is not authenticated.

### Constants Pattern

```typescript
// src/constants/pricing.ts
export const PRICING_PLANS = [
  { id: 'free', name: 'Free', price: 0, features: [...] },
  { id: 'premium_monthly', name: 'Premium', price: 9.99, ... },
  // ...
];

export const PRICING_FAQS = [
  { question: '...', answer: '...' },
  // ...
];
```

Components import and render these; no business data lives in JSX.

---

## Known Gotchas

1. **AuthContext complexity** -- `AuthContext.tsx` has grown significantly over time (10+ modifications). It manages Firebase auth, session tokens, auth providers, linked accounts, and subscription loading. It's the most likely source of state bugs. Consider the interaction between `authProvider` localStorage persistence and the actual Firebase auth state.

2. **shadcn/ui components** -- Files in `src/components/ui/` are auto-generated by shadcn. Do not edit them directly. To add a new component: `npx shadcn-ui add <component>`.

3. **Subscription history API size** -- `subscription-history-api.ts` is 562 lines with complex data transformation logic. Changes here need careful testing as they affect the entire subscription history display.

4. **ASWebAuthenticationSession timing** -- The macOS OAuth bridge flow depends on precise redirect handling. If the redirect URL scheme changes or Firebase config is updated, the macOS app's auth flow will break.

5. **Device detection user agent parsing** -- `device-detection.ts` uses user agent string parsing for platform detection. This can break with new browser versions or unusual user agents. Always test with actual devices.

6. **Stripe redirect URLs** -- Checkout session creation passes success/cancel URLs to Stripe. If the website URL changes, these need to be updated in `backend.ts`.

7. **localStorage for authProvider** -- The `authProvider` state is persisted in localStorage. If a user clears their browser data, the provider context is lost. The UI handles this gracefully, but it means the provider badge may not show until the next sign-in.

8. **No direct Stripe.js** -- All Stripe interactions go through the backend. There's no Stripe.js loaded on the frontend, which means no client-side card handling or payment form.

9. **CSS variable dependencies** -- The brand theme uses CSS variables in `src/index.css` that Tailwind references in `tailwind.config.ts`. Changing colors requires updating both files.

10. **Import ordering** -- `src/auth/index.ts` re-exports from `backend.ts` and `firebase.ts`. When adding new auth functions, make sure to export them from `index.ts` as well, since components may import from `@/auth`.
