// app/api/extract-statement/route.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { fileUrl } = await req.json(); // Base64 အစား URL ကိုပဲ ယူမယ်
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return NextResponse.json({ error: "API Key missing" }, { status: 500 });
    if (!fileUrl) return NextResponse.json({ error: "No URL provided" }, { status: 400 });

    // ၁။ Firebase URL ကနေ PDF ကို Server ဘက်က လှမ်းဆွဲမယ် (ပိုမြန်ပါတယ်)
    const response = await fetch(fileUrl);
    const arrayBuffer = await response.arrayBuffer();
    const base64PDF = Buffer.from(arrayBuffer).toString('base64');

    // ၂။ Gemini AI ခေါ်ယူခြင်း
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Extract all transactions from this bank statement.
      Return ONLY a JSON array of objects. 
      Format: [{"date": "YYYY-MM-DD", "description": "Shop Name", "amount": 10.50}]
      Note: Positive for deposits, Negative for withdrawals.
    `;

    const result = await model.generateContent([
      { inlineData: { data: base64PDF, mimeType: "application/pdf" } },
      prompt
    ]);

    const text = result.response.text();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    
    if (!jsonMatch) throw new Error("AI failed to extract data");

    return NextResponse.json(JSON.parse(jsonMatch[0]));

  } catch (error: any) {
    console.error("AI Sync Error:", error.message);
    return NextResponse.json({ error: "Sync Failed", details: error.message }, { status: 500 });
  }
}