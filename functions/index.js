const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { defineSecret } = require('firebase-functions/params');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({ region: 'us-central1', maxInstances: 10 });

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

const SYSTEM_PROMPT = `أنت محلل لنتائج لعبة بلوت السعودية. ستسمع تسجيلاً قصيراً (٣–١٥ ثانية) باللهجة السعودية يصف نتيجة جولة واحدة، وتُرجع JSON صارم.

اللاعبون:
- "نحن"، "علينا"، "احنا"، "فريقنا" → lana
- "هم"، "عليهم"، "فريقهم" → lahum

الأنواع:
- "صن" → type:"sun"
- "حكم" → type:"hokm"
- "صن مع" أو "صن مع البيت" → type:"sun_with"

المضاعِفات (تطابق التطبيق):
- "ضعف" أو "دبل" → multiplier:"double"
- "ري" أو "ثري" أو "تربل" → multiplier:"triple"
- "فور" → multiplier:"four"
- "قهوة" → multiplier:"coffee"
- بلا ذكر → multiplier:"normal"

المشاريع (projects):
- "سرا" أو "سيرا" → key "sira"
- "خمسين" → key "50"
- "مية" (كمشروع) → key "100"
- "أربعمية" أو "٤ إكك" → key "400"
- "بلوت" (كمشروع) → key "baloot"

الكبوت: "كبوت" → kabout:true، وضع kaboutWinner مع الفريق الفائز إن ذُكر.

قاعدة وضع التشغيل (mode):
- إذا لم يذكر المتكلم أي نوع/مشروع/كبوت/مضاعِف فقط أرقام للفريقين → mode:"simple" وأعد فقط bunt.
- وإلا → mode:"advanced" وأعد bunt + meta كاملة.

الأرقام السعودية: حوّل النطق إلى عدد صحيح (مية وستين=160، تسعين=90، ميتين=200، مية واثنين وأربعين=142).

أعد JSON مطابق لهذا الشكل تماماً (بدون شرح، بدون markdown):

{
  "ok": true,
  "mode": "simple" | "advanced",
  "bunt": { "lana": <int>, "lahum": <int> },
  "meta": {
    "type": "sun" | "hokm" | "sun_with",
    "buyer": "lana" | "lahum",
    "multiplier": "normal" | "double" | "triple" | "four" | "coffee",
    "kabout": <bool>,
    "kaboutWinner": "lana" | "lahum" | null,
    "projects": {
      "lana": { "sira": <int>, "50": <int>, "100": <int>, "400": <int>, "baloot": <int> },
      "lahum": { "sira": <int>, "50": <int>, "100": <int>, "400": <int>, "baloot": <int> }
    }
  },
  "confidence": <float 0..1>,
  "transcript": "<النص الذي سمعته>",
  "warnings": []
}

في وضع simple، احذف meta من الجواب. أعد bunt حتى لو لم تتأكد، واخفض confidence مكانها.

ملاحظة هامة عن قيم bunt:
- في simple mode: bunt = النتيجة النهائية لكل فريق كما نطقها المتكلم.
- في advanced mode: bunt = البنط الخام (rawPoints out of 152) قبل تطبيق المضاعِف. التطبيق يحسب المضاعِف لاحقاً.

أمثلة:
1. "نحن مية وستين، هم تسعين" → {"ok":true,"mode":"simple","bunt":{"lana":160,"lahum":90},"confidence":0.95,"transcript":"نحن مية وستين، هم تسعين","warnings":[]}

2. "صن، نحن مية وستين، هم تسعين" → {"ok":true,"mode":"advanced","bunt":{"lana":160,"lahum":90},"meta":{"type":"sun","buyer":"lana","multiplier":"normal","kabout":false,"kaboutWinner":null,"projects":{"lana":{"sira":0,"50":0,"100":0,"400":0,"baloot":0},"lahum":{"sira":0,"50":0,"100":0,"400":0,"baloot":0}}},"confidence":0.9,"transcript":"صن، نحن مية وستين، هم تسعين","warnings":[]}

3. "حكم علينا، ومعنا سرا وخمسين، نحن مية واثنين وأربعين، هم عشرة" → {"ok":true,"mode":"advanced","bunt":{"lana":142,"lahum":10},"meta":{"type":"hokm","buyer":"lana","multiplier":"normal","kabout":false,"kaboutWinner":null,"projects":{"lana":{"sira":1,"50":1,"100":0,"400":0,"baloot":0},"lahum":{"sira":0,"50":0,"100":0,"400":0,"baloot":0}}},"confidence":0.88,"transcript":"حكم علينا، ومعنا سرا وخمسين، نحن مية واثنين وأربعين، هم عشرة","warnings":[]}

4. "كبوت علينا، ضعف" → {"ok":true,"mode":"advanced","bunt":{"lana":50,"lahum":0},"meta":{"type":"hokm","buyer":"lana","multiplier":"double","kabout":true,"kaboutWinner":"lana","projects":{"lana":{"sira":0,"50":0,"100":0,"400":0,"baloot":0},"lahum":{"sira":0,"50":0,"100":0,"400":0,"baloot":0}}},"confidence":0.85,"transcript":"كبوت علينا، ضعف","warnings":["تأكد من القيمة"]}

5. (صوت غير واضح) → {"ok":false,"mode":"simple","bunt":{"lana":0,"lahum":0},"confidence":0.0,"transcript":"","warnings":["ما قدرت أفهم النتيجة"]}`;

