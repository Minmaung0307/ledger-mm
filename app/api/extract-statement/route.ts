// app/api/extract-statement/route.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { fileUrl } = await req.json(); // base64 အစား url ကိုပဲ ယူမယ်
    if (!fileUrl) return NextResponse.json({ error: "No URL provided" }, { status: 400 });

    // ၁။ Server-side fetch (PDF ကို Server ဘက်ကနေ လှမ်းဆွဲမယ်)
    const fileRes = await fetch(fileUrl);
    const arrayBuffer = await fileRes.arrayBuffer();
    const base64PDF = Buffer.from(arrayBuffer).toString('base64');

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are an expert accountant. Read this bank statement and extract all transactions.
      Return ONLY a JSON array of objects: 
      [{"date": "YYYY-MM-DD", "description": "Transaction Name", "amount": 0.00, "category": "income or expense_category"}]
      
      Important rules:
      - If it is a deposit/income, amount should be positive.
      - If it is a withdrawal/expense, amount should be negative.
      - Use standard categories like: income, meals, office, utilities, rent, etc.
    `;

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64PDF,
          mimeType: "application/pdf",
        },
      },
      prompt,
    ]);

    const text = result.response.text();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("AI failed to produce list");

    return NextResponse.json(JSON.parse(jsonMatch[0]));
    
  } catch (error: any) {
    console.error("AI Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}