# PostHog signup & conversion journey

Source of truth for KeenVPN signup funnel events in PostHog.
Reuse these names — do not invent aliases (`signup_completed` → use `user_account_created`).

## Funnel (core)

| Step | Event | Where it fires |
| --- | --- | --- |
| 1 | `$pageview` / `website_visit` | Portal page views |
| 2 | `signup_started` | Sign-in / subscribe / magic-link entry (once per browser) |
| 3 | `signup_method_selected` | User chooses Google, Apple, or email |
| 4 | `email_verified` | Email signup branch only: OTP or magic-link verification succeeds (not required for Google/Apple) |
| 5 | `user_account_created` | New KeenVPN account created |
| 6 | `app_download_clicked` | Store / download CTA clicked (intent only) |
| 7 | `app_authenticated` | Native app first authenticated session (backend `product_events`; not yet mirrored to PostHog from apps) |
| 8 | `trial_started` | Trial begins |
| 9 | `subscription_started` | Paid subscription begins |

## Identity

- PostHog distinct id = stable KeenVPN `user.id` via `posthog.identify`
- Person properties (when known): `email`, `auth_provider`, `keen_environment`
- Anonymous pre-signup activity merges into the identified person when PostHog identity linking applies
- Internal/test traffic (`@keenvpn.com`, `@vpnkeen.com`, `?ph_internal=1`) is opted out

## Standard properties

Attached when available (UTMs from first-touch storage):

- `user_id`
- `utm_source` / `utm_medium` / `utm_campaign` / `utm_content` / `utm_term`
- `landing_path` / `landing_url`
- `platform` / `download_platform` / `signup_method`
- `source_page` / `cta` / `store_url` (download clicks)

## Country

Use PostHog GeoIP person/event properties (`$geoip_country_code`, `$geoip_country_name`).
Do not ask users for country. Enable GeoIP in the PostHog project if missing.

## Reporting notes

- Exclude internal users with the existing Internal / Test filter (`is_internal` / opted-out staff)
- Trial and paid remain separate events
- `app_download_clicked` is intent, not a confirmed install
- `app_authenticated` lives in backend product events today; PostHog funnel step 7 may be incomplete until native apps (or a server forwarder) emit it to PostHog

## PostHog UI — Signup conversion funnel

Create a **Funnel** insight named **Signup conversion journey**.

**Steps (ordered):**

1. `$pageview` (or `website_visit`)
2. `signup_started`
3. `user_account_created`
4. `app_authenticated` *(optional until native → PostHog; omit if empty)*
5. `trial_started`
6. `subscription_started`

**Conversion window:** 14 days (adjust as needed).

**Global filter (required):**

- Exclude internal / test users — use the existing project filter
  (e.g. `is_internal` is not `true`, and/or email does not contain `@keenvpn.com` / `@vpnkeen.com`).

**Breakdowns to enable (or duplicate insights for):**

- Country → `$geoip_country_name` or `$geoip_country_code`
- Platform → `platform` / `download_platform` / `$os` as available
- Acquisition → `utm_source`, `utm_campaign`, `landing_path`

Optional intermediate steps for deeper drop-off analysis:

- `signup_method_selected` after `signup_started`
- `email_verified` after method select (email path only; skip for Google/Apple funnels)
- `app_download_clicked` after `user_account_created`

## PostHog UI — USA acquisition view

Create a **Trends** (or **Insight**) named **Signups by country**:

- Event: `user_account_created`
- Series breakdown: `$geoip_country_name` (or `$geoip_country_code`)
- Same internal/test exclusion filter as the funnel
- Pin or highlight **United States** (`US` / `United States`)
- Optional twin series: `signup_started` broken down by country for top-of-funnel mix

Add both insights to a dashboard named **Signup journey** (or existing growth dashboard).
