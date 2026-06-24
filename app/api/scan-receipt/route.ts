// app/api/scan-receipt/route.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { image } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("Missing API Key");
      return NextResponse.json({ error: "API Key is missing in Vercel" }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Extract data from receipt. Return ONLY raw JSON: 
    {"merchant": "...", "amount": 0.00, "category": "...", "date": "YYYY-MM-DD"}. 
    Use lowercase values for category. No markdown.`;

    const imageData = image.includes(',') ? image.split(',')[1] : image;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: imageData, mimeType: "image/jpeg" } }
    ]);

    const text = result.response.text();
    // JSON မဟုတ်တဲ့ စာသားတွေ (Markdown) ပါလာရင် ဖယ်ထုတ်မည့် logic
    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    return NextResponse.json(JSON.parse(cleanJson));

  } catch (error: any) {
    console.error("GEMINI API ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}