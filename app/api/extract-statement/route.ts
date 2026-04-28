// app/api/extract-statement/route.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const runtime = 'edge'; // Vercel Timeout ကျော်ရန်

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "API Key missing in Vercel settings" }, { status: 500 });

    const { pdfBase64 } = await req.json();
    if (!pdfBase64) return NextResponse.json({ error: "No PDF data received" }, { status: 400 });

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Model နာမည်ကို အသေချာဆုံး gemini-1.5-flash ပဲ သုံးပါမယ်
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are an expert accountant. Extract all transactions from this bank statement.
      Return ONLY a raw JSON array. No markdown, no backticks.
      Format: [{"date": "YYYY-MM-DD", "description": "Transaction Name", "amount": 10.50, "category": "meals"}]
      Note: Deposits are positive numbers, Withdrawals are negative numbers.
    `;

    const result = await model.generateContent([
      {
        inlineData: {
          data: pdfBase64,
          mimeType: "application/pdf",
        },
      },
      prompt,
    ]);

    const response = await result.response;
    const text = response.text();
    
    // JSON ကို သေသေချာချာ ဆွဲထုတ်ခြင်း
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("AI failed to return valid JSON format");
    }

    return NextResponse.json(JSON.parse(jsonMatch[0]));
    
  } catch (error: any) {
    console.error("DETAILED SERVER ERROR:", error.message);
    return NextResponse.json({ 
        error: "Sync Failed", 
        details: error.message 
    }, { status: 500 });
  }
}