const MAX_AUDIO_BASE64_BYTES = 2 * 1024 * 1024;
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

async function enforceRateLimit(ip) {
  if (!ip) return;
  const safeIp = String(ip).replace(/[^0-9a-fA-F.:]/g, '_').slice(0, 64);
  const docRef = db.collection('voice_rate_limit').doc(safeIp);
  const now = Date.now();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    const data = snap.exists ? snap.data() : { count: 0, windowStart: now };
    const fresh = (now - data.windowStart) > RATE_LIMIT_WINDOW_MS;
    const next = fresh
      ? { count: 1, windowStart: now }
      : { count: data.count + 1, windowStart: data.windowStart };
    if (next.count > RATE_LIMIT_MAX) {
      throw new HttpsError('resource-exhausted', 'تجاوزت الحد المسموح، حاول بعد ساعة');
    }
    tx.set(docRef, next);
  });
}

exports.parseBalootRound = onCall(
  { secrets: [GEMINI_API_KEY], enforceAppCheck: false },
  async (request) => {
    const ip = request.rawRequest?.headers?.['x-forwarded-for']?.toString().split(',')[0]?.trim()
      || request.rawRequest?.ip
      || null;
    await enforceRateLimit(ip);

    const { audioBase64, mimeType } = request.data || {};

    if (!audioBase64 || typeof audioBase64 !== 'string') {
      throw new HttpsError('failed-precondition', 'الصوت مفقود');
    }
    if (audioBase64.length > MAX_AUDIO_BASE64_BYTES) {
      throw new HttpsError('failed-precondition', 'الصوت طويل، خلّ المحاولة أقل من ١٥ ثانية');
    }

    const cleanMime = String(mimeType || 'audio/webm').split(';')[0];

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 512,
        temperature: 0.1,
      },
    });

    let raw;
    try {
      const result = await model.generateContent([
        { inlineData: { data: audioBase64, mimeType: cleanMime } },
        { text: SYSTEM_PROMPT },
      ]);
      raw = result.response.text();
    } catch (err) {
      console.error('Gemini error', err);
      throw new HttpsError('failed-precondition', 'تعذّر تحليل الصوت، حاول مرة ثانية');
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error('JSON parse error', { raw });
      throw new HttpsError('failed-precondition', 'ما قدرت أفهم النتيجة، ممكن تعيد؟');
    }

    if (!parsed || typeof parsed !== 'object' || !parsed.bunt) {
      throw new HttpsError('failed-precondition', 'ما قدرت أفهم النتيجة، ممكن تعيد؟');
    }
    parsed.bunt.lana = Number(parsed.bunt.lana) || 0;
    parsed.bunt.lahum = Number(parsed.bunt.lahum) || 0;

    return parsed;
  }
);
