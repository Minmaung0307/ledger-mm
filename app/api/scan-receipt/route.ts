// app/api/scan-receipt/route.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Key Missing" }, { status: 500 });

    const { image } = await req.json();
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // "gemini-1.5-flash" က လက်ရှိ အသေချာဆုံး model name ပါ
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = "Extract merchant name, total amount as number, and tax category from this receipt. Return ONLY JSON: { \"merchant\": \"...\", \"amount\": 0, \"category\": \"...\" }";
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
    console.error("AI ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}