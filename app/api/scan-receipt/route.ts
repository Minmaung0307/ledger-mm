// app/api/scan-receipt/route.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API Key missing in Vercel" }, { status: 500 });
    }

    const { image } = await req.json();
    if (!image) {
      return NextResponse.json({ error: "No image data" }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Model နာမည်ကို အောက်ကအတိုင်း အတိအကျ ပြောင်းလိုက်ပါ
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are a receipt scanner. Extract: 
      1. merchant (Shop Name)
      2. amount (Total as number)
      3. category (advertising, car_truck, contract_labor, insurance, legal_fees, meals, office, rent, software, travel, utilities, w2_wages, other)
      Return ONLY raw JSON.
    `;

    const imageData = image.includes(',') ? image.split(',')[1] : image;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: imageData, mimeType: "image/jpeg" } }
    ]);

    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      return NextResponse.json({ error: "AI produced invalid format" }, { status: 500 });
    }

    return NextResponse.json(JSON.parse(jsonMatch[0]));
    
  } catch (error: any) {
    console.error("GEMINI ERROR:", error);
    // Error အစစ်အမှန်ကို User ဆီ ပို့ပေးလိုက်ပါမယ် (ဒါမှ ဖုန်းမှာ မြင်ရမှာပါ)
    return NextResponse.json({ 
      error: "AI Scan Failed", 
      details: error.message 
    }, { status: 500 });
  }
}