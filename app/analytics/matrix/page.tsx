// app/analytics/matrix/page.tsx
"use client";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import {
  Download,
  Search,
  FileSpreadsheet,
  Calendar,
  Table as TableIcon,
} from "lucide-react";
import * as XLSX from "xlsx";
import { TAX_CATEGORIES } from "@/lib/constants";

export default function AnalyticsMatrix() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expenseSearch, setExpenseSearch] = useState("");

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: currentYear - 2024 + 2 },
    (_, i) => 2024 + i,
  );

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
          orderBy("date", "asc"),
        );
        const unsubscribeData = onSnapshot(q, (snap) => {
          if (!snap) return;
          setData(
            snap.docs.map((doc) => {
              const d = doc.data();
              const date =
                d.transactionDate?.toDate?.() ||
                d.date?.toDate?.() ||
                new Date();
              return { ...d, month: date.getMonth(), day: date.getDate() };
            }),
          );
          setLoading(false);
        });
        return () => unsubscribeData();
      }
    });
    return () => unsubscribeAuth();
  }, [selectedYear]);

  // --- Logic Section (Calculations moved out of JSX to avoid red lines) ---

  // ၁။ Weekly Income Matrix တွက်ချက်ခြင်း
  const incomeMatrix: any = {
    "Week 1": {},
    "Week 2": {},
    "Week 3": {},
    "Week 4": {},
    "Week 5": {},
  };
  data
    .filter((d) => d.category === "income" || d.category === "w2_income")
    .forEach((d) => {
      const week =
        d.day <= 7
          ? "Week 1"
          : d.day <= 14
            ? "Week 2"
            : d.day <= 21
              ? "Week 3"
              : d.day <= 28
                ? "Week 4"
                : "Week 5";
      incomeMatrix[week][d.month] =
        (incomeMatrix[week][d.month] || 0) + d.amount;
    });

  // ၂။ Expense Matrix တွက်ချက်ခြင်း
  const expenseMatrix: any = {};
  data
    .filter(
      (d) =>
        d.category !== "income" &&
        d.category !== "w2_income" &&
        d.category !== "estimated_tax_paid" &&
        d.category !== "owner_draw",
    )
    .forEach((d) => {
      if (!expenseMatrix[d.description]) expenseMatrix[d.description] = {};
      expenseMatrix[d.description][d.month] =
        (expenseMatrix[d.description][d.month] || 0) + d.amount;
    });

  const filteredExpenseItems = Object.keys(expenseMatrix)
    .filter((item) => item.toLowerCase().includes(expenseSearch.toLowerCase()))
    .sort();

  // ၃။ Grand Totals တွက်ချက်ခြင်း
  const getMonthlyTotal = (matrix: any, monthIdx: number): number => {
    return Object.keys(matrix).reduce(
      (sum: number, key: string) => sum + (Number(matrix[key][monthIdx]) || 0),
      0,
    );
  };

  const getYearlyTotal = (matrix: any, key: string): number => {
    const rowData = matrix[key] || {};
    return Object.values(rowData).reduce(
      (sum: number, val: any) => sum + (Number(val) || 0),
      0,
    );
  };

  const grandTotalIncome = Object.keys(incomeMatrix).reduce(
    (s, w) => s + getYearlyTotal(incomeMatrix, w),
    0,
  );
  const grandTotalExpense = Object.keys(expenseMatrix).reduce(
    (s, i) => s + getYearlyTotal(expenseMatrix, i),
    0,
  );

  // --- Export Function ---
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const incomeRows = Object.keys(incomeMatrix).map((week) => ({
      Weeks: week,
      ...monthNames.reduce(
        (acc, m, i) => ({ ...acc, [m]: incomeMatrix[week][i] || 0 }),
        {},
      ),
      "Year Total": getYearlyTotal(incomeMatrix, week),
    }));
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(incomeRows),
      "Weekly_Income",
    );

    const expenseRows = filteredExpenseItems.map((item) => ({
      Item: item,
      ...monthNames.reduce(
        (acc, m, i) => ({ ...acc, [m]: expenseMatrix[item][i] || 0 }),
        {},
      ),
      "Year Total": getYearlyTotal(expenseMatrix, item),
    }));
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(expenseRows),
      "Itemized_Expenses",
    );
    XLSX.writeFile(wb, `Sushi_Business_Matrix_${selectedYear}.xlsx`);
  };

  if (loading)
    return (
      <Layout>
        <p className="p-20 text-center font-black animate-pulse text-slate-400">
          GENERATING ANALYTICS MATRIX...
        </p>
      </Layout>
    );

  return (
    <Layout>
      <div className="pt-4 pb-40 px-4 max-w-full overflow-hidden">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 no-print">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
              <TableIcon size={24} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">
                Analytics Matrix
              </h2>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="mt-1 bg-transparent font-black text-emerald-600 outline-none cursor-pointer"
              >
                {years.reverse().map((y) => (
                  <option key={y} value={y}>
                    {y} FISCAL YEAR
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={exportToExcel}
            className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-xs flex items-center gap-2 shadow-xl hover:bg-slate-900 transition-all active:scale-95"
          >
            <FileSpreadsheet size={18} /> EXPORT TO EXCEL
          </button>
        </div>

        {/* --- 1. Weekly Income Flow --- */}
        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-xl border border-slate-50 dark:border-slate-700 overflow-hidden mb-16">
          <div className="p-6 border-b border-slate-50 dark:border-slate-700 bg-emerald-50/30 dark:bg-emerald-900/10">
            <h3 className="text-lg font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">
              Weekly Income Flow
            </h3>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead>
                <tr className="bg-slate-900 text-slate-400 font-black text-[9px] uppercase tracking-widest">
                  <th className="p-5 sticky left-0 bg-slate-900 z-10 border-r border-slate-800">
                    Weeks
                  </th>
                  {monthNames.map((m) => (
                    <th key={m} className="p-5 text-center">
                      {m}
                    </th>
                  ))}
                  <th className="p-5 bg-emerald-600 text-white text-right">
                    Year Total
                  </th>
                </tr>
              </thead>
              <tbody className="font-bold text-xs">
                {Object.keys(incomeMatrix).map((week) => (
                  <tr
                    key={week}
                    className="border-b border-slate-50 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50"
                  >
                    <td className="p-5 bg-slate-50 dark:bg-slate-900 font-black text-slate-900 dark:text-white sticky left-0 z-10 border-r border-slate-200 dark:border-slate-700">
                      {week}
                    </td>
                    {monthNames.map((_, i) => (
                      <td
                        key={i}
                        className="p-5 text-right text-slate-500 dark:text-slate-400 font-black"
                      >
                        {incomeMatrix[week][i]
                          ? `$${incomeMatrix[week][i].toLocaleString()}`
                          : "-"}
                      </td>
                    ))}
                    <td className="p-5 text-right bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 font-black border-l border-emerald-100 dark:border-emerald-900/50">
                      $
                      {getYearlyTotal(incomeMatrix, week).toLocaleString(
                        undefined,
                        { minimumFractionDigits: 2 },
                      )}
                    </td>
                  </tr>
                ))}
                {/* Monthly Total Footer */}
                <tr className="bg-emerald-600 text-white font-black">
                  <td className="p-5 sticky left-0 bg-emerald-700">
                    Monthly Totals
                  </td>
                  {monthNames.map((_, i) => (
                    <td key={i} className="p-5 text-right font-black">
                      ${getMonthlyTotal(incomeMatrix, i).toLocaleString()}
                    </td>
                  ))}
                  <td className="p-5 text-right bg-emerald-800 border-l border-emerald-500">
                    $
                    {grandTotalIncome.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* --- 2. Itemized Expense Matrix --- */}
        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-xl border border-slate-50 dark:border-slate-700 overflow-hidden mb-20">
          <div className="p-6 border-b border-slate-50 dark:border-slate-700 bg-rose-50/30 dark:bg-rose-900/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-lg font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest">
              Itemized Expenses
            </h3>
            <div className="relative w-full md:w-80">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                size={16}
              />
              <input
                type="text"
                placeholder="Search item (e.g. Tuna)..."
                value={expenseSearch}
                onChange={(e) => setExpenseSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-xs font-bold outline-none focus:border-rose-400 transition-all"
              />
            </div>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead>
                <tr className="bg-slate-900 text-slate-400 font-black text-[9px] uppercase tracking-widest">
                  <th className="p-5 sticky left-0 bg-slate-900 z-10 border-r border-slate-800 min-w-[200px]">
                    Items
                  </th>
                  {monthNames.map((m) => (
                    <th key={m} className="p-5 text-center">
                      {m}
                    </th>
                  ))}
                  <th className="p-5 bg-rose-600 text-white text-right">
                    Year Total
                  </th>
                </tr>
              </thead>
              <tbody className="font-bold text-xs">
                {filteredExpenseItems.map((item) => (
                  <tr
                    key={item}
                    className="border-b border-slate-50 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50 group"
                  >
                    <td className="p-5 bg-slate-50 dark:bg-slate-900 font-black text-slate-700 dark:text-slate-300 sticky left-0 z-10 border-r border-slate-200 dark:border-slate-700 truncate">
                      {item}
                    </td>
                    {monthNames.map((_, i) => (
                      <td
                        key={i}
                        className="p-5 text-right text-slate-400 dark:text-slate-500 font-black"
                      >
                        {expenseMatrix[item][i]
                          ? `$${expenseMatrix[item][i].toLocaleString()}`
                          : "-"}
                      </td>
                    ))}
                    <td className="p-5 text-right bg-rose-50 dark:bg-rose-900/10 text-rose-600 font-black border-l border-rose-100 dark:border-rose-900/50">
                      $
                      {getYearlyTotal(expenseMatrix, item).toLocaleString(
                        undefined,
                        { minimumFractionDigits: 2 },
                      )}
                    </td>
                  </tr>
                ))}
                {/* Grand Total Footer */}
                <tr className="bg-slate-900 text-white font-black border-t-4 border-rose-500">
                  <td className="p-5 sticky left-0 bg-slate-950">
                    Grand Totals
                  </td>
                  {monthNames.map((_, i) => (
                    <td
                      key={i}
                      className="p-5 text-right font-black text-rose-400"
                    >
                      ${getMonthlyTotal(expenseMatrix, i).toLocaleString()}
                    </td>
                  ))}
                  <td className="p-5 text-right bg-rose-600 font-black text-lg">
                    $
                    {grandTotalExpense.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
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
