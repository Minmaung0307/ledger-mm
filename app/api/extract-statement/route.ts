// app/api/extract-statement/route.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { fileUrl } = await req.json(); // base64 အစား url ကိုပဲ ယူမယ်
    
    // ၁။ Server ဘက်ကနေ PDF ကို လှမ်းဆွဲမယ် (ဒါက Vercel limit ထဲမပါဘူး)
    const fileRes = await fetch(fileUrl);
    const arrayBuffer = await fileRes.arrayBuffer();
    const base64PDF = Buffer.from(arrayBuffer).toString('base64');

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Extract all transactions from this bank statement.
      Return a JSON array of objects: 
      [{"date": "YYYY-MM-DD", "description": "...", "amount": 0.00, "category": "..."}]
      Return ONLY raw JSON.
    `;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64PDF, mimeType: "application/pdf" } }
    ]);

    const text = result.response.text();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("Format Error");

    return NextResponse.json(JSON.parse(jsonMatch[0]));
    
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}