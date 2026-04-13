// app/page.tsx
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function Dashboard() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState({ income: 0, expenses: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [monthlyStats, setMonthlyStats] = useState({ inc: 0, exp: 0 });

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
            
            // ၁။ Global Totals တွက်မယ်
            if (item.category === 'income') {
              totalInc += item.amount;
            } else {
              totalExp += item.amount;
            }

            // ၂။ Monthly Chart အတွက် စုစည်းမယ်
            if (!monthlyDataMap[monthLabel]) {
              monthlyDataMap[monthLabel] = { month: monthLabel, income: 0, expense: 0 };
            }
            if (item.category === 'income') monthlyDataMap[monthLabel].income += item.amount;
            else monthlyDataMap[monthLabel].expense += item.amount;

            // ၃။ "ယခုလ" (Current Month) အတွက် သီးသန့်တွက်မယ်
            if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
              if (item.category === 'income') currentMonthInc += item.amount;
              else currentMonthExp += item.amount;
            }
          });

          setStats({ income: totalInc, expenses: totalExp });
          setMonthlyStats({ inc: currentMonthInc, exp: currentMonthExp });
          setChartData(Object.values(monthlyDataMap).reverse().slice(-6)); // နောက်ဆုံး ၆ လစာပြမယ်
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
      <header className="mb-8 pt-4">
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">Financial Trends</h2>
        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Real-time Performance</p>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Income Card */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border-b-8 border-emerald-500 relative overflow-hidden group">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Revenue</p>
          <p className="text-4xl font-black text-emerald-600 mt-2">${stats.income.toLocaleString()}</p>
          <div className="mt-4 pt-4 border-t border-slate-50">
             <p className="text-[11px] font-bold text-slate-400 italic">
                This month: <span className="text-emerald-500 font-black">+${monthlyStats.inc.toLocaleString()}</span>
             </p>
          </div>
        </div>

        {/* Expense Card */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border-b-8 border-rose-500">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Expenses</p>
          <p className="text-4xl font-black text-rose-500 mt-2">${stats.expenses.toLocaleString()}</p>
          <div className="mt-4 pt-4 border-t border-slate-50">
             <p className="text-[11px] font-bold text-slate-400 italic">
                This month: <span className="text-rose-500 font-black">-${monthlyStats.exp.toLocaleString()}</span>
             </p>
          </div>
        </div>

        {/* Net Profit Card */}
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

      {/* Chart Section */}
      <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-2xl border-2 border-slate-50 mb-12 overflow-hidden">
        <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest mb-10 text-center">Income vs Expenses Analysis</h3>
        <div className="h-[300px] w-full min-h-[300px]"> 
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
                <Bar dataKey="income" fill="#10b981" radius={[8, 8, 0, 0]} barSize={35} />
                <Bar dataKey="expense" fill="#f43f5e" radius={[8, 8, 0, 0]} barSize={35} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-[2.5rem] shadow-xl border-2 border-slate-50 overflow-hidden mb-10">
        <div className="p-6 border-b-2 border-slate-50 bg-slate-50/30 flex justify-between items-center">
            <h3 className="font-black text-slate-900 uppercase text-[11px] tracking-widest">Recent Activity</h3>
        </div>
        <div className="divide-y-2 divide-slate-50">
          {transactions.length === 0 ? (
            <p className="p-10 text-center text-slate-400 font-bold italic">No records yet.</p>
          ) : (
            transactions.slice(0, 5).map(item => (
              <div key={item.id} className="p-6 flex justify-between items-center hover:bg-slate-50 transition">
                <div>
                  <p className="font-black text-slate-900 text-lg">{item.description}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.category}</p>
                </div>
                <p className={`text-2xl font-black ${item.category === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {item.category === 'income' ? '+' : '-'}${item.amount.toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}