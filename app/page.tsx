// app/page.tsx ကို ဒီ Code တွေနဲ့ အဆင့်မြှင့်လိုက်ပါ
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function Dashboard() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState({ income: 0, expenses: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

          let inc = 0; let exp = 0;
          const monthlyData: any = {};

          data.forEach((item: any) => {
            const date = item.date?.toDate() || new Date();
            const month = date.toLocaleString('default', { month: 'short' });
            
            if (!monthlyData[month]) monthlyData[month] = { month, income: 0, expense: 0 };
            
            if (item.category === 'income') {
              inc += item.amount;
              monthlyData[month].income += item.amount;
            } else {
              exp += item.amount;
              monthlyData[month].expense += item.amount;
            }
          });

          setStats({ income: inc, expenses: exp });
          setChartData(Object.values(monthlyData).reverse());
          setLoading(false);
        });
        return () => unsubscribeData();
      }
    });
    return () => unsubscribeAuth();
  }, []);

  if (loading) return <Layout><p className="p-20 text-center font-black animate-pulse">LOADING ANALYTICS...</p></Layout>;

  return (
    <Layout>
      <h2 className="text-4xl font-black text-slate-900 mb-8 pt-4 tracking-tight">Financial Trends</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-emerald-500 p-8 rounded-[2.5rem] shadow-xl text-white">
          <p className="text-[10px] font-black uppercase opacity-80 tracking-widest">Gross Revenue</p>
          <p className="text-4xl font-black mt-1">${stats.income.toLocaleString()}</p>
        </div>
        <div className="bg-rose-500 p-8 rounded-[2.5rem] shadow-xl text-white">
          <p className="text-[10px] font-black uppercase opacity-80 tracking-widest">Operating Costs</p>
          <p className="text-4xl font-black mt-1">${stats.expenses.toLocaleString()}</p>
        </div>
        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl text-white">
          <p className="text-[10px] font-black uppercase opacity-80 tracking-widest">Taxable Profit</p>
          <p className="text-4xl font-black mt-1">${(stats.income - stats.expenses).toLocaleString()}</p>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white p-8 rounded-[3rem] shadow-2xl border-2 border-slate-50 mb-10 overflow-hidden">
        <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest mb-8 text-center">Income vs Expenses (Monthly)</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 'bold', fontSize: 12}} />
              <Tooltip 
                contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold'}} 
              />
              <Bar dataKey="income" fill="#10b981" radius={[10, 10, 0, 0]} barSize={30} />
              <Bar dataKey="expense" fill="#f43f5e" radius={[10, 10, 0, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-[2.5rem] shadow-xl border-2 border-slate-50 overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
            <h3 className="font-black text-slate-900 uppercase text-[10px] tracking-widest">Recent Activity</h3>
        </div>
        <div className="divide-y-2 divide-slate-50">
          {transactions.slice(0, 5).map(item => (
            <div key={item.id} className="p-6 flex justify-between items-center hover:bg-slate-50 transition">
              <div>
                <p className="font-black text-slate-800">{item.description}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{item.category}</p>
              </div>
              <p className={`text-xl font-black ${item.category === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                {item.category === 'income' ? '+' : '-'}${item.amount.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}