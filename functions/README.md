# Baloot Calculator — Cloud Functions

Single function: **`parseBalootRound`** (gen2 callable, gemini-2.5-flash audio in, JSON out).

## Deploy

```bash
cd functions && npm install
firebase deploy --only functions:parseBalootRound --project baloot-calculator-al-dew
```

## Required IAM grant (gen2 callables)

Public PWAs hit Cloud Run URLs. Grant `allUsers` invoker once per service:

```bash
gcloud run services add-iam-policy-binding parsebalootround \
  --member=allUsers \
  --role=roles/run.invoker \
  --region=us-central1 \
  --project=baloot-calculator-al-dew
```

If `gcloud` is not installed, do this in the Cloud Run console:
**Cloud Run → parsebalootround → Permissions → Add → Principal: `allUsers`, Role: `Cloud Run Invoker`.**

## Secrets

`GEMINI_API_KEY` (Firebase Secret Manager). Set with:

```bash
firebase functions:secrets:set GEMINI_API_KEY --project baloot-calculator-al-dew
```

Paste the Gemini API key when prompted (same key used in Tartib).

## Firestore

Required for the rate-limit counter. Enable once:
**Firebase Console → Firestore → Create database → Production mode → us-central**.

Rules in `../firestore.rules` deny all client reads/writes; only this function (Admin SDK) writes the `voice_rate_limit/{ip}` counters.

Deploy rules:

```bash
firebase deploy --only firestore:rules --project baloot-calculator-al-dew
```

## App Check (reCAPTCHA v3)

Public PWA, no user auth → use App Check to keep abuse off the function.

1. Firebase Console → App Check → Apps → register the **Web** app with reCAPTCHA v3.
2. Copy the **site key**, paste into `index.html` (search `RECAPTCHA_V3_SITE_KEY = "REPLACE_WITH_RECAPTCHA_V3_SITE_KEY"`).
3. Add allowed domains in the reCAPTCHA admin console: `ealhamed.github.io`, plus `localhost` for testing.
4. Initially set **Monitor** mode on `parseBalootRound`. After confirming end-to-end works, switch to **Enforce**.
5. Flip `enforceAppCheck: false → true` in `index.js` and redeploy.

To debug a client without a token: Firebase Console → App Check → Apps → web → debug tokens.

## Rate limit

Per-IP, 30 calls/hour, stored at `voice_rate_limit/{safeIp}` in Firestore.
Reset by deleting the document for that IP.

## Budget alert (one-time, manual)

**Google Cloud Console → Billing → Budgets & alerts → Create budget**:

- Project: `baloot-calculator-al-dew`
- Amount: **$5/month**
- Thresholds: 50%, 90%, 100%
- Email: ebrahim.alhamed@gmail.com

## Smoke tests (run from the deployed PWA browser console)

Round-trip with empty audio (expects validation error):

```js
const r = await window.__callParseBalootRound({ audioBase64: '', mimeType: 'audio/webm' });
console.log(r);
// Expected: HttpsError 'failed-precondition' / 'الصوت مفقود'
```

Round-trip with real audio (full UX):

1. Tap the mic button.
2. Say *"نحن مية وستين، هم تسعين"*.
3. Tap mic again to stop.
4. Expect the preview overlay with `لنا 160 / لهم 90`, mode=`بسيط`.
5. Tap `تأكيد`. Scoreboard updates.

Advanced phrasing:

1. Tap mic, say *"حكم علينا، ضعف، ومعنا سرا، نحن مية واثنين وأربعين، هم عشرة"*.
2. Expect mode=`متقدم` with `حكم • المشتري: لنا • دبل • لنا: سرا`.
3. Tap `تأكيد`. App switches to Advanced view, prefills, and submits.

## Rollback

```bash
firebase functions:delete parseBalootRound --project baloot-calculator-al-dew
```

The frontend mic button continues to record; failed Cloud Function calls surface a toast (`تعذّر تحليل الصوت`) — no app crash.
