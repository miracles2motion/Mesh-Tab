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

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
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
    });

    const text = response.text || "{}";
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
