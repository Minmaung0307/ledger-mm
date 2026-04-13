// app/api/scan-receipt/route.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const apiKey = process.env.GEMINI_API_KEY;

export async function POST(req: Request) {
  try {
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API Key missing in environment" }, { status: 500 });
    }

    const { image } = await req.json();
    if (!image) {
      return NextResponse.json({ error: "No image data" }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Model နာမည်ကို "gemini-1.5-flash" လို့ပဲ သေချာပေးပါ
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are an expert receipt scanner. Look at this receipt image and extract:
      1. merchant: (The shop/store name)
      2. amount: (Total amount as a number, e.g. 15.50)
      3. category: (One of: advertising, car_truck, contract_labor, insurance, legal_fees, meals, office, rent, software, travel, utilities, w2_wages, other)
      
      Return ONLY a JSON object. No markdown, no backticks.
      Example: {"merchant": "Costco", "amount": 120.00, "category": "office"}
    `;

    const imageData = image.includes(',') ? image.split(',')[1] : image;

    // generateContent ကို လှမ်းခေါ်မယ်
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageData,
          mimeType: "image/jpeg",
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();
    
    // JSON စာသားကို ရှာမယ်
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("AI response did not contain JSON");
    }

    return NextResponse.json(JSON.parse(jsonMatch[0]));
    
  } catch (error: any) {
    console.error("Gemini Error Details:", error);
    // Error message ကို ပိုပြီး ရှင်းအောင် ပြန်ပို့မယ်
    return NextResponse.json({ 
      error: "AI Scan failed", 
      details: error.message 
    }, { status: 500 });
  }
}