// app/accounts/page.tsx
"use client";
import Layout from '@/components/Layout';
import { Plus, Landmark, CreditCard, Wallet } from 'lucide-react';

export default function ChartOfAccounts() {
  const accountTypes = [
    { title: "Assets (ပိုင်ဆိုင်မှု)", icon: <Landmark className="text-emerald-500" />, items: ["Business Checking", "Cash on Hand", "Accounts Receivable"] },
    { title: "Liabilities (အကြွေး)", icon: <CreditCard className="text-rose-500" />, items: ["Business Credit Card", "SBA Loan"] },
    { title: "Equity (အရင်းအနှီး)", icon: <Wallet className="text-amber-500" />, items: ["Owner's Equity", "Retained Earnings"] },
  ];

  return (
    <Layout>
      <div className="pt-6">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Chart of Accounts</h2>
          <button className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-xs shadow-xl flex items-center gap-2">
            <Plus size={16}/> ADD NEW ACCOUNT
          </button>
        </div>

        <div className="space-y-6">
          {accountTypes.map((type) => (
            <div key={type.title} className="bg-white rounded-[2rem] shadow-xl border border-slate-50 overflow-hidden">
              <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-center gap-3">
                {type.icon}
                <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">{type.title}</h3>
              </div>
              <div className="divide-y divide-slate-50">
                {type.items.map(item => (
                  <div key={item} className="p-6 flex justify-between items-center hover:bg-slate-50 transition">
                    <p className="font-bold text-slate-700">{item}</p>
                    <p className="font-black text-slate-900">$0.00</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}