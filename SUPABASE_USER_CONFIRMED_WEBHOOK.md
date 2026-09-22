# Supabase User Email Confirmation Webhook Guide 🚀

This document guides you through setting up real-time admin email notifications on CalmReader whenever a user confirms their email address.

The event chain works automatically:
1. User clicks the verification link in their email.
2. Supabase updates their `confirmed_at` column in the `auth.users` table.
3. A Postgres trigger copies this timestamp to the `public.users` table.
4. A Supabase Database Webhook fires on the table update, securely sending a POST request to CalmReader's API.
5. CalmReader's Express server processes the webhook and sends you an email alert via your existing Brevo credentials.

---

## Step 1: Database Preparation (Run in Supabase SQL Editor)

In CalmReader, user profile entries are stored in `public.users`. Run the following SQL script to:
- Add a `confirmed_at` column to `public.users`.
- Create a trigger function that automatically mirrors `confirmed_at` changes from `auth.users`.
- Register the trigger on `auth.users`.

```sql
-- 1. Add the confirmed_at column to public.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

-- 2. Create the trigger function syncing the confirmed_at time
CREATE OR REPLACE FUNCTION public.sync_user_confirmed_at()
RETURNS TRIGGER AS $$
BEGIN
  -- If confirmed_at has just transitioned from NULL to a value
  IF OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL THEN
    UPDATE public.users
    SET confirmed_at = NEW.confirmed_at
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Bind the trigger to the auth.users table
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE OF confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_confirmed_at();
```

---

## Step 2: Configure Webhook in your Supabase Dashboard

1. In your **Supabase Dashboard**, navigate to **Database** (left sidebar) ➔ **Webhooks**.
2. Click **Create a new hook** (if webhooks aren't enabled yet, click "Enable database webhooks").
3. Fill out the hook configuration form:
   - **Name**: `user-confirmed-notification`
   - **Table**: `public` schema ➔ `users` table
   - **Events**: Check `UPDATE`
   - **HTTP Request Method**: `POST`
   - **URL**: `https://<YOUR_LIVE_APP_DOMAIN>/api/webhooks/user-confirmed`
     *(For CalmReader, this is `https://calmreader1.pages.dev/api/webhooks/user-confirmed` or your active deployed server domain)*
   - **HTTP Headers**: Add custom header:
     - Header: `x-webhook-secret`
     - Value: Choose a strong, secret random key (e.g., `MySuperSecureSecretKey123!`)
4. **Active Filters/Conditions** (Advanced Settings):
   - Only fire when the `confirmed_at` column is updated and transitions to a non-NULL value. If filters are not supported, our route handles this condition automatically.

---

## Step 3: Configure Environment Secrets

In your **AI Studio Settings / Secrets** panel (or your environment variables file), verify the following variables are present:

1. `WEBHOOK_SECRET`: The same secret string you set as the value for the `x-webhook-secret` header in Supabase.
2. `ADMIN_EMAIL`: Your primary admin email (defaults to `chukwuemekedaniella@gmail.com`).
3. `BREVO_API_KEY`: Your Brevo transactional email key.
4. `BREVO_SENDER_EMAIL`: Your verified sender address on Brevo.

---

## Step 4: Verify server side integration

Our custom route `/api/webhooks/user-confirmed` is embedded directly into the CalmReader core Express server. It will automatically process incoming webhooks, secure them with the `x-webhook-secret` authorization check, inspect the cargo, and send a beautiful HTML alert to your `ADMIN_EMAIL` using your already verified Brevo platform configuration.

You can now rest easy, focus on promotions, and let CalmReader keep you posted automatically! 🎉
