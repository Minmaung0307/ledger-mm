// app/api/extract-statement/route.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { pdfBase64 } = await req.json();
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are an expert accountant. Analyze this bank statement PDF and extract ALL transactions.
      For each transaction, determine:
      1. date (YYYY-MM-DD)
      2. description (Merchant name)
      3. amount (number, positive for income, negative for expenses)
      4. category (Choose the best fit from our system: income, produce_cogs, advertising, car_truck, meals, office, utilities, other)
      
      Return ONLY a JSON array of objects. 
      Example: [{"date": "2026-01-05", "description": "Costco", "amount": -150.00, "category": "produce_cogs"}]
    `;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: pdfBase64, mimeType: "application/pdf" } }
    ]);

    const text = result.response.text();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("Could not parse transactions");

    return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}