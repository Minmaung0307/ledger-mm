// app/api/extract-statement/route.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "API Key missing in Vercel settings" }, { status: 500 });

    const { fileUrl } = await req.json();
    if (!fileUrl) return NextResponse.json({ error: "No file URL provided" }, { status: 400 });

    // ၁။ PDF ကို Server ကနေ လှမ်းဆွဲမယ်
    const fileRes = await fetch(fileUrl);
    const arrayBuffer = await fileRes.arrayBuffer();
    const base64PDF = Buffer.from(arrayBuffer).toString('base64');

    // ၂။ Gemini ကို ပိုမိုခိုင်မာတဲ့ ပုံစံနဲ့ ခေါ်မယ်
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash", // v1beta ထဲမှာ ဒီနာမည်က standard အဖြစ်ဆုံးပါ
    });

    const prompt = `
      Extract all transactions from this bank statement.
      Return ONLY a JSON array. Do not include markdown or text before/after.
      Format: [{"date": "YYYY-MM-DD", "description": "NAME", "amount": 0.00}]
      Rule: Deposits are positive, Withdrawals are negative.
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

    const response = await result.response;
    const text = response.text();
    
    // JSON ကို သေသေချာချာ ဆွဲထုတ်ခြင်း
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("AI RAW RESPONSE:", text);
      throw new Error("AI failed to return valid transaction list");
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