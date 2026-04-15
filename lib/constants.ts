// lib/constants.ts မှာ ဒီအတိုင်း အစားထိုးလိုက်ပါ
export const TAX_CATEGORIES = [
  { label: "Income / Sales", value: "income", type: "income" },

  // Expenses
  { label: "Raw Materials (Ingredients)", value: "cogs_purchases", type: "expense" },
  { label: "Produce (Produce/Supplies)", value: "produce", type: "expense" },
  { label: "Advertising", value: "advertising", type: "expense" },
  { label: "Car & Truck (Gas/Repairs)", value: "car_truck", type: "expense" },
  { label: "Business Mileage (@ $0.67/mile)", value: "mileage", type: "expense" }, // <--- Mileage
  { label: "Contract Labor (1099)", value: "contract_labor", type: "expense" },
  { label: "Home Office (Rent/Utilities)", value: "home_office", type: "expense" }, // <--- Home Office
  { label: "Insurance (Business)", value: "insurance", type: "expense" },
  { label: "Legal & Professional Fees", value: "legal_fees", type: "expense" },
  { label: "Meals (50% Deductible)", value: "meals", type: "expense" },
  { label: "Office Expense", value: "office", type: "expense" },
  { label: "Rent or Lease", value: "rent", type: "expense" },
  { label: "Hardware & Equipment", value: "hardware", type: "expense" },
  { label: "Software & Subscriptions", value: "software", type: "expense" },
  { label: "Travel", value: "travel", type: "expense" },
  { label: "Utilities (Internet/Phone)", value: "utilities", type: "expense" },
  { label: "W-2 Wages (Employee Pay)", value: "w2_wages", type: "expense" },
  { label: "Payroll Taxes (Employer Share)", value: "payroll_taxes", type: "expense" },
  
  // NON-DEDUCTIBLE / EQUITY (အခွန်အတွက် ခုနှိမ်၍မရသောစာရင်းများ)
  { label: "Owner's Draw (Personal Use)", value: "owner_draw", type: "equity" },
  // Tax Payments (Deductible expense မဟုတ်ဘဲ အစိုးရကို ကြိုပေးထားတာဖြစ်လို့ type ကို 'payment' လို့ ထားပါမယ်)
  { label: "Quarterly Estimated Tax Paid", value: "estimated_tax_paid", type: "payment" }, // <--- Estimated Tax
  
  { label: "Other Business Expenses", value: "other", type: "expense" },
];