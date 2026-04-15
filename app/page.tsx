// app/page.tsx
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Plus, ChevronDown, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState({ income: 0, expenses: 0, estimatedPaid: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [monthlyStats, setMonthlyStats] = useState({ inc: 0, exp: 0 });
  const [showAddMenu, setShowAddMenu] = useState(false);

  // ၁။ IRS Tax Deadline တွက်ချက်ခြင်း
  const getNextDeadline = () => {
    const now = new Date();
    const year = now.getFullYear();
    const deadlines = [
      new Date(year, 3, 15), // April 15
      new Date(year, 5, 15), // June 15
      new Date(year, 8, 15), // Sept 15
      new Date(year + (now > new Date(year, 11, 15) ? 1 : 0), 0, 15) // Jan 15 (next year if needed)
    ];
    const next = deadlines.find(d => d > now) || deadlines[0];
    const diff = Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return { date: next.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), days: diff };
  };

  const deadline = getNextDeadline();

  // စာရင်းတွက်ချက်မှုများ (Derived States)
  const netProfit = stats.income - stats.expenses;
  const taxLiability = netProfit > 0 ? netProfit * 0.153 : 0; // ၁၅.၃% SE Tax
  const remainingTax = taxLiability - stats.estimatedPaid; // ဆောင်ရန်ကျန်ငွေ

  useEffect(() => {
    setIsMounted(true);
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(
          collection(db, "transactions"),
          where("uid", "==", user.uid),
          orderBy("date", "desc")
        );

        const unsubscribeData = onSnapshot(q, (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setTransactions(data);

          let totalInc = 0; 
          let totalExp = 0;
          let totalEstPaid = 0;
          let curMonthInc = 0;
          let curMonthExp = 0;
          const monthlyDataMap: any = {};
          const now = new Date();

          data.forEach((item: any) => {
            const date = item.date?.toDate() || new Date();
            const monthLabel = date.toLocaleString('default', { month: 'short' });
            
            if (item.category === 'income') {
              totalInc += item.amount;
            } else if (item.category === 'estimated_tax_paid') {
              totalEstPaid += item.amount;
            } else {
              totalExp += item.amount;
            }

            if (!monthlyDataMap[monthLabel]) {
              monthlyDataMap[monthLabel] = { month: monthLabel, income: 0, expense: 0 };
            }
            if (item.category === 'income') monthlyDataMap[monthLabel].income += item.amount;
            else if (item.category !== 'estimated_tax_paid') monthlyDataMap[monthLabel].expense += item.amount;

            if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
              if (item.category === 'income') curMonthInc += item.amount;
              else if (item.category !== 'estimated_tax_paid') curMonthExp += item.amount;
            }
          });

          setStats({ income: totalInc, expenses: totalExp, estimatedPaid: totalEstPaid });
          setMonthlyStats({ inc: curMonthInc, exp: curMonthExp });
          setChartData(Object.values(monthlyDataMap).reverse().slice(-6)); 
          setLoading(false);
        });
        return () => unsubscribeData();
      }
    });
    return () => unsubscribeAuth();
  }, []);

  if (loading) return <Layout><p className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest">Syncing Financials...</p></Layout>;

  return (
    <Layout>
      {/* Header Section */}
      <header className="mb-10 pt-4 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Business Insights</h2>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1 italic">Real-time Performance</p>
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-xs shadow-xl flex items-center gap-3 hover:bg-emerald-700 transition-all active:scale-95"
          >
            ADD TRANSACTION <Plus size={18} />
          </button>
          
          {showAddMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowAddMenu(false)}></div>
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-3xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <Link href="/add" className="flex items-center gap-3 p-5 hover:bg-slate-50 font-black text-slate-700 border-b border-slate-50 transition">
                  <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center"><Plus size={16}/></div>
                  Add Income / Expense
                </Link>
                <Link href="/invoices/add" className="flex items-center gap-3 p-5 hover:bg-slate-50 font-black text-slate-700 border-b border-slate-50 transition">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center"><Plus size={16}/></div>
                  Create Invoice
                </Link>
              </div>
            </>
          )}
        </div>
      </header>

      {/* --- NEW: Tax Deadline Countdown Banner --- */}
      <div className="mb-10 bg-slate-900 p-6 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between shadow-2xl border border-slate-800">
          <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-rose-500 rounded-2xl flex items-center justify-center text-white animate-pulse shadow-lg shadow-rose-500/20">
                  <Calendar size={24} />
              </div>
              <div className="text-center md:text-left">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Next IRS Estimated Tax Deadline: {deadline.date}</p>
                  <h4 className="text-xl font-black text-white">{deadline.days} Days Remaining</h4>
              </div>
          </div>
          <Link href="/report" className="mt-4 md:mt-0 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-black text-[10px] transition uppercase tracking-widest">View Tax Report</Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border-b-8 border-emerald-500 relative">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Revenue</p>
          <p className="text-4xl font-black text-emerald-600 mt-2">${stats.income.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
          <div className="mt-4 pt-4 border-t border-slate-50">
             <p className="text-[11px] font-bold text-slate-400 italic">This month: <span className="text-emerald-500 font-black">+${monthlyStats.inc.toLocaleString()}</span></p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border-b-8 border-rose-500">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Expenses</p>
          <p className="text-4xl font-black text-rose-500 mt-2">${stats.expenses.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
          <div className="mt-4 pt-4 border-t border-slate-50">
             <p className="text-[11px] font-bold text-slate-400 italic">This month: <span className="text-rose-500 font-black">-${monthlyStats.exp.toLocaleString()}</span></p>
          </div>
        </div>

        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Net Taxable Profit</p>
          <p className="text-4xl font-black text-white mt-2">${netProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
          <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between">
             <p className="text-[11px] font-bold text-slate-500 italic">Net Margin: <span className="text-emerald-400 font-black">${(monthlyStats.inc - monthlyStats.exp).toLocaleString()}</span></p>
          </div>
        </div>
      </div>

      {/* <div className="mb-10 bg-slate-900 p-6 rounded-[2rem] flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-500 rounded-2xl flex items-center justify-center text-white animate-pulse">
                <Calendar size={24} />
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Next IRS Deadline: {deadline.date}</p>
                <h4 className="text-xl font-black text-white">{deadline.days} Days Remaining</h4>
            </div>
        </div>
        <Link href="/report" className="bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-xl font-black text-[10px] transition uppercase">View Report</Link>
    </div> */}

      {/* --- Advanced Tax Estimator Card --- */}
      <div className="mt-10 bg-amber-500 p-10 rounded-[3.5rem] shadow-2xl text-white relative overflow-hidden mb-12">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-amber-100 font-black uppercase text-[11px] tracking-widest mb-4 flex items-center gap-2">
                <AlertCircle size={16}/> ESTIMATED US SELF-EMPLOYMENT TAX (15.3%)
            </p>
            <h3 className="text-6xl font-black tracking-tighter">${taxLiability.toLocaleString(undefined, {minimumFractionDigits: 2})}</h3>
            <p className="text-amber-100 text-[10px] font-bold mt-4 italic opacity-80">*Based on your business net profit for the current fiscal year.</p>
          </div>
          
          <div className="bg-white/20 p-8 rounded-[2.5rem] backdrop-blur-md border border-white/30 shadow-inner">
             <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80 text-white">Pre-paid Taxes:</p>
                <p className="text-lg font-black text-white">-${stats.estimatedPaid.toLocaleString()}</p>
             </div>
             <div className="flex justify-between items-end">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Final Balance Due:</p>
                    <p className="text-3xl font-black text-white">
                        {remainingTax > 0 ? `$${remainingTax.toLocaleString(undefined, {minimumFractionDigits: 2})}` : "$0.00"}
                    </p>
                </div>
                {remainingTax <= 0 && <CheckCircle2 size={32} className="text-emerald-300" />}
             </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-2xl border-2 border-slate-50 mb-14 overflow-hidden">
        <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest mb-10 text-center italic tracking-[0.3em]">Monthly Performance Flow</h3>
        <div className="h-[350px] w-full min-h-[350px]"> 
          {isMounted && chartData.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#475569', fontWeight: 'bold', fontSize: 11}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 11}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', fontWeight: 'bold'}} />
                <Bar dataKey="income" fill="#10b981" radius={[10, 10, 0, 0]} barSize={40} />
                <Bar dataKey="expense" fill="#f43f5e" radius={[10, 10, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Ledger Activity */}
      <div className="bg-white rounded-[3rem] shadow-xl border-2 border-slate-50 overflow-hidden mb-16">
        <div className="p-8 border-b-2 border-slate-50 bg-slate-50/30 flex justify-between items-center">
            <h3 className="font-black text-slate-900 uppercase text-[11px] tracking-widest italic underline decoration-emerald-500 decoration-4 underline-offset-4">Recent Ledger History</h3>
            <Link href="/transactions" className="text-[10px] font-black text-emerald-600 hover:underline tracking-widest">VIEW ALL</Link>
        </div>
        <div className="divide-y-2 divide-slate-50">
          {transactions.length === 0 ? (
            <p className="p-16 text-center text-slate-300 font-bold italic">No financial activity recorded yet.</p>
          ) : (
            transactions.slice(0, 10).map(item => (
              <div key={item.id} className="py-3 px-8 flex justify-between items-center hover:bg-slate-50 transition border-l-4 border-transparent hover:border-emerald-500">
                <div className="flex items-center gap-3">
                  {/* Verify Check Icon (ရှိရင် ထည့်ပါ) */}
                  {item.verified && (
                    <span title="Verified with Bank">
                      <CheckCircle2 size={16} className="text-emerald-500" />
                    </span>
                  )}
                  
                  <div>
                    <p className="font-black text-slate-900 text-lg tracking-tight leading-tight">{item.description}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    {item.category === 'estimated_tax_paid' ? 'Quarterly Tax Payment' : item.category.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {item.verified && (
                    <span title="Verified with Bank"> {/* title ကို ဒီ span ထဲမှာ ထည့်ပါ */}
                      <CheckCircle2 size={16} className="text-emerald-500" />
                    </span>
                  )}
                  <p className={`text-xl md:text-2xl font-black tracking-tighter ${item.category === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {item.category === 'income' ? '+' : '-'}${Number(item.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}