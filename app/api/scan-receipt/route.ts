// app/api/scan-receipt/route.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API Key is missing in Vercel settings" }, { status: 500 });
    }

    const { image } = await req.json();
    if (!image) {
      return NextResponse.json({ error: "No image data received" }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // "gemini-1.5-flash-latest" သို့မဟုတ် "gemini-1.5-flash" ကို သုံးပါ
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    const prompt = `
      Extract from this receipt: 
      1. merchant (Shop Name)
      2. amount (Total price as number)
      3. category (One of: advertising, car_truck, contract_labor, insurance, legal_fees, meals, office, rent, software, travel, utilities, w2_wages, other)
      Return ONLY raw JSON.
    `;

    const imageData = image.split(',')[1];

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: imageData, mimeType: "image/jpeg" } }
    ]);

    const response = await result.response;
    const text = response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      return NextResponse.json({ error: "AI could not parse receipt", raw: text }, { status: 500 });
    }

    return NextResponse.json(JSON.parse(jsonMatch[0]));
    
  } catch (error: any) {
    console.error("DETAILED ERROR:", error);
    return NextResponse.json({ 
      error: "AI Scan failed", 
      details: error.message // ဒီစာသားက Vercel Logs မှာ ပေါ်လာပါလိမ့်မယ်
    }, { status: 500 });
  }
}