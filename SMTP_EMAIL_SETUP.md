# SMTP Email Verification Setup Guide

This guide will help you set up SMTP email verification for Sationly using Supabase's built-in email service or a custom SMTP provider.

## Overview

Sationly uses Supabase Auth for user authentication. By default, Supabase provides email verification through their own email service, but you can configure a custom SMTP provider for better deliverability and branding.

## Option 1: Using Supabase's Default Email Service (Quick Start)

Supabase provides a free email service out of the box. This is the easiest option to get started.

### Steps:

1. **Enable Email Confirmation in Supabase Dashboard:**
   - Go to your Supabase project dashboard: https://supabase.com/dashboard
   - Navigate to **Authentication** → **Settings**
   - Scroll to **Email Auth** section
   - Enable **"Enable email confirmations"**
   - Set **"Confirm email"** to `ON`

2. **Configure Email Templates:**
   - In the same **Authentication** → **Settings** page
   - Scroll to **Email Templates** section
   - Customize the **"Confirm signup"** template:
     ```
     <h2>Confirm your signup</h2>
     <p>Follow this link to confirm your user:</p>
     <p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>
     ```
   - The confirmation URL will automatically redirect to: `https://sationly.com/verify-email`

3. **Set Site URL:**
   - In **Authentication** → **URL Configuration**
   - Set **Site URL** to: `https://sationly.com`
   - Add **Redirect URLs**: 
     - `https://sationly.com/verify-email`
     - `https://sationly.com/**` (for wildcard matching)

4. **Test Email Verification:**
   - Sign up with a test email
   - Check your inbox for the confirmation email
   - Click the confirmation link
   - You should be redirected to `/verify-email` and then to `/select-tier`

## Option 2: Using Custom SMTP Provider (Recommended for Production)

For production use, it's recommended to use a custom SMTP provider like SendGrid, Mailgun, AWS SES, or Postmark for better deliverability and branding.

### Using SendGrid (Example)

1. **Create a SendGrid Account:**
   - Sign up at https://sendgrid.com
   - Verify your domain or use their shared domain
   - Create an API key with "Mail Send" permissions

2. **Configure SMTP in Supabase:**
   - Go to **Authentication** → **Settings** → **SMTP Settings**
   - Enable **"Enable Custom SMTP"**
   - Fill in the SMTP details:
     - **Host:** `smtp.sendgrid.net`
     - **Port:** `587` (or `465` for SSL)
     - **Username:** `apikey`
     - **Password:** Your SendGrid API key
     - **Sender email:** `support@sationly.com` (or your verified sender)
     - **Sender name:** `Sationly`

3. **Configure Email Templates:**
   - Customize templates in **Authentication** → **Email Templates**
   - Use HTML templates with your branding:
     ```html
     <!DOCTYPE html>
     <html>
     <head>
       <style>
         body { font-family: 'Poppins', sans-serif; }
         .container { max-width: 600px; margin: 0 auto; }
         .button { background: linear-gradient(135deg, #89D3D8, #F7B0C6); 
                   padding: 12px 24px; border-radius: 8px; 
                   color: #050914; text-decoration: none; display: inline-block; }
       </style>
     </head>
     <body>
       <div class="container">
         <h2>Welcome to Sationly!</h2>
         <p>Please confirm your email address to get started.</p>
         <a href="{{ .ConfirmationURL }}" class="button">Verify Email</a>
         <p>If the button doesn't work, copy and paste this link:</p>
         <p>{{ .ConfirmationURL }}</p>
       </div>
     </body>
     </html>
     ```

### Using Other SMTP Providers

**Mailgun:**
- Host: `smtp.mailgun.org`
- Port: `587`
- Username: Your Mailgun SMTP username
- Password: Your Mailgun SMTP password

**AWS SES:**
- Host: `email-smtp.us-east-1.amazonaws.com` (or your region)
- Port: `587`
- Username: Your AWS SES SMTP username
- Password: Your AWS SES SMTP password

**Postmark:**
- Host: `smtp.postmarkapp.com`
- Port: `587`
- Username: Your Postmark server API token
- Password: Your Postmark server API token

## Email Template Variables

Supabase provides these variables in email templates:

- `{{ .ConfirmationURL }}` - The email confirmation link
- `{{ .Email }}` - User's email address
- `{{ .Token }}` - Confirmation token (if needed)
- `{{ .TokenHash }}` - Hashed token (if needed)
- `{{ .SiteURL }}` - Your site URL
- `{{ .RedirectTo }}` - Redirect URL after confirmation

## Testing Email Verification

1. **Local Testing:**
   - Start your local server: `npm run dev`
   - Sign up with a test email
   - Check the Supabase dashboard logs for email status
   - Or use a service like Mailtrap for testing

2. **Production Testing:**
   - Sign up on https://sationly.com
   - Check your email inbox (and spam folder)
   - Click the verification link
   - Verify you're redirected to `/verify-email` and then `/select-tier`

## Troubleshooting

### Emails Not Sending

1. **Check Supabase Logs:**
   - Go to **Logs** → **Auth Logs** in Supabase dashboard
   - Look for email sending errors

2. **Verify SMTP Settings:**
   - Double-check SMTP credentials
   - Test SMTP connection using a tool like `telnet` or `openssl`
   - Ensure port 587/465 is not blocked by firewall

3. **Check Email Provider Limits:**
   - Verify you haven't exceeded sending limits
   - Check if your account is verified/activated

### Verification Links Not Working

1. **Check Redirect URLs:**
   - Ensure `/verify-email` is in allowed redirect URLs
   - Verify Site URL is set correctly

2. **Check Email Template:**
   - Ensure `{{ .ConfirmationURL }}` is used correctly
   - Verify the URL format matches your domain

### Users Can't Sign In After Verification

1. **Check Email Confirmation Status:**
   - In Supabase dashboard, check if `email_confirmed_at` is set
   - Verify the user's email is confirmed

2. **Check Auth Settings:**
   - Ensure "Enable email confirmations" is ON
   - Verify "Confirm email" requirement is set correctly

## Environment Variables

No additional environment variables are needed for email verification. The system uses:
- `SUPABASE_URL` - Already configured
- `SUPABASE_ANON_KEY` - Already configured

## Security Best Practices

1. **Use Custom SMTP for Production:**
   - Supabase's default email service is fine for development
   - Use a dedicated SMTP provider for production

2. **Verify Your Domain:**
   - Set up SPF, DKIM, and DMARC records
   - This improves email deliverability

3. **Monitor Email Delivery:**
   - Set up email delivery monitoring
   - Track bounce rates and spam complaints

4. **Rate Limiting:**
   - Supabase automatically rate limits email sending
   - Consider additional rate limiting for resend requests

## Next Steps

After setting up SMTP:

1. ✅ Test email verification flow end-to-end
2. ✅ Customize email templates with your branding
3. ✅ Set up email delivery monitoring
4. ✅ Configure domain authentication (SPF, DKIM, DMARC)
5. ✅ Test spam folder deliverability

## Support

If you encounter issues:
- Check Supabase documentation: https://supabase.com/docs/guides/auth/auth-email
- Review Supabase Auth logs in dashboard
- Contact support: support@sationly.com

