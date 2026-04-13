// app/page.tsx
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Plus, ChevronDown } from 'lucide-react'; // Plus icon ကို ဒီမှာသွင်းထားပါတယ်
import Link from 'next/link'; // Link ကို ဒီမှာသွင်းထားပါတယ်

export default function Dashboard() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState({ income: 0, expenses: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [monthlyStats, setMonthlyStats] = useState({ inc: 0, exp: 0 });

  const netProfit = stats.income - stats.expenses;
  const estimatedTax = netProfit > 0 ? netProfit * 0.153 : 0; 

  const [showAddMenu, setShowAddMenu] = useState(false); // အပေါ်နားက state ထဲမှာ ထည့်ပါ

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
          let currentMonthInc = 0;
          let currentMonthExp = 0;
          const monthlyDataMap: any = {};
          
          const now = new Date();

          data.forEach((item: any) => {
            const date = item.date?.toDate() || new Date();
            const monthLabel = date.toLocaleString('default', { month: 'short' });
            
            if (item.category === 'income') {
              totalInc += item.amount;
            } else {
              totalExp += item.amount;
            }

            if (!monthlyDataMap[monthLabel]) {
              monthlyDataMap[monthLabel] = { month: monthLabel, income: 0, expense: 0 };
            }
            if (item.category === 'income') monthlyDataMap[monthLabel].income += item.amount;
            else monthlyDataMap[monthLabel].expense += item.amount;

            if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
              if (item.category === 'income') currentMonthInc += item.amount;
              else currentMonthExp += item.amount;
            }
          });

          setStats({ income: totalInc, expenses: totalExp });
          setMonthlyStats({ inc: currentMonthInc, exp: currentMonthExp });
          setChartData(Object.values(monthlyDataMap).reverse().slice(-6)); 
          setLoading(false);
        });
        return () => unsubscribeData();
      }
    });
    return () => unsubscribeAuth();
  }, []);

  if (loading) return <Layout><p className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest">Syncing Data...</p></Layout>;

  return (
    <Layout>
      {/* Header Section with Integrated Add Button */}
      <header className="mb-10 pt-4 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Financial Trends</h2>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1 italic">Real-time Performance</p>
        </div>
        
        {/* Quick Action Dropdown */}
        <div className="relative group">
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
                <Link href="/add" className="flex items-center gap-3 p-5 hover:bg-slate-50 font-black text-slate-700 border-b border-slate-50">
                  <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center"><Plus size={16}/></div>
                  Add Income / Expense
                </Link>
                <Link href="/invoices/add" className="flex items-center gap-3 p-5 hover:bg-slate-50 font-black text-slate-700 border-b border-slate-50">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center"><Plus size={16}/></div>
                  Create New Invoice
                </Link>
                <Link href="/add" className="flex items-center gap-3 p-5 hover:bg-slate-50 font-black text-emerald-600 transition italic">
                      <div className="w-8 h-8 bg-emerald-600 text-white rounded-lg flex items-center justify-center"><Plus size={16}/></div>
                      Scan Receipt (AI)
                    </Link>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border-b-8 border-emerald-500 relative overflow-hidden group">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Revenue</p>
          <p className="text-4xl font-black text-emerald-600 mt-2">${stats.income.toLocaleString()}</p>
          <div className="mt-4 pt-4 border-t border-slate-50">
             <p className="text-[11px] font-bold text-slate-400 italic">
                This month: <span className="text-emerald-500 font-black">+${monthlyStats.inc.toLocaleString()}</span>
             </p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border-b-8 border-rose-500">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Expenses</p>
          <p className="text-4xl font-black text-rose-500 mt-2">${stats.expenses.toLocaleString()}</p>
          <div className="mt-4 pt-4 border-t border-slate-50">
             <p className="text-[11px] font-bold text-slate-400 italic">
                This month: <span className="text-rose-500 font-black">-${monthlyStats.exp.toLocaleString()}</span>
             </p>
          </div>
        </div>

        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl text-white">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Taxable Profit</p>
          <p className="text-4xl font-black text-white mt-2">${(stats.income - stats.expenses).toLocaleString()}</p>
          <div className="mt-4 pt-4 border-t border-slate-800">
             <p className="text-[11px] font-bold text-slate-500 italic">
                Net Margin: <span className="text-emerald-400 font-black">${(monthlyStats.inc - monthlyStats.exp).toLocaleString()}</span>
             </p>
          </div>
        </div>
      </div>

      {/* Tax Estimator Card */}
      <div className="mt-10 bg-amber-500 p-10 rounded-[3rem] shadow-2xl text-white relative overflow-hidden mb-12">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
          <div>
            <p className="text-amber-100 font-black uppercase text-[10px] tracking-widest mb-3 opacity-80 underline decoration-2 underline-offset-4">Estimated US Self-Employment Tax (15.3%)</p>
            <h3 className="text-6xl font-black tracking-tighter">${estimatedTax.toLocaleString(undefined, {minimumFractionDigits: 2})}</h3>
            <p className="text-amber-100 text-[10px] font-bold mt-4 italic opacity-70">*Based on current YTD Net Profit. Consult an accountant for final filing.</p>
          </div>
          <div className="bg-white/20 px-8 py-6 rounded-[2rem] backdrop-blur-md border border-white/30 text-center shadow-inner">
              <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">Tax Deadline</p>
              <p className="text-2xl font-black">APRIL 15</p>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-2xl border-2 border-slate-50 mb-14 overflow-hidden">
        <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest mb-10 text-center">Cash Flow Analysis (Last 6 Months)</h3>
        <div className="h-[350px] w-full min-h-[350px]"> 
          {isMounted && chartData.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#cbd5e1', fontWeight: 'bold', fontSize: 11}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#cbd5e1', fontSize: 11}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', fontWeight: 'bold', padding: '15px'}} 
                />
                <Bar dataKey="income" fill="#10b981" radius={[10, 10, 0, 0]} barSize={40} />
                <Bar dataKey="expense" fill="#f43f5e" radius={[10, 10, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-[3rem] shadow-xl border-2 border-slate-50 overflow-hidden mb-16">
        <div className="p-8 border-b-2 border-slate-50 bg-slate-50/30 flex justify-between items-center">
            <h3 className="font-black text-slate-900 uppercase text-[11px] tracking-widest italic">Recent Ledger Activity</h3>
            <Link href="/transactions" className="text-[10px] font-black text-emerald-600 hover:underline">VIEW ALL</Link>
        </div>
        <div className="divide-y-2 divide-slate-50">
          {transactions.length === 0 ? (
            <p className="p-16 text-center text-slate-300 font-bold italic">Waiting for your first record...</p>
          ) : (
            transactions.slice(0, 5).map(item => (
              <div key={item.id} className="p-8 flex justify-between items-center hover:bg-slate-50 transition border-l-4 border-transparent hover:border-emerald-500">
                <div>
                  <p className="font-black text-slate-900 text-xl tracking-tight">{item.description}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{item.category.replace('_', ' ')}</p>
                </div>
                <p className={`text-2xl md:text-3xl font-black tracking-tighter ${item.category === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {item.category === 'income' ? '+' : '-'}${Number(item.amount).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}