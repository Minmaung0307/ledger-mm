// app/api/scan-receipt/route.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// API Key မရှိရင် Error တက်မှာစိုးလို့ အသေအချာ စစ်မယ်
const apiKey = process.env.GEMINI_API_KEY;

export async function POST(req: Request) {
  try {
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API Key is missing in .env.local" }, { status: 500 });
    }

    const { image } = await req.json();
    if (!image) {
      return NextResponse.json({ error: "No image data provided" }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are an expert accountant. Extract these from the receipt image:
      1. merchant: (Merchant/Shop name)
      2. amount: (Total amount paid as a number)
      3. category: (One of: advertising, car_truck, contract_labor, insurance, legal_fees, meals, office, rent, software, travel, utilities, w2_wages, other)
      
      Return ONLY a raw JSON object. Do not include any markdown or backticks.
      Example: {"merchant": "Merchant Name", "amount": 12.50, "category": "meals"}
    `;

    // Base64 string ထဲက header ကို ဖယ်မယ်
    const imageData = image.includes(',') ? image.split(',')[1] : image;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: imageData, mimeType: "image/jpeg" } }
    ]);

    const text = result.response.text();
    
    // JSON ကို သေသေချာချာ ဆွဲထုတ်မယ်
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("AI could not find JSON in the response");
    }

    const receiptData = JSON.parse(jsonMatch[0]);
    return NextResponse.json(receiptData);
    
  } catch (error: any) {
    console.error("Scan Error:", error);
    return NextResponse.json({ error: error.message || "Scan Failed" }, { status: 500 });
  }
}