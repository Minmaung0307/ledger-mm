"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Plus, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function AdvancedDashboard() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState({ inc: 0, exp: 0, estPaid: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const netProfit = stats.inc - stats.exp;
  const taxLiability = netProfit > 0 ? netProfit * 0.153 : 0;
  const remainingTax = taxLiability - stats.estPaid;

  const getNextDeadline = () => {
    const now = new Date(); const year = now.getFullYear();
    const ds = [new Date(year,3,15), new Date(year,5,15), new Date(year,8,15), new Date(year + (now > new Date(year,11,15)?1:0),0,15)];
    const next = ds.find(d => d > now) || ds[0];
    const diff = Math.ceil((next.getTime() - now.getTime()) / (1000*60*60*24));
    return { date: next.toLocaleDateString('en-US',{month:'short',day:'numeric'}), days: diff };
  };
  const deadline = getNextDeadline();

  useEffect(() => {
    setIsMounted(true);
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(collection(db, "transactions"), where("uid", "==", user.uid), orderBy("date", "desc"));
        const unsubscribeData = onSnapshot(q, (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setTransactions(data);
          let ti=0, te=0, tp=0; const map:any={}; const now = new Date();
          data.forEach((item: any) => {
            const date = item.date?.toDate() || new Date();
            const label = date.toLocaleString('default', { month: 'short' });
            if (item.category === 'income') ti += item.amount;
            else if (item.category === 'estimated_tax_paid') tp += item.amount;
            else te += item.amount;
            if (!map[label]) map[label] = { month: label, income: 0, expense: 0 };
            if (item.category === 'income') map[label].income += item.amount;
            else if (item.category !== 'estimated_tax_paid') map[label].expense += item.amount;
          });
          setStats({ inc: ti, exp: te, estPaid: tp });
          setChartData(Object.values(map).reverse().slice(-6));
          setLoading(false);
        });
        return () => unsubscribeData();
      }
    });
    return () => unsubscribeAuth();
  }, []);

  if (loading) return <Layout><p className="p-20 text-center font-black animate-pulse">Syncing Insights...</p></Layout>;

  return (
    <Layout>
      <header className="mb-10 pt-4 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div><h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Dashboard</h2><p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">YTD Analytics</p></div>
        <div className="relative">
          <button onClick={() => setShowAddMenu(!showAddMenu)} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-xs shadow-xl flex items-center gap-3 active:scale-95 transition-all">ADD TRANSACTION <Plus size={18} /></button>
          {showAddMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-3xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <Link href="/add" className="flex items-center gap-3 p-5 hover:bg-slate-50 font-black text-slate-700 border-b">Add Income / Expense</Link>
              <Link href="/invoices/add" className="flex items-center gap-3 p-5 hover:bg-slate-50 font-black text-slate-700">Create Invoice</Link>
            </div>
          )}
        </div>
      </header>

      {/* IRS Deadline Banner */}
      <div className="mb-10 bg-slate-900 p-6 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between shadow-2xl border border-slate-800">
          <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-rose-500 rounded-2xl flex items-center justify-center text-white animate-pulse"><Calendar size={24} /></div>
              <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Next IRS Estimated Tax Deadline: {deadline.date}</p><h4 className="text-xl font-black text-white">{deadline.days} Days Remaining</h4></div>
          </div>
          <Link href="/report" className="mt-4 md:mt-0 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-black text-[10px] transition uppercase">View Report</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border-b-8 border-emerald-500"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gross Revenue</p><p className="text-4xl font-black text-emerald-600 mt-2">${stats.inc.toLocaleString(undefined,{minimumFractionDigits:2})}</p></div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border-b-8 border-rose-500"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Expenses</p><p className="text-4xl font-black text-rose-500 mt-2">${stats.exp.toLocaleString(undefined,{minimumFractionDigits:2})}</p></div>
        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden"><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Net Taxable Profit</p><p className="text-4xl font-black text-white mt-2">${netProfit.toLocaleString(undefined,{minimumFractionDigits:2})}</p></div>
      </div>

      {/* Tax Estimator */}
      <div className="mt-10 bg-amber-500 p-10 rounded-[3.5rem] shadow-2xl text-white relative overflow-hidden mb-12">
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div><p className="text-amber-100 font-black uppercase text-[11px] tracking-widest mb-4">ESTIMATED SE TAX (15.3%)</p><h3 className="text-6xl font-black">${taxLiability.toLocaleString(undefined,{minimumFractionDigits:2})}</h3></div>
          <div className="bg-white/20 p-8 rounded-[2.5rem] backdrop-blur-md border border-white/30">
             <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/10"><p className="text-[10px] font-black uppercase tracking-widest opacity-80">Pre-paid Taxes:</p><p className="text-lg font-black">-${stats.estPaid.toLocaleString()}</p></div>
             <div className="flex justify-between items-end"><div><p className="text-[10px] font-black uppercase tracking-widest text-white/60">Final Balance Due:</p><p className="text-3xl font-black">{remainingTax > 0 ? `$${remainingTax.toLocaleString(undefined,{minimumFractionDigits:2})}` : "$0.00"}</p></div>{remainingTax <= 0 && <CheckCircle2 size={32} className="text-emerald-300" />}</div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-2xl border-2 border-slate-50 mb-14 overflow-hidden">
        <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest mb-10 text-center italic">Monthly Cash Flow Analysis</h3>
        <div className="h-[350px] w-full min-h-[350px]"> 
          {isMounted && chartData.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill:'#cbd5e1',fontWeight:'bold',fontSize:11}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill:'#cbd5e1',fontSize:11}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius:'24px',border:'none',boxShadow:'0 25px 50px -12px rgb(0 0 0/0.15)',fontWeight:'bold'}} />
                <Bar dataKey="income" fill="#10b981" radius={[10, 10, 0, 0]} barSize={40} />
                <Bar dataKey="expense" fill="#f43f5e" radius={[10, 10, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </Layout>
  );
}