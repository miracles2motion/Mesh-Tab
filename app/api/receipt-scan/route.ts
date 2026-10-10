import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function POST(request: Request) {
  try {
    // 1. IP-based Rate Limiter (Max 10 scans / min per IP)
    const ipHeader = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous';
    const clientIp = ipHeader.split(',')[0].trim();

    try {
      const rateLimitKey = `meshtab:ratelimit:receipt-scan:${clientIp}`;
      const requestCount = await redis.incr(rateLimitKey);
      if (requestCount === 1) {
        await redis.expire(rateLimitKey, 60);
      }
      if (requestCount > 20) {
        return NextResponse.json(
          { error: 'Network scan limit reached: Several receipts were just scanned from your network. Please wait 15 seconds and try again.' },
          { status: 429 }
        );
      }
    } catch (rlErr) {
      // Fail-open if Redis is temporarily unreachable so users are not blocked
      console.warn('Receipt scan rate-limit check skipped:', rlErr);
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File exceeds 10MB limit' }, { status: 413 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Canonical Google GenAI models (removed non-existent 'gemini-3.8-flash')
    const fallbackModels = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-2.5-flash-lite'
    ];
    let lastError: any = null;
    let text = "{}";

    const requestPayload = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: base64Image,
                mimeType: file.type || 'image/jpeg',
              }
            },
            {
              text: `Extract the exact total amount (numbers and decimals only, NO currency symbols like $) and the merchant name from this receipt.
              Return ONLY a valid JSON object in this exact format:
              {
                "amount": "83.57",
                "desc": "THE BURGER JOINT"
              }`
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
    };

    // Try models in order until one succeeds
    for (const modelName of fallbackModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          ...requestPayload
        });
        text = response.text || "{}";
        lastError = null; // Cleared error since it succeeded
        break; // Success! Exit the loop
      } catch (err: any) {
        console.warn(`Model ${modelName} failed with ${err?.status || 'error'}, trying next...`);
        lastError = err;
      }
    }

    if (lastError) {
      throw lastError; // If all failed, throw the last error to be caught by the outer catch block
    }

    // Clean up any Markdown code fences (e.g. ```json ... ```)
    const cleanedText = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/, "")
      .replace(/\s*```$/, "")
      .trim();

    let result: any = {};
    try {
      result = JSON.parse(cleanedText);
    } catch {
      const amountMatch = cleanedText.match(/"amount"\s*:\s*"([^"]+)"/);
      const descMatch = cleanedText.match(/"desc"\s*:\s*"([^"]+)"/);
      result = {
        amount: amountMatch ? amountMatch[1] : "",
        desc: descMatch ? descMatch[1] : "Receipt"
      };
    }
    
    // Safety cleaner: strip out any stray $ signs or letters just in case the AI hallucinates them
    if (result.amount) {
      result.amount = String(result.amount).replace(/[^0-9.]/g, '');
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('OCR Error:', error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
