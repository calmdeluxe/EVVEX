# Mailtrap Setup Guide

To enable email verification and OTP via Mailtrap:

1.  **Get your API Token**:
    *   Sign up at [Mailtrap.io](https://mailtrap.io).
    *   Go to **Settings > API Tokens**.
    *   Generate a new token or use an existing one.

2.  **Add to AI Studio Secrets**:
    *   Go to **Settings** in AI Studio Build.
    *   Add a new environment variable:
        *   `MAILTRAP_API_TOKEN`: Your Mailtrap API Token.
        *   `MAILTRAP_SENDER_EMAIL`: (Optional) Your verified sender email (defaults to `hello@demomailtrap.com`).

3.  **Security Note**:
    *   The `MAILTRAP_API_TOKEN` is kept strictly on the server (backend).
    *   It is **never** exposed to the frontend browser.
    *   The frontend calls the `/api/auth/send-otp` backend route to trigger emails.

4.  **Usage**:
    *   You can now use `sendVerificationEmail` from `src/services/emailService.ts` in your components.
    *   Example:
        ```typescript
        import { sendVerificationEmail } from "@/services/emailService";
        
        // Send a welcome email during signup
        await sendVerificationEmail(userEmail);
        ```

5.  **OTP Flow**:
    *   To send a 6-digit OTP:
        ```typescript
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        await sendVerificationEmail(userEmail, code, 'otp');
        ```
