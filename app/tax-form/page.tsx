// app/tax-form/page.tsx
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { TAX_CATEGORIES } from '@/lib/constants';
import { Printer, FileCheck, Info } from 'lucide-react';

export default function TaxFormWorksheet() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        const start = new Date(selectedYear, 0, 1);
        const end = new Date(selectedYear, 11, 31, 23, 59, 59);
        const q = query(
          collection(db, "transactions"), 
          where("uid", "==", user.uid), 
          where("date", ">=", start), 
          where("date", "<=", end),
          orderBy("date", "desc")
        );
        onSnapshot(q, (snap) => {
          setData(snap.docs.map(doc => doc.data()));
          setLoading(false);
        });
      }
    });
  }, [selectedYear]);

  const getSum = (cat: string) => data.filter(d => d.category === cat).reduce((s, i) => s + i.amount, 0);

  const taxLines = [
    { line: "1", label: "Gross receipts or sales", value: getSum('income'), desc: "Total income before expenses" },
    { line: "8", label: "Advertising", value: getSum('advertising'), desc: "Marketing and ads" },
    { line: "9", label: "Car and truck expenses", value: getSum('car_truck') + getSum('mileage'), desc: "Gas, maintenance or mileage" },
    { line: "11", label: "Contract labor", value: getSum('contract_labor'), desc: "1099-NEC payments" },
    { line: "15", label: "Insurance (other than health)", value: getSum('insurance'), desc: "Business insurance premiums" },
    { line: "17", label: "Legal & professional services", value: getSum('legal_fees'), desc: "Legal, accounting and tax prep" },
    { line: "18", label: "Office expense", value: getSum('office') + getSum('software'), desc: "Supplies, software and small tools" },
    { line: "20", label: "Rent or lease", value: getSum('rent'), desc: "Vehicle, machinery or office rent" },
    { line: "24b", label: "Deductible meals", value: getSum('meals') * 0.5, desc: "Business meals (50% rule applied)" },
    { line: "25", label: "Utilities", value: getSum('utilities'), desc: "Business phone and internet" },
    { line: "26", label: "Wages (less jobs credit)", value: getSum('w2_wages'), desc: "W-2 Employee salaries" },
    { line: "27a", label: "Other expenses", value: getSum('other') + getSum('payroll_taxes'), desc: "Miscellaneous business costs" },
    { line: "30", label: "Business use of your home", value: getSum('home_office'), desc: "Home office allocation" },
  ];

  const totalIncome = taxLines[0].value;
  const totalExpenses = taxLines.slice(1).reduce((s, i) => s + i.value, 0);
  const netProfit = totalIncome - totalExpenses;

  if (loading) return <Layout><p className="p-20 text-center font-black animate-pulse uppercase">Generating Worksheet...</p></Layout>;

  return (
    <Layout>
      <div className="pt-4 pb-40 max-w-4xl mx-auto px-4">
        
        {/* Actions - No Print */}
        <div className="flex justify-between items-center mb-8 no-print">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Tax Preparation</h2>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest italic mt-1">Ready for IRS Schedule C Filing</p>
          </div>
          <button onClick={() => window.print()} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-black text-xs shadow-lg hover:bg-slate-900 transition flex items-center gap-2">
            <Printer size={18}/> PRINT WORKSHEET
          </button>
        </div>

        {/* --- The Digital Worksheet --- */}
        <div className="bg-white border-2 border-slate-900 shadow-xl print:border-slate-300 print:shadow-none overflow-hidden rounded-3xl">
          {/* Header */}
          <div className="p-6 bg-slate-900 text-white flex justify-between items-center print:bg-slate-100 print:text-black">
            <div>
              <h3 className="text-xl font-black uppercase italic tracking-tighter">IRS Form 1040 (Schedule C)</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest print:text-slate-600">Year: {selectedYear} • Taxpayer Worksheet</p>
            </div>
            <div className="bg-emerald-500 text-white px-3 py-1 rounded font-black text-[9px] print:border print:border-black print:text-black print:bg-white">
                OFFICIAL DATA READY
            </div>
          </div>

          {/* Net Profit Bar */}
          <div className="p-6 bg-emerald-50 border-b border-slate-200 flex justify-between items-center print:bg-white">
            <span className="font-black text-slate-900 uppercase text-[10px] tracking-widest">Line 31: Net Profit / Loss</span>
            <span className="text-3xl font-black text-emerald-600 print:text-black">${netProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
          </div>

          {/* Table Container - ကျစ်ကျစ်လစ်လစ် ဖြစ်စေရန် Table သုံးပါမယ် */}
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 print:bg-slate-50">
                <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest w-16 text-center">Line</th>
                <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Description / Explanation</th>
                <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Amount ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {taxLines.map((line, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition print:hover:bg-white">
                  <td className="p-4 text-center">
                    <span className="inline-block px-2 py-1 bg-slate-100 rounded font-black text-[10px] text-slate-600 border border-slate-200">{line.line}</span>
                  </td>
                  <td className="p-4">
                    <p className="font-black text-slate-900 text-xs uppercase tracking-tight">{line.label}</p>
                    <p className="text-[10px] font-bold text-slate-400 italic leading-none mt-1">{line.desc}</p>
                  </td>
                  <td className="p-4 text-right">
                    <span className="font-black text-slate-900 text-sm tracking-tight">
                        {line.value.toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div className="p-6 bg-slate-50 text-slate-400 text-[9px] font-bold text-center leading-normal border-t border-slate-200 print:bg-white">
            <p>Disclaimer: This is a system-generated tax worksheet for information purposes only. <br/> Use these figures to complete your IRS Form 1040 Schedule C.</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { size: portrait; margin: 10mm; }
          aside, nav, .no-print { display: none !important; }
          main { margin-left: 0 !important; padding: 0 !important; }
          .bg-white { border: 1px solid #ddd !important; border-radius: 0 !important; }
          body { background: white !important; }
        }
      `}</style>
    </Layout>
  );
}