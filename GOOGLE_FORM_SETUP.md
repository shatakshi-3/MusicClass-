# Google Form Integration — Setup Guide

This guide helps you connect a Google Form to your Music Class Dashboard so parents can enroll students by filling out a form.

**Cost: Free. No API keys needed.**

---

## Step 1: Create a Google Form

Go to [https://forms.google.com](https://forms.google.com) and create a new form with these fields **in this exact order**:

| # | Field Name | Type | Options |
|---|---|---|---|
| 1 | Student Name | Short answer | Required |
| 2 | Phone Number | Short answer | Required |
| 3 | Age | Short answer | Required |
| 4 | Parent/Guardian Name | Short answer | Required |
| 5 | Instrument | Dropdown | Guitar, Piano, Tabla, Vocal, Keyboard, Violin |
| 6 | Centre | Dropdown | Centre A, Centre B |
| 7 | Class Timing | Short answer or Dropdown | Your timing options |

> **Important:** The field order matters! Column 1 = Name, Column 2 = Phone, etc. Google Forms automatically adds a Timestamp as the first column.

---

## Step 2: Link Form to Google Sheet

1. In your Google Form, click the **"Responses"** tab
2. Click the **Google Sheets icon** (green) → "Create a new spreadsheet"
3. Click "Create" — this opens a new Google Sheet with form responses

---

## Step 3: Publish the Google Sheet as CSV

1. In the Google Sheet, go to **File → Share → Publish to web**
2. In the popup:
   - Under "Link", select **"Sheet1"** (or whatever your sheet tab is called)
   - Change the format from "Web page" to **"Comma-separated values (.csv)"**
3. Click **"Publish"** → Click "OK" to confirm
4. **Copy the URL** that appears — it looks something like:
   ```
   https://docs.google.com/spreadsheets/d/e/2PACX-abc123.../pub?gid=0&single=true&output=csv
   ```

---

## Step 4: Add URL to Your App

1. Open `.env.local` in your project root (create it if it doesn't exist)
2. Add this line with your copied URL:

```env
GOOGLE_SHEET_CSV_URL=https://docs.google.com/spreadsheets/d/e/2PACX-abc123.../pub?gid=0&single=true&output=csv
```

3. Restart your dev server (`npm run dev`)

---

## Step 5: Test the Sync

1. Fill out your Google Form with a test student
2. Wait 1–2 minutes for Google to update the published CSV
3. In your dashboard, go to **Students** page
4. Click **"Sync Google Form"** button
5. You should see: "✅ 1 new student imported"

---

## How It Works

```
Parent fills Google Form
        ↓
Google saves response to Sheet (automatic)
        ↓
Sheet published as CSV (public URL)
        ↓
Admin clicks "Sync Google Form"
        ↓
App fetches CSV → creates new students
        ↓
Duplicates are skipped (matched by phone number)
```

---

## Notes

- **Deduplication**: Students are matched by phone number. If a phone number already exists in the dashboard, the form entry is skipped.
- **Delay**: Published CSV updates within 1–5 minutes after a new form submission.
- **Both methods work**: You can still add students manually via the "Add Student" button.
- **Fee assignment**: Imported students automatically get their monthly fee assigned based on instrument, and a payment record is created for the current month.
- **Validation**: Invalid entries (missing name, bad phone number, unknown instrument) are reported as errors during sync.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| "Google Form not configured" | Make sure `GOOGLE_SHEET_CSV_URL` is set in `.env.local` and restart the server |
| "No form responses found" | Submit at least one response and wait 1–2 minutes for the CSV to update |
| Students not importing | Check that form field order matches the table above (Name, Phone, Age, Parent, Instrument, Centre, Timing) |
| "Unknown instrument" error | Make sure the dropdown options in your form match exactly: Guitar, Piano, Tabla, Vocal, Keyboard, Violin |
