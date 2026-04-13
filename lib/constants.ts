// lib/constants.ts
export const TAX_CATEGORIES = [
  // INCOME
  { label: "Income / Sales", value: "income", type: "income" },

  // OPERATING EXPENSES (IRS SCHEDULE C)
  { label: "Advertising", value: "advertising", type: "expense" },
  { label: "Car & Truck", value: "car_truck", type: "expense" },
  { label: "Contract Labor (1099)", value: "contract_labor", type: "expense" },
  { label: "Insurance (Business)", value: "insurance", type: "expense" },
  { label: "Legal & Professional Fees", value: "legal_fees", type: "expense" },
  { label: "Meals (50% Deductible)", value: "meals", type: "expense" },
  { label: "Office Expense", value: "office", type: "expense" },
  { label: "Rent or Lease", value: "rent", type: "expense" },
  { label: "Software & Subscriptions", value: "software", type: "expense" },
  { label: "Travel", value: "travel", type: "expense" },
  { label: "Utilities (Internet/Phone)", value: "utilities", type: "expense" },
  
  // PAYROLL (FOR W-2 EMPLOYEES)
  { label: "W-2 Wages (Employee Pay)", value: "w2_wages", type: "expense" },
  { label: "Payroll Taxes (Employer Share)", value: "payroll_taxes", type: "expense" },
  
  // OTHER
  { label: "Other Business Expenses", value: "other", type: "expense" },
];