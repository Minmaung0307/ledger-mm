// app/page.tsx
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, where, doc, getDoc } from 'firebase/firestore';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { Plus, ChevronDown, CheckCircle2, AlertCircle, Calendar, Sparkles, AlertTriangle, Landmark, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { TAX_CATEGORIES } from '@/lib/constants';

export default function Dashboard() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [dismissedMessages, setDismissedMessages] = useState<string[]>([]);
  const [stats, setStats] = useState({ income: 0, businessIncome: 0, w2Income: 0, expenses: 0, estimatedPaid: 0, w2Withheld: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]); // New state for Pie Chart
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [monthlyStats, setMonthlyStats] = useState({ inc: 0, exp: 0 });
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false); // New state for Accountant View
  const [smartAlerts, setSmartAlerts] = useState<any[]>([]); // Assistant Alerts အတွက်

  // Pie Chart Colors
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#64748b', '#0bf5bb', '#fbbf24', '#6366f1', '#f43f5e', '#14b8a6', '#94a3b8', '#218cf7', '#a855f7', '#60420e', '#def50b', '#cce94b', '#0ea5e9', '#d20bf5', '#bf7b05', '#f5700b', '#475569'];

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

  // --- အခွန်တွက်ချက်မှု Logic များ (ဒီနေရာမှာ ထားပါ) ---
  // ၁။ လုပ်ငန်းအမြတ် (1099 Profit - W2 လစာကို မပါစေရပါ)
    const businessProfit = stats.businessIncome - stats.expenses;

    // ၂။ ဆောင်ရမည့် စုစုပေါင်းအခွန် ခန့်မှန်းခြေ (15.3% SE Tax)
    // လုပ်ငန်းအမြတ်ပေါ်မှာပဲ တွက်ပါမယ် (W2 လစာကို အခွန်ထပ်မတွက်တော့ပါ)
    const taxLiability = businessProfit > 0 ? businessProfit * 0.153 : 0;

    // ၃။ ပေးပြီးသား စုစုပေါင်း (NY W2 မှာ ပေးခဲ့တာ + NC 1099 အတွက် ကြိုပေးထားတာ)
    const totalAlreadyPaid = stats.estimatedPaid + stats.w2Withheld;

    // ၄။ အစိုးရကို အမှန်တကယ် ထပ်ပေးဖို့ ကျန်တော့မည့် ပမာဏ
    const remainingTax = taxLiability - totalAlreadyPaid;

  useEffect(() => {
    const key = `dismissed_alerts_${new Date().getMonth()}_${new Date().getFullYear()}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      setDismissedMessages(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    setIsMounted(true); // Component Mounted ဖြစ်ပြီဆိုတာ မှတ်မယ်

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // --- Accountant View Logic ---
        // Profile ထဲမှာ ဒီ User ရဲ့ Email က Accountant Email အဖြစ် သတ်မှတ်ခံထားရလား စစ်မယ်
        const profileRef = doc(db, "profiles", user.uid);
        const profileSnap = await getDoc(profileRef);
        
        // မှတ်ချက်- အကယ်၍ Accountant က ဝင်ကြည့်တာဆိုရင် တခြားသူရဲ့ UID ကို သုံးရမှာဖြစ်ပေမယ့် 
        // လောလောဆယ် ကိုယ့်အကောင့်ကိုပဲ ReadOnly စမ်းကြည့်လို့ရအောင် logic ထားပေးထားပါတယ်
        if (profileSnap.exists()) {
          const profileData = profileSnap.data();
          if (profileData.accountantEmail === user.email) {
            setIsReadOnly(true);
          }
        }

        const q = query(
          collection(db, "transactions"),
          where("uid", "==", user.uid),
          orderBy("date", "desc")
        );

        const unsubscribeData = onSnapshot(q, (snapshot) => {
          if (!snapshot) return;

          const data = snapshot.docs.map(doc => {
            const item = doc.data();
            return {
              id: doc.id,
              ...item,
              displayDate: item.transactionDate?.toDate?.() || item.date?.toDate?.() || new Date()
            };
          });

          setTransactions(data);

          let totalInc = 0; 
          let busInc = 0;       // 1099 လုပ်ငန်းဝင်ငွေအတွက်
          let w2Inc = 0;        // W2 လစာဝင်ငွေအတွက်
          let totalExp = 0; 
          let totalEstPaid = 0;
          let totalW2Withheld = 0;

          let curMonthInc = 0; 
          let curMonthExp = 0;
          const monthlyDataMap: any = {};
          const expenseGroupMap: any = {};
          const now = new Date();
          const currentMonth = now.getMonth();
          const currentYear = now.getFullYear();

          const dupeCheck: any = {};
          const foundDuplicates: any[] = [];
          const pastMerchants: string[] = [];
          const currentMonthMerchants: string[] = [];

          data.forEach((item: any) => {
              const date = item.displayDate;
              const monthLabel = date.toLocaleString('default', { month: 'short' });

              // ၁။ [Smart Fix]: Recurring နာမည်များကို သန့်စင်ခြင်း
              const cleanName = item.description.split(' (')[0].trim();

              // ၂။ [Tax Logic]: ဝင်ငွေနှင့် အသုံးစရိတ်များကို အမျိုးအစားခွဲခြားခြင်း
              if (item.category === 'income') {
                  totalInc += item.amount;
                  busInc += item.amount; // 1099
              } else if (item.category === 'w2_income') {
                  totalInc += item.amount;
                  w2Inc += item.amount; // W2
              } else if (item.category === 'estimated_tax_paid') {
                  totalEstPaid += item.amount;
              } else if (item.category === 'w2_withheld') {
                  totalW2Withheld += item.amount;
              } else {
                  totalExp += item.amount;
                  // Pie Chart အတွက် အသုံးစရိတ်များကို အုပ်စုဖွဲ့ခြင်း
                  const catLabel = TAX_CATEGORIES.find(c => c.value === item.category)?.label || 'Other';
                  expenseGroupMap[catLabel] = (expenseGroupMap[catLabel] || 0) + item.amount;
              }

              // ၃။ [Charts Logic]: ဝင်ငွေ၊ ထွက်ငွေ ဂရပ်အတွက် တွက်ခြင်း
              if (!monthlyDataMap[monthLabel]) monthlyDataMap[monthLabel] = { month: monthLabel, income: 0, expense: 0 };
              
              if (item.category === 'income' || item.category === 'w2_income') {
                  monthlyDataMap[monthLabel].income += item.amount;
              } else if (item.category !== 'estimated_tax_paid' && item.category !== 'w2_withheld') {
                  // အခွန်ပေးတာတွေကို အသုံးစရိတ်ဂရပ်ထဲမှာ မထည့်ပါ (ဒါမှ Operating စရိတ်အစစ်ကို သိမှာပါ)
                  monthlyDataMap[monthLabel].expense += item.amount;
              }

              // ၄။ [Monthly Stats & Assistant]: ယခုလအတွက် တွက်ချက်ခြင်း
              if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
                  if (item.category === 'income' || item.category === 'w2_income') curMonthInc += item.amount;
                  else if (item.category !== 'estimated_tax_paid' && item.category !== 'w2_withheld') curMonthExp += item.amount;
                  
                  currentMonthMerchants.push(cleanName);
              } else {
                  pastMerchants.push(cleanName);
              }

              // ၅။ [Duplicate Check]: စာရင်းထပ်ခြင်း ရှိမရှိ စစ်ဆေးခြင်း
              const dupeKey = `${item.description}-${item.amount}-${date.toLocaleDateString()}`;
              dupeCheck[dupeKey] = (dupeCheck[dupeKey] || 0) + 1;
              if (dupeCheck[dupeKey] >= 2) {
                  foundDuplicates.push({ name: item.description, amount: item.amount, count: dupeCheck[dupeKey] });
              }
          });

          const alerts: any[] = [];
          const uniquePast = Array.from(new Set(pastMerchants));
          
          uniquePast.forEach(name => {
              const frequency = pastMerchants.filter(n => n === name).length;
              // ဒီလထဲမှာ မူရင်းနာမည်နဲ့ တူတာရှိရင် "မသွင်းရသေးဘူး" လို့ မပြောတော့ပါဘူး
              if (frequency >= 2 && !currentMonthMerchants.includes(name)) {
                  alerts.push({ type: 'missing', msg: `${name} ကို ဒီလအတွက် စာရင်းသွင်းရန်။`, color: 'blue' });
              }
          });

          const uniqueDupes = Array.from(new Set(foundDuplicates.map(d => d.name)));
          uniqueDupes.slice(0, 2).forEach(name => {
              const dInfo = foundDuplicates.find(d => d.name === name);
              alerts.push({ type: 'duplicate', msg: `${name} ($${dInfo.amount}) က ${dInfo.count} ကြိမ် ထပ်နေတာ တွေ့ရပါတယ်ဗျာ။`, color: 'amber' });
          });

          // --- [Smart Fix]: Dismiss လုပ်ထားတာတွေကို ဖယ်ထုတ်ပြီးမှ State ထဲ ထည့်မယ် ---
          const visibleAlerts = alerts.filter(a => !dismissedMessages.includes(a.msg));
          setSmartAlerts(visibleAlerts.slice(0, 3)); 

          setStats({ 
            income: totalInc, 
            businessIncome: busInc, 
            w2Income: w2Inc,
            expenses: totalExp, 
            estimatedPaid: totalEstPaid, 
            w2Withheld: totalW2Withheld 
          });
          setMonthlyStats({ inc: curMonthInc, exp: curMonthExp });
          setChartData(Object.values(monthlyDataMap).reverse().slice(-6)); 
          setPieData(Object.keys(expenseGroupMap).map(name => ({ name, value: expenseGroupMap[name] })));
          setLoading(false);
        }, (error) => {
          console.error("Firestore error:", error);
          setLoading(false);
        });

        return () => unsubscribeData();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [dismissedMessages]); // dismissedMessages ပြောင်းရင် data ကို ပြန်စစ်ခိုင်းဖို့ပါ

  const handleDismiss = (msg: string) => {
    const updated = [...dismissedMessages, msg];
    setDismissedMessages(updated);
    const key = `dismissed_alerts_${new Date().getMonth()}_${new Date().getFullYear()}`;
    localStorage.setItem(key, JSON.stringify(updated));
  };

  if (loading) return <Layout><p className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest">Syncing Financials...</p></Layout>;

  return (
    <Layout>
      {/* Accountant View Alert */}
      {isReadOnly && (
        <div className="mb-6 bg-amber-500 text-white p-3 rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-[0.2em] shadow-lg animate-in slide-in-from-top-4">
          <ShieldCheck size={18} /> Accountant Read-Only Mode Active
        </div>
      )}

      {/* Header Section */}
      <header className="mb-10 pt-4 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Business Insights</h2>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1 italic">Real-time Performance</p>
        </div>
        
        {/* Hide Add Transaction if ReadOnly */}
        {!isReadOnly && (
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
        )}
      </header>

      {/* --- Smart Financial Assistant Section --- */}
      {smartAlerts.filter(a => !dismissedMessages.includes(a.msg)).length > 0 && (
  <div className="mb-10 space-y-3 no-print">
    <div className="flex items-center gap-2 px-4 mb-2">
        <Sparkles size={16} className="text-amber-500 animate-pulse" />
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Financial Assistant Insights</p>
    </div>
    
    {/* ဤနေရာတွင် filter ကို တိုက်ရိုက် သုံးထားပါတယ် */}
    {smartAlerts
        .filter(a => !dismissedMessages.includes(a.msg))
        .slice(0, 3)
        .map((alert, i) => (
        <div key={i} className={`p-5 rounded-[2rem] border-2 flex flex-col md:flex-row items-center justify-between shadow-sm transition-all hover:scale-[1.01] gap-4 ${alert.color === 'blue' ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30 text-amber-700 dark:text-amber-400'}`}>
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm ${alert.color === 'blue' ? 'bg-blue-500 text-white' : 'bg-amber-500 text-white'}`}>
              {alert.type === 'missing' ? <Calendar size={20} /> : <AlertTriangle size={20} />}
            </div>
            <p className="text-sm font-bold tracking-tight leading-tight">{alert.msg}</p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* သိပြီ ခလုတ် - နှိပ်လိုက်တာနဲ့ React က ချက်ချင်း Re-render လုပ်ပြီး ဖျောက်ပေးပါလိမ့်မယ် */}
            <button 
              onClick={() => handleDismiss(alert.msg)}
              className="px-4 py-2 bg-white/50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 dark:hover:bg-white hover:text-white dark:hover:text-black transition-all active:scale-95 border border-slate-200 dark:border-slate-600"
            >
              Dismiss
            </button>

            <Link href={alert.type === 'missing' ? "/add" : "/transactions"} className="px-4 py-2 bg-white dark:bg-slate-800 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm hover:shadow-md transition-all active:scale-95 border border-slate-100 dark:border-slate-700">
              {alert.type === 'missing' ? "သွင်းရန်" : "စစ်ဆေးရန်"}
            </Link>
          </div>
        </div>
      ))}
    </div>
  )}

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
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-3 gap-6 mb-8">
        {/* Card 1: Revenue */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm border-t-4 border-t-emerald-500">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Revenue</p>
          <p className="text-3xl font-black text-slate-800 dark:text-white mt-1">${stats.income.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
          <p className="text-[10px] font-bold text-emerald-500 mt-2">↑ +${monthlyStats.inc.toLocaleString()}</p>
          <div className="mt-4 pt-4 border-t border-slate-50">
             <p className="text-[11px] font-bold text-slate-400 italic">This month: <span className="text-emerald-500 font-black">+${monthlyStats.inc.toLocaleString()}</span></p>
          </div>
        </div>

        {/* Card 2: Expenses */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm border-t-4 border-t-rose-500">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Expenses</p>
          <p className="text-3xl font-black text-slate-800 dark:text-white mt-1">${stats.expenses.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
          <p className="text-[10px] font-bold text-rose-500 mt-2">↓ -${monthlyStats.exp.toLocaleString()}</p>
          <div className="mt-4 pt-4 border-t border-slate-50">
             <p className="text-[11px] font-bold text-slate-400 italic">This month: <span className="text-rose-500 font-black">-${monthlyStats.exp.toLocaleString()}</span></p>
          </div>
        </div>

        {/* Card 3: Profit */}
        <div className="bg-slate-900 p-6 rounded-3xl shadow-xl border border-white/5 relative overflow-hidden group">
        <div className="relative z-10">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Net Taxable Profit</p>
          <p className="text-3xl font-black text-white mt-1">${businessProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
          <p className="text-[10px] font-bold text-emerald-400 mt-2 italic">Margin Safe</p>
          <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between">
             <p className="text-[11px] font-bold text-slate-500 italic">Net Margin: <span className="text-emerald-400 font-black">${(monthlyStats.inc - monthlyStats.exp).toLocaleString()}</span></p>
          </div>
        </div>
        </div>
      </div>

      {/* --- The Tax Savings Pot (Smart Guidance) --- */}
      <div className="mb-12 grid grid-cols-1 lg:grid-cols-2 gap-6 no-print">
        <div className="bg-emerald-500 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Landmark size={120} className="text-white"/></div>
              <p className="text-emerald-100 font-bold uppercase text-[9px] tracking-widest mb-1">Smart Saving Recommendation</p>
              <h4 className="text-xl font-black text-white mb-6">Transfer to Tax Account</h4>
              <div className="bg-white/20 backdrop-blur-md p-6 rounded-2xl border border-white/20 text-center">
                  <p className="text-[10px] font-bold text-emerald-100 uppercase mb-1">Move this amount now:</p>
                  <p className="text-4xl font-black text-white">${(businessProfit * 0.25).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                  <p className="text-[10px] font-medium text-white mt-3 leading-tight italic opacity-90">
                      *သင့်အမြတ်၏ ၂၅% ကို သီးသန့်စုထားခြင်းဖြင့် အခွန်ဆောင်ရမည့်အချိန်တွင် အခက်အခဲမရှိစေရန် အကြံပြုပါသည်။
                  </p>
              </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-lg flex flex-col justify-center">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Next Steps</p>
              <h4 className="text-xl font-black text-slate-800 dark:text-white mb-6">IRS Audit Protection Status</h4>
              <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center"><ShieldCheck size={24} /></div>
                  <div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-none">All Receipts Digitized</p>
                      <p className="text-[10px] font-bold text-emerald-500 uppercase mt-1 tracking-tighter">You are 100% Audit-Ready</p>
                  </div>
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

      {/* --- Charts Section (Now with Pie Chart) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-14">
        {/* Bar Chart */}
        <div className="bg-white p-8 rounded-[3.5rem] shadow-2xl border-2 border-slate-50 overflow-hidden">
          <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest mb-10 text-center italic tracking-[0.3em]">Cash Flow</h3>
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

        {/* --- Expense Pie Chart Section (Updated for Better Legend) --- */}
        <div className="bg-white p-8 rounded-[3.5rem] shadow-2xl border-2 border-slate-50 overflow-hidden flex flex-col">
          <h3 className="text-center font-black text-slate-900 uppercase text-xs mb-8 tracking-widest italic">Expense Analysis</h3>
          
          <div className="flex-1 flex flex-col">
            {/* Chart Area */}
            <div className="h-[280px] w-full">
              {isMounted && pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={1200}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={TAX_CATEGORIES.find(c => c.label === entry.name)?.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold'}} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-300 font-bold italic text-xs">No Expenses Yet</div>
              )}
            </div>

            {/* --- Custom Scrollable Grid Legend --- */}
            <div className="mt-6 pt-6 border-t border-slate-50 overflow-y-auto max-h-[150px] pr-2 custom-scrollbar">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {pieData.map((entry, index) => {
                  const cat = TAX_CATEGORIES.find(c => c.label === entry.name);
                  return (
                    <div key={index} className="flex items-center gap-2 group cursor-default">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm" 
                        style={{ backgroundColor: cat?.color || COLORS[index % COLORS.length] }}
                      ></div>
                      <div className="flex justify-between items-center w-full overflow-hidden">
                        <span className="text-[10px] font-black text-slate-500 truncate group-hover:text-slate-900 transition-colors">
                          {entry.name}
                        </span>
                        <span className="text-[9px] font-bold text-slate-300 ml-1">
                          {((entry.value / stats.expenses) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
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
              <div key={item.id} className="py-3 px-8 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <p className="font-bold text-slate-800 dark:text-slate-100 text-sm tracking-tight leading-none mb-1">{item.description}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{item.category.replace('_', ' ')}</span>
                  {/* Verify Check Icon (ရှိရင် ထည့်ပါ) */}
                  {item.verified && (
                    <span title="Verified with Bank">
                      <CheckCircle2 size={16} className="text-emerald-500" />
                    </span>
                  )}
                  </div>
                </div>
                  
                  <div>
                    <p className="font-black text-slate-900 text-lg tracking-tight leading-tight">{item.description}</p>
                    <p className={`text-sm md:text-base font-black tracking-tighter ${item.category === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
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
                  <p className={`text-xl md:text-2xl font-black tracking-tighter ${
                      item.category === 'income' 
                        ? 'text-emerald-600 dark:text-emerald-400' 
                        : 'text-rose-600 dark:text-rose-400'
                    }`}>
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