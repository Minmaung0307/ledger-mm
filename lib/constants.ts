// lib/constants.ts
export const TAX_CATEGORIES = [
  { 
    label: "Income / Sales", 
    value: "income", 
    type: "income",
    line: "Schedule C - Line 1",
    info: "Gross Receipts: လုပ်ငန်းမှ ရရှိသမျှ ဝင်ငွေအားလုံး (Cash, Zelle, Card) ကို ဤနေရာတွင် ထည့်ပါ။ ဒါဟာ အခွန်မတွက်မီ စုစုပေါင်း ဝင်ငွေ ဖြစ်ပါတယ်။",
    color: "#10b981"
  },

  // EXPENSES (DEDUCTIBLE)
  { 
    label: "Produce & Raw Materials (COGS)", 
    value: "produce_cogs", 
    type: "expense",
    line: "Schedule C - Part III (Line 36)",
    info: "Inventory Costs: ဆိုင်အတွက်ဝယ်သော ဟင်းသီးဟင်းရွက်နှင့် ကုန်ကြမ်းများ (ဥပမာ - Tuna, Produce) ဖြစ်ပါတယ်။ ဒါတွေက အမြတ်ကို တိုက်ရိုက် လျှော့ချပေးပါတယ်။",
    color: "#f59e0b"
  },
  { 
    label: "Inventory Purchases", 
    value: "inventory_purchases", 
    type: "expense",
    line: "Schedule C - Part III (Line 36)",
    info: "Bulk Orders: Company များထံမှ ၂ လတစ်ခါ မှာယူရသော Raw, Cooked, Dry ပစ္စည်းများ ဖြစ်ပါတယ်။",
    color: "#0bf5bb"
  },
  { 
    label: "Produce (Produce/Supplies)", 
    value: "produce", 
    type: "expense",
    line: "Schedule C - Part III (Line 36)",
    info: "Direct Supplies: ဆိုင်အတွက်ဝယ်သော ဟင်းသီးဟင်းရွက်၊ သခွားသီး စသည့် ကုန်ကြမ်းများ ဖြစ်ပါတယ်။ COGS အနေဖြင့် အခွန်ခုနှိမ်နိုင်ပါတယ်။",
    color: "#fbbf24"
  },
  { 
    label: "Advertising", 
    value: "advertising", 
    type: "expense",
    line: "Schedule C - Line 8",
    info: "Marketing: Facebook/Google Ads၊ လိပ်စာကတ်၊ ဆိုင်ဆိုင်းဘုတ် ရိုက်ခြင်း နှင့် လုပ်ငန်းကြော်ငြာစရိတ်များ ဖြစ်ပါတယ်။",
    color: "#3b82f6"
  },
  { 
    label: "Car & Truck (Gas/Repairs)", 
    value: "car_truck", 
    type: "expense",
    line: "Schedule C - Line 9",
    info: "Vehicle Expense: လုပ်ငန်းသုံးကား၏ ဆီဖိုး၊ ပြင်ဆင်ခ နှင့် အာမခံကြေးများ ဖြစ်ပါတယ်။ (Mileage ဖြင့် တွက်ပါက ဤနေရာတွင် မထည့်ပါနှင့်)",
    color: "#6366f1"
  },
  { 
    label: "Business Mileage (@ $0.67/mile)", 
    value: "mileage", 
    type: "expense",
    line: "Schedule C - Line 9 / Part IV",
    info: "IRS Standard Rate: ဆီဖိုးအစား IRS မိုင်နှုန်း ($0.67/mile) ဖြင့် တွက်ချက်ခြင်း ဖြစ်ပါတယ်။ ၁ မိုင်လျှင် ၆၇ ဆင့်နှုန်းဖြင့် ပမာဏကို တွက်ချက်ထည့်သွင်းပါ။",
    color: "#8b5cf6"
  },
  { 
    label: "Contract Labor (1099)", 
    value: "contract_labor", 
    type: "expense",
    line: "Schedule C - Line 11",
    info: "1099 Pay: Contractor များအား ပေးချေသော Payroll စရိတ်များ ဖြစ်ပါတယ်။ တစ်ဦးတည်းကို $600 ကျော်ပါက 1099-NEC ထုတ်ပေးရပါမည်။",
    color: "#ec4899"
  },
  { 
    label: "Home Office (Rent/Utilities)", 
    value: "home_office", 
    type: "expense",
    line: "Schedule C - Line 30",
    info: "Prorated Home Expense: အိမ်မှ အလုပ်လုပ်ပါက အိမ်လစာ၊ မီးဖိုးများကို လုပ်ငန်းသုံး ဧရိယာ ရာခိုင်နှုန်းအလိုက် အချိုးကျ တွက်ချက်ခြင်း ဖြစ်ပါတယ်။",
    color: "#06b6d4"
  },
  { 
    label: "Insurance (Business)", 
    value: "insurance", 
    type: "expense",
    line: "Schedule C - Line 15",
    info: "Business Protection: လုပ်ငန်းလည်ပတ်ရန် လိုအပ်သော အာမခံကြေးများ (ဥပမာ - Liability, Workers Comp) ဖြစ်ပါတယ်။",
    color: "#f43f5e"
  },
  { 
    label: "Legal & Professional Fees", 
    value: "legal_fees", 
    type: "expense",
    line: "Schedule C - Line 17",
    info: "Expert Fees: ရှေ့နေခ၊ စာရင်းကိုင်ခ၊ လုပ်ငန်းလိုင်စင် လျှောက်ခ နှင့် အခွန်ပြင်ဆင်ခ စသည့် ကျွမ်းကျင်သူ အခကြေးငွေများ ဖြစ်ပါတယ်။",
    color: "#14b8a6"
  },
  { 
    label: "Meals (50% Deductible)", 
    value: "meals", 
    type: "expense",
    line: "Schedule C - Line 24b",
    info: "Business Dining: Client နှင့် အလုပ်ကိစ္စ ဆွေးနွေးရင်း စားသောက်စရိတ် ဖြစ်ပါတယ်။ IRS ဥပဒေအရ ၅၀% သာ အခွန်ခုနှိမ်ခွင့် ရှိပါတယ်။",
    color: "#f97316"
  },
  { 
    label: "Office Expense", 
    value: "office", 
    type: "expense",
    line: "Schedule C - Line 18",
    info: "General Supplies: စာရွက်၊ ဘောပင်၊ ရုံးသုံးပစ္စည်း နှင့် စာတိုက်ခ စသည့် အသေးစား အသုံးစရိတ်များ ဖြစ်ပါတယ်။",
    color: "#94a3b8"
  },
  { 
    label: "Franchise & Royalty Fees", 
    value: "franchise_fees", 
    type: "expense",
    line: "Schedule C - Line 27a",
    info: "Business Licenses: လုပ်ငန်းလိုင်စင်ကြေး နှင့် လစဉ်ပေးရသော Royalty ကော်မရှင်များ ဖြစ်ပါတယ်။",
    color: "#218cf7"
  },
  { 
    label: "Rent or Lease", 
    value: "rent", 
    type: "expense",
    line: "Schedule C - Line 20",
    info: "Commercial Rent: ဆိုင်ခန်း၊ ရုံးခန်း သို့မဟုတ် ဂိုဒေါင် ငှားရမ်းခများ ဖြစ်ပါတယ်။",
    color: "#a855f7"
  },
  { 
    label: "Hardware & Equipment", 
    value: "hardware", 
    type: "expense",
    line: "Schedule C - Line 18",
    info: "Physical Assets: $2,500 အောက်တန်ဖိုးရှိသော Computer, Tablet, Printer စသည့် ပစ္စည်းဝယ်ယူမှုများ ဖြစ်ပါတယ်။",
    color: "#60420e"
  },
  { 
    label: "Software & Subscriptions", 
    value: "software", 
    type: "expense",
    line: "Schedule C - Line 18",
    info: "Digital Tools: Adobe, ChatGPT, Cloud Storage စသည့် လုပ်ငန်းသုံး Software လစဉ်ကြေးများ ဖြစ်ပါတယ်။",
    color: "#def50b"
  },
  { 
    label: "Travel", 
    value: "travel", 
    type: "expense",
    line: "Schedule C - Line 24a",
    info: "Business Trip: အလုပ်ကိစ္စဖြင့် ခရီးသွားရသော လေယာဉ်လက်မှတ်၊ ဟိုတယ် နှင့် Uber ခများ ဖြစ်ပါတယ်။",
    color: "#cce94b"
  },
  { 
    label: "Utilities (Internet/Phone)", 
    value: "utilities", 
    type: "expense",
    line: "Schedule C - Line 25",
    info: "Business Bills: လုပ်ငန်းသုံး ဖုန်း၊ အင်တာနက်၊ ရေ၊ မီး ဖိုးများ ဖြစ်ပါတယ်။",
    color: "#0ea5e9"
  },
  { 
    label: "W-2 Wages (Employee Pay)", 
    value: "w2_wages", 
    type: "expense",
    line: "Schedule C - Line 26",
    info: "Salaries: W-2 ဝန်ထမ်းများအား ပေးချေသော စုစုပေါင်းလစာ (Gross Pay) ဖြစ်ပါတယ်။",
    color: "#ef4444"
  },
  { 
    label: "Payroll Taxes (Employer Share)", 
    value: "payroll_taxes", 
    type: "expense",
    line: "Schedule C - Line 23",
    info: "Employer Taxes: ဝန်ထမ်းများအတွက် လုပ်ငန်းရှင်မှ ထပ်ဆောင်းပေးရသော Social Security/Medicare အခွန်များ ဖြစ်ပါတယ်။",
    color: "#d20bf5"
  },

  // NON-DEDUCTIBLE / PAYMENTS
  { 
    label: "Owner's Draw (Personal Use)", 
    value: "owner_draw", 
    type: "equity",
    line: "N/A (Equity)",
    info: "Non-deductible: လုပ်ငန်းရှင်မှ ကိုယ်ပိုင်သုံးရန် ထုတ်ယူငွေ ဖြစ်ပါတယ်။ အသုံးစရိတ် မဟုတ်သောကြောင့် အခွန်အတွက် ခုနှိမ်၍ မရပါ။",
    color: "#bf7b05"
  },
  { 
    label: "Quarterly Estimated Tax Paid", 
    value: "estimated_tax_paid", 
    type: "payment",
    line: "Form 1040-ES",
    info: "Tax Payment: ၃ လတစ်ကြိမ် အစိုးရကို ကြိုပေးထားသော အခွန်ပမာဏ ဖြစ်ပါတယ်။ ဒါဟာ အသုံးစရိတ် မဟုတ်ဘဲ အခွန်ဆောင်ခြင်း ဖြစ်ပါတယ်။",
    color: "#f5700b"
  },
  
  { 
    label: "Other Business Expenses", 
    value: "other", 
    type: "expense",
    line: "Schedule C - Line 27a",
    info: "Misc: အထက်ပါ Category များတွင် မပါဝင်သော အထွေထွေ လုပ်ငန်းအသုံးစရိတ်များ ဖြစ်ပါတယ်။",
    color: "#475569"
  },
];