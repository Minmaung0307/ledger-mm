// app/analytics/matrix/page.tsx
"use client";
import { useEffect, useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { Download, Search, FileSpreadsheet, Calendar, Table as TableIcon, ArrowUpRight, ArrowDownRight, Info } from "lucide-react";
import * as XLSX from "xlsx";
import { TAX_CATEGORIES } from "@/lib/constants";

export default function AnalyticsMatrix() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expenseSearch, setExpenseSearch] = useState("");

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2024 + 2 }, (_, i) => 2024 + i);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const start = new Date(selectedYear, 0, 1);
        const end = new Date(selectedYear, 11, 31, 23, 59, 59);
        const q = query(
          collection(db, "transactions"),
          where("uid", "==", user.uid),
          where("date", ">=", start),
          where("date", "<=", end),
          orderBy("date", "asc")
        );
        const unsubscribeData = onSnapshot(q, (snap) => {
          if (!snap) return;
          setData(snap.docs.map((doc) => {
            const d = doc.data();
            const date = d.transactionDate?.toDate?.() || d.date?.toDate?.() || new Date();
            return { ...d, id: doc.id, month: date.getMonth(), day: date.getDate() };
          }));
          setLoading(false);
        });
        return () => unsubscribeData();
      }
    });
    return () => unsubscribeAuth();
  }, [selectedYear]);

  // --- Logic Section (useMemo သုံးပြီး တွက်ချက်မှု ပိုမြန်အောင် လုပ်ထားပါတယ်) ---
  const { incomeMatrix, expenseMatrix, incomeMonthlyTotals, expenseMonthlyTotals } = useMemo(() => {
    const incM: any = { "Week 1": {}, "Week 2": {}, "Week 3": {}, "Week 4": {}, "Week 5": {} };
    const expM: any = {};
    const incMonthly = Array(12).fill(0);
    const expMonthly = Array(12).fill(0);

    data.forEach((d) => {
      const isIncome = d.category === "income" || d.category === "w2_income";
      const isExpense = !isIncome && d.category !== "estimated_tax_paid" && d.category !== "owner_draw";

      if (isIncome) {
        const week = d.day <= 7 ? "Week 1" : d.day <= 14 ? "Week 2" : d.day <= 21 ? "Week 3" : d.day <= 28 ? "Week 4" : "Week 5";
        incM[week][d.month] = (incM[week][d.month] || 0) + d.amount;
        incMonthly[d.month] += d.amount;
      } else if (isExpense) {
        // နာမည်နောက်က (Apr), (May) စတာတွေကို ဖြုတ်ပြီး စုစည်းမယ်
        const cleanName = d.description.split(' (')[0].trim();
        if (!expM[cleanName]) expM[cleanName] = Array(12).fill(0);
        expM[cleanName][d.month] += d.amount;
        expMonthly[d.month] += d.amount;
      }
    });

    return { incomeMatrix: incM, expenseMatrix: expM, incomeMonthlyTotals: incMonthly, expenseMonthlyTotals: expMonthly };
  }, [data]);

  const filteredExpenseItems = Object.keys(expenseMatrix)
    .filter((item) => item.toLowerCase().includes(expenseSearch.toLowerCase()))
    .sort();

  const getRowTotal = (rowData: any) => {
    if (Array.isArray(rowData)) return rowData.reduce((s, v) => s + (v || 0), 0);
    return Object.values(rowData).reduce((s: number, v: any) => s + (v || 0), 0);
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const incRows = Object.keys(incomeMatrix).map(w => ({
      Weeks: w, ...monthNames.reduce((acc, m, i) => ({ ...acc, [m]: incomeMatrix[w][i] || 0 }), {}),
      "Year Total": getRowTotal(incomeMatrix[w])
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(incRows), "Weekly_Income");

    const expRows = filteredExpenseItems.map(item => ({
      Item: item, ...monthNames.reduce((acc, m, i) => ({ ...acc, [m]: expenseMatrix[item][i] || 0 }), {}),
      "Year Total": getRowTotal(expenseMatrix[item])
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expRows), "Itemized_Expenses");
    XLSX.writeFile(wb, `Business_Matrix_${selectedYear}.xlsx`);
  };

  if (loading) return <Layout><p className="p-20 text-center font-black animate-pulse text-slate-400">GENERATING ANALYTICS MATRIX...</p></Layout>;

  return (
    <Layout>
      <div className="pt-4 pb-40 px-4 max-w-full overflow-hidden">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 no-print">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-slate-900 text-white rounded-3xl flex items-center justify-center shadow-2xl"><TableIcon size={28} /></div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Analytics Matrix</h2>
              <div className="flex items-center gap-2 mt-1">
                <Calendar size={14} className="text-emerald-500" />
                <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="bg-transparent font-black text-emerald-600 outline-none cursor-pointer text-sm uppercase">
                    {years.reverse().map(y => <option key={y} value={y}>{y} FISCAL YEAR</option>)}
                </select>
              </div>
            </div>
          </div>
          <button onClick={exportToExcel} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-xs flex items-center gap-2 shadow-xl hover:bg-slate-900 transition-all active:scale-95">
            <FileSpreadsheet size={18} /> EXPORT TO EXCEL
          </button>
        </div>

        {/* --- 1. Weekly Income Flow --- */}
        <div className="bg-white dark:bg-slate-800 rounded-[3rem] shadow-2xl border border-slate-50 dark:border-slate-700 overflow-hidden mb-16">
          <div className="p-8 border-b-2 border-slate-50 dark:border-slate-700 bg-emerald-50/20 flex items-center gap-3">
            <ArrowUpRight className="text-emerald-500" />
            <h3 className="text-xl font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest italic">Weekly Income Analysis</h3>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1400px]">
              <thead>
                <tr className="bg-slate-900 text-slate-400 font-black text-[10px] uppercase tracking-widest border-b border-slate-800">
                  <th className="p-6 sticky left-0 bg-slate-900 z-10 border-r border-slate-800">Timeframe</th>
                  {monthNames.map((m) => <th key={m} className="p-6 text-center">{m}</th>)}
                  <th className="p-6 bg-emerald-600 text-white text-right sticky right-0 z-10">Row Total</th>
                </tr>
              </thead>
              <tbody className="font-bold text-xs">
                {["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"].map((week) => (
                  <tr key={week} className="border-b border-slate-50 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="p-6 bg-slate-50 dark:bg-slate-900 font-black text-slate-900 dark:text-white sticky left-0 z-10 border-r border-slate-200 dark:border-slate-700 uppercase italic">{week}</td>
                    {monthNames.map((_, i) => (
                      <td key={i} className="p-6 text-right text-slate-500 dark:text-slate-400 font-black">
                        {incomeMatrix[week][i] ? `$${incomeMatrix[week][i].toLocaleString()}` : "-"}
                      </td>
                    ))}
                    <td className="p-6 text-right bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 font-black sticky right-0 z-10 border-l border-emerald-100 dark:border-emerald-800 shadow-[-10px_0_15px_rgba(0,0,0,0.02)]">
                      ${getRowTotal(incomeMatrix[week]).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                {/* Monthly Totals Footer */}
                <tr className="bg-emerald-600 text-white font-black border-t-2 border-emerald-700">
                  <td className="p-6 sticky left-0 bg-emerald-700 z-10 uppercase tracking-tighter">Monthly Totals</td>
                  {incomeMonthlyTotals.map((total, i) => (
                    <td key={i} className="p-6 text-right font-black shadow-inner">
                      ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  ))}
                  <td className="p-6 text-right bg-emerald-800 text-lg sticky right-0 z-10 italic underline decoration-white decoration-4 underline-offset-4 shadow-2xl">
                    ${incomeMonthlyTotals.reduce((a,b)=>a+b, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* --- 2. Itemized Expense Matrix --- */}
        <div className="bg-white dark:bg-slate-800 rounded-[3rem] shadow-2xl border border-slate-50 dark:border-slate-700 overflow-hidden mb-20">
          <div className="p-8 border-b-2 border-slate-50 dark:border-slate-700 bg-rose-50/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
               <ArrowDownRight className="text-rose-500" />
               <h3 className="text-xl font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest italic">Itemized Spending Matrix</h3>
            </div>
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              <input type="text" placeholder="Search by item name (e.g. Tuna)..." value={expenseSearch} onChange={(e) => setExpenseSearch(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:border-rose-400 transition-all shadow-inner" />
            </div>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1500px]">
              <thead>
                <tr className="bg-slate-900 text-slate-500 font-black text-[10px] uppercase tracking-widest border-b border-slate-800">
                  <th className="p-6 sticky left-0 bg-slate-900 z-10 border-r border-slate-800 min-w-[280px]">Purchase Item</th>
                  {monthNames.map((m) => <th key={m} className="p-6 text-center">{m}</th>)}
                  <th className="p-6 bg-rose-600 text-white text-right sticky right-0 z-10">Total Sum</th>
                </tr>
              </thead>
              <tbody className="font-bold text-xs">
                {filteredExpenseItems.length === 0 ? (
                    <tr><td colSpan={14} className="p-20 text-center text-slate-300 font-black italic uppercase tracking-widest">No matching expense items found</td></tr>
                ) : filteredExpenseItems.map((item) => (
                  <tr key={item} className="border-b border-slate-50 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50 group transition-colors">
                    <td className="p-6 bg-slate-50/80 dark:bg-slate-900 font-black text-slate-900 dark:text-slate-100 sticky left-0 z-10 border-r border-slate-200 dark:border-slate-700 truncate">{item}</td>
                    {expenseMatrix[item].map((amt: number, i: number) => (
                      <td key={i} className="p-6 text-right text-slate-400 dark:text-slate-500 font-black">
                        {amt > 0 ? `$${amt.toLocaleString()}` : "-"}
                      </td>
                    ))}
                    <td className="p-6 text-right bg-rose-50 dark:bg-rose-950/40 text-rose-600 font-black sticky right-0 z-10 border-l border-rose-100 dark:border-rose-800 shadow-[-10px_0_15px_rgba(0,0,0,0.02)]">
                      ${getRowTotal(expenseMatrix[item]).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                {/* Grand Totals Footer */}
                <tr className="bg-slate-900 text-white font-black border-t-4 border-rose-600">
                  <td className="p-6 sticky left-0 bg-slate-950 z-10 uppercase tracking-tighter">All Expenses Total</td>
                  {expenseMonthlyTotals.map((total, i) => (
                    <td key={i} className="p-6 text-right font-black text-rose-400">
                      ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  ))}
                  <td className="p-6 text-right bg-rose-600 text-lg sticky right-0 z-10 italic underline decoration-white decoration-4 underline-offset-4 shadow-2xl">
                    ${expenseMonthlyTotals.reduce((a,b)=>a+b, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}