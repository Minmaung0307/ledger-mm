import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { image } = await req.json();
    if (!process.env.GEMINI_API_KEY) throw new Error("API Key Missing");

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Extract info from this receipt. Return ONLY JSON: 
    { "merchant": "name", "amount": 0.00, "category": "val", "date": "YYYY-MM-DD" }
    Valid categories: income, produce_cogs, advertising, car_truck, mileage, contract_labor, home_office, insurance, legal_fees, meals, office, rent, software, travel, utilities, w2_wages, owner_draw, other, retirement_plans, inventory_purchases.`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: image.split(',')[1], mimeType: "image/jpeg" } }
    ]);

    const text = result.response.text().replace(/```json|```/gi, "").trim();
    return NextResponse.json(JSON.parse(text));
  } catch (error: any) {
    console.error("AI Route Error:", error);
    return NextResponse.json({ error: "AI Scan Failed" }, { status: 500 });
  }
}