// app/analytics/matrix/page.tsx
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Download, Table as TableIcon, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function AnalyticsMatrix() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        const start = new Date(selectedYear, 0, 1);
        const end = new Date(selectedYear, 11, 31, 23, 59, 59);
        const q = query(collection(db, "transactions"), where("uid", "==", user.uid), where("date", ">=", start), where("date", "<=", end), orderBy("date", "asc"));
        onSnapshot(q, (snap) => {
          setData(snap.docs.map(doc => {
              const d = doc.data();
              const date = d.transactionDate?.toDate() || d.date?.toDate() || new Date();
              return { ...d, dateObj: date, month: date.getMonth(), day: date.getDate() };
          }));
          setLoading(false);
        });
      }
    });
  }, [selectedYear]);

  // --- Logic: ဝင်ငွေကို အပတ်စဉ် ခွဲထုတ်ခြင်း (Weeks 1-5) ---
  const getIncomeMatrix = () => {
    const matrix: any = { "Week1": {}, "Week2": {}, "Week3": {}, "Week4": {}, "Week5": {} };
    data.filter(d => d.category === 'income' || d.category === 'w2_income').forEach(d => {
        let week = "Week1";
        if (d.day <= 7) week = "Week1";
        else if (d.day <= 14) week = "Week2";
        else if (d.day <= 21) week = "Week3";
        else if (d.day <= 28) week = "Week4";
        else week = "Week5";
        
        matrix[week][d.month] = (matrix[week][d.month] || 0) + d.amount;
    });
    return matrix;
  };

  // --- Logic: ထွက်ငွေကို ပစ္စည်းအမည် (Tuna, Salmon) အလိုက် ခွဲထုတ်ခြင်း ---
  const getExpenseMatrix = () => {
    const matrix: any = {};
    data.filter(d => d.category !== 'income' && d.category !== 'w2_income' && d.category !== 'estimated_tax_paid').forEach(d => {
        if (!matrix[d.description]) matrix[d.description] = {};
        matrix[d.description][d.month] = (matrix[d.description][d.month] || 0) + d.amount;
    });
    return matrix;
  };

  const incomeMatrix = getIncomeMatrix();
  const expenseMatrix = getExpenseMatrix();

  // Excel ထုတ်ယူခြင်း
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Income Sheet
    const incomeRows = Object.keys(incomeMatrix).map(week => ({
        Weeks: week,
        ...monthNames.reduce((acc, m, i) => ({ ...acc, [m]: incomeMatrix[week][i] || 0 }), {})
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(incomeRows), "Income_Weekly");

    // Expense Sheet
    const expenseRows = Object.keys(expenseMatrix).map(item => ({
        Item: item,
        ...monthNames.reduce((acc, m, i) => ({ ...acc, [m]: expenseMatrix[item][i] || 0 }), {})
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expenseRows), "Expense_Items");

    XLSX.writeFile(wb, `Business_Matrix_${selectedYear}.xlsx`);
  };

  if (loading) return <Layout><p className="p-20 text-center font-black animate-pulse">GENERATING MATRIX...</p></Layout>;

  return (
    <Layout>
      <div className="pt-6 pb-40 max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-10 no-print">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Analytics Matrix</h2>
            <div className="flex gap-4">
                <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl font-black text-xs outline-none">
                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <button onClick={exportToExcel} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg active:scale-95 transition-all"><Download size={18}/> EXPORT STYLED EXCEL</button>
            </div>
        </div>

        {/* --- ၁။ Weekly Income Table --- */}
        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl border border-slate-50 dark:border-slate-700 overflow-hidden mb-16">
            <div className="p-8 border-b-4 border-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/10">
                <h3 className="text-xl font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Weekly Income Flow</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900 text-slate-400 font-black text-[9px] uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
                            <th className="p-5 border-r border-slate-100 dark:border-slate-700">Weeks</th>
                            {monthNames.map(m => <th key={m} className="p-5 min-w-[120px]">{m}</th>)}
                        </tr>
                    </thead>
                    <tbody className="font-bold text-sm text-slate-700 dark:text-slate-300">
                        {Object.keys(incomeMatrix).map(week => (
                            <tr key={week} className="border-b border-slate-50 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                <td className="p-5 bg-slate-50 dark:bg-slate-900 font-black text-slate-900 dark:text-white border-r border-slate-100 dark:border-slate-700">{week}</td>
                                {monthNames.map((_, i) => (
                                    <td key={i} className="p-5 text-right font-black text-emerald-600 dark:text-emerald-400">
                                        {incomeMatrix[week][i] ? `$${incomeMatrix[week][i].toLocaleString()}` : "-"}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* --- ၂။ Itemized Expense Table (Tuna, Salmon, etc.) --- */}
        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl border border-slate-50 dark:border-slate-700 overflow-hidden">
            <div className="p-8 border-b-4 border-rose-500 bg-rose-50/30 dark:bg-rose-900/10">
                <h3 className="text-xl font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest">Itemized Expense Matrix</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900 text-slate-400 font-black text-[9px] uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
                            <th className="p-5 border-r border-slate-100 dark:border-slate-700">Items (Description)</th>
                            {monthNames.map(m => <th key={m} className="p-5 min-w-[120px]">{m}</th>)}
                        </tr>
                    </thead>
                    <tbody className="font-bold text-sm text-slate-700 dark:text-slate-300">
                        {Object.keys(expenseMatrix).map(item => (
                            <tr key={item} className="border-b border-slate-50 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                <td className="p-5 bg-slate-50 dark:bg-slate-900 font-black text-slate-900 dark:text-white border-r border-slate-100 dark:border-slate-700">{item}</td>
                                {monthNames.map((_, i) => (
                                    <td key={i} className="p-5 text-right font-black text-rose-500 dark:text-rose-400">
                                        {expenseMatrix[item][i] ? `$${expenseMatrix[item][i].toLocaleString()}` : "-"}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </Layout>
  );
}