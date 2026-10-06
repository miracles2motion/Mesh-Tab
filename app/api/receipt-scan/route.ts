import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
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

    // Instead of hardcoding deprecated versions, we use Google's rolling aliases
    // 'gemini-flash-latest' always points to the most current, stable, working model.
    // We fall back to specific high-capacity models if the primary is congested.
    const fallbackModels = [
      'gemini-flash-latest', 
      'gemini-3.8-flash', 
      'gemini-3.7-flash', 
      'gemini-flash-lite-latest'
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
