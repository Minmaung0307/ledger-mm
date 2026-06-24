// app/api/scan-receipt/route.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "API Key is missing in Vercel Settings" }, { status: 500 });

    const { image } = await req.json();
    if (!image) return NextResponse.json({ error: "No image data" }, { status: 400 });

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // AI ကို JSON သန့်သန့်ပဲ ထုတ်ခိုင်းမယ့် Prompt
    const prompt = `Extract info from receipt image. 
    Return ONLY a JSON object: {"merchant": "name", "amount": 0.00, "category": "val", "date": "YYYY-MM-DD"}.
    Categories: income, produce_cogs, advertising, car_truck, mileage, contract_labor, home_office, insurance, legal_fees, meals, office, rent, software, travel, utilities, w2_wages, owner_draw, other.`;

    const imageData = image.includes(',') ? image.split(',')[1] : image;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: imageData, mimeType: "image/jpeg" } }
    ]);

    const text = result.response.text();
    // JSON စာသားကိုပဲ ဆွဲထုတ်ဖို့ သေချာအောင်လုပ်မယ်
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI response was not in JSON format");

    return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch (error: any) {
    console.error("AI Scan Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}