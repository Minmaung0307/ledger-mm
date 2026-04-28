// app/api/extract-statement/route.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Vercel ၏ 10s limit ကို ကျော်ရန် Edge Runtime သုံးပါမည်
export const runtime = 'edge'; 

export async function POST(req: Request) {
  try {
    const { fileUrl } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return NextResponse.json({ error: "API Key missing" }, { status: 500 });
    if (!fileUrl) return NextResponse.json({ error: "No URL" }, { status: 400 });

    // ၁။ PDF ကို လှမ်းယူမယ်
    const response = await fetch(fileUrl);
    const blob = await response.blob();
    
    // Blob ကို Base64 ပြောင်းခြင်း (Edge Runtime အတွက် နည်းလမ်းအသစ်)
    const arrayBuffer = await blob.arrayBuffer();
    const base64PDF = btoa(
      new Uint8Array(arrayBuffer)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    // ၂။ Gemini ခေါ်ယူခြင်း
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Read this bank statement and extract transactions.
      Return ONLY a JSON array. No other text.
      Format: [{"date": "YYYY-MM-DD", "description": "NAME", "amount": 10.50}]
    `;

    const result = await model.generateContent([
      { inlineData: { data: base64PDF, mimeType: "application/pdf" } },
      prompt
    ]);

    const text = result.response.text();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    
    if (!jsonMatch) throw new Error("Format Error");

    return NextResponse.json(JSON.parse(jsonMatch[0]));

  } catch (error: any) {
    console.error("Edge AI Error:", error.message);
    return NextResponse.json({ error: "Sync Failed", details: error.message }, { status: 500 });
  }
}