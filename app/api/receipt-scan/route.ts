import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const fallbackModels = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-flash-latest'];
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

    const result = JSON.parse(text);
    
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
