// app/api/scan-receipt/route.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API Key is missing in Vercel" }, { status: 500 });
    }

    const { image } = await req.json();
    if (!image) return NextResponse.json({ error: "No image" }, { status: 400 });

    const genAI = new GoogleGenerativeAI(apiKey);
    // model name ကို အသေချာဆုံး gemini-1.5-flash ပဲ သုံးပါမယ်
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Extract merchant, amount (number), and category (meals, office, travel, etc.) from this receipt. Return ONLY JSON: {"merchant": "Name", "amount": 10.00, "category": "meals"}`;
    const imageData = image.includes(',') ? image.split(',')[1] : image;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: imageData, mimeType: "image/jpeg" } }
    ]);

    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) throw new Error("Format Error");
    return NextResponse.json(JSON.parse(jsonMatch[0]));
    
  } catch (error: any) {
    console.error("DETAILED SERVER ERROR:", error.message);
    return NextResponse.json({ error: "AI failed to read", details: error.message }, { status: 500 });
  }
}