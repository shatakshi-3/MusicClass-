# MusicClass Admin — Deployment Guide

## Prerequisites

- Node.js 18+ installed
- A Google Cloud project with Sheets API enabled
- A Google Sheet with form responses
- A Vercel account (free tier works)

---

## 1. Google Cloud Setup

### Create a Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or select existing)
3. Enable the **Google Sheets API**
4. Go to **IAM & Admin → Service Accounts**
5. Click **Create Service Account**
6. Give it a name (e.g., `musicclass-reader`)
7. Click **Create and Continue** → skip optional steps → **Done**
8. Click the service account → **Keys** tab → **Add Key → Create new key → JSON**
9. Download the JSON key file

### Share Your Google Sheet

1. Open your Google Sheet (the one receiving form responses)
2. Click **Share**
3. Add the service account email (from the JSON key, looks like `name@project.iam.gserviceaccount.com`)
4. Give **Editor** access

### Google Sheet Column Order

Ensure your sheet has these columns in order (A through J):

| Column | Field |
|--------|-------|
| A | Student Name |
| B | Phone Number |
| C | Age |
| D | Parent Name |
| E | What they want to learn |
| F | Class Timing |
| G | Exam Centre |
| H | Notes |
| I | Fee Status |
| J | Last Fee Month Paid |

> Columns I and J (Fee Status, Last Fee Month Paid) are managed by the admin dashboard and can be added manually to the sheet.

---

## 2. Generate Admin Password Hash

Run this in your terminal to generate a bcrypt hash:

```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('your-password-here', 10).then(h => console.log(h));"
```

Copy the output hash for the `ADMIN_PASSWORD_HASH` environment variable.

---

## 3. Local Development

```bash
# Clone and install
npm install

# Copy env template
cp .env.local.example .env.local

# Edit .env.local with your values
# (Without Google credentials, the app uses mock data)

# Start dev server
npm run dev
```

Default login: `admin@music.com` / `admin123` (when no `ADMIN_PASSWORD_HASH` is set)

---

## 4. Deploy to Vercel

### Via Vercel CLI

```bash
npm i -g vercel
vercel
```

### Via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Import your Git repository
3. Vercel auto-detects Next.js
4. Click **Deploy**

### Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables, add:

| Variable | Value |
|----------|-------|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | From service account JSON (`client_email`) |
| `GOOGLE_PRIVATE_KEY` | From service account JSON (`private_key`) — include the full key with `\n` |
| `GOOGLE_SHEET_ID` | From the Google Sheet URL (`/d/{SHEET_ID}/edit`) |
| `ADMIN_EMAIL` | Your admin email |
| `ADMIN_PASSWORD_HASH` | The bcrypt hash from step 2 |
| `SESSION_SECRET` | A random 32+ character string |

> **Important:** For `GOOGLE_PRIVATE_KEY` in Vercel, paste the key exactly as it appears in the JSON file, including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` markers.

---

## 5. Google Form → Sheet Connection

1. Create your Google Form with the required fields
2. In the Form editor, click **Responses** tab → **Link to Sheets** (spreadsheet icon)
3. Create a new spreadsheet or select your existing one
4. Ensure column order matches the table in Section 1

The dashboard reads from this sheet every 60 seconds (cached). New form submissions will appear automatically.

---

## Security Notes

- All admin routes are session-protected
- Login has rate limiting (5 attempts per 15 minutes per IP)
- Google API credentials are never exposed to the client
- Sessions expire after 8 hours
- Cookies are HTTP-only and secure in production
