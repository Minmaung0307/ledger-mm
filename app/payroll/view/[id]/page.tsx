// app/payroll/view/[id]/page.tsx
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot, orderBy } from 'firebase/firestore'; 
import { useParams } from 'next/navigation';
import { User, Mail, Phone, MapPin, ShieldCheck, DollarSign, Calendar, ArrowLeft, FileText, TrendingUp, Award, Clock, ChevronDown } from 'lucide-react';

export default function PersonnelProfile() {
  const { id } = useParams();
  const [person, setPerson] = useState<any>(null);
  const [payments, setPayments] = useState<number[]>(Array(12).fill(0));
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear()); // နှစ်အလိုက်ကြည့်ရန်
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user && id) {
        let docRef = doc(db, "contractors", id as string);
        let snap = await getDoc(docRef);
        if (!snap.exists()) {
          docRef = doc(db, "employees", id as string);
          snap = await getDoc(docRef);
        }
        
        if (snap.exists()) {
          const personData = snap.data();
          setPerson(personData);

          // နှစ်အလိုက် စာရင်းစစ်ထုတ်ခြင်း
          const startOfYear = new Date(selectedYear, 0, 1);
          const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59);

          const q = query(
            collection(db, "transactions"), 
            where("uid", "==", user.uid),
            where("date", ">=", startOfYear),
            where("date", "<=", endOfYear),
            orderBy("date", "desc")
          );

          const unsubscribeData = onSnapshot(q, (snapshot) => {
            const filteredPayments = snapshot.docs.map(doc => doc.data()).filter((t: any) => 
              t.description.toLowerCase().includes(personData.name.toLowerCase())
            );

            const monthlyTotals = Array(12).fill(0);
            filteredPayments.forEach((p: any) => {
              const date = p.transactionDate?.toDate?.() || p.date?.toDate?.() || new Date();
              monthlyTotals[date.getMonth()] += p.amount;
            });
            setPayments(monthlyTotals);
            setLoading(false);
          });

          return () => unsubscribeData();
        }
      }
    });
    return () => unsubscribeAuth();
  }, [id, selectedYear]);

  // လုပ်သက်တွက်ချက်ခြင်း Logic
  const getTenure = () => {
    if (!person?.joinDate) return "N/A";
    const join = person.joinDate.toDate();
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - join.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    return years > 0 ? `${years} yr ${months} mo` : `${months} months`;
  };

  if (loading) return <Layout><p className="p-20 text-center font-black animate-pulse text-slate-400">LOADING PROFILE...</p></Layout>;

  return (
    <Layout>
      <div className="pt-4 pb-40 px-4 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8 no-print">
            <button onClick={() => window.history.back()} className="flex items-center gap-2 text-slate-400 font-bold hover:text-emerald-500 dark:hover:text-white transition-all uppercase text-[10px] tracking-widest"><ArrowLeft size={16}/> Back</button>
            
            {/* Year Selector */}
            <div className="relative">
                <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="appearance-none bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white px-6 py-2 rounded-xl font-black text-xs outline-none pr-10 border-2 border-transparent focus:border-emerald-500 transition-all cursor-pointer">
                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y} PAY HISTORY</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Smart Bio Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-2xl border-2 border-slate-50 dark:border-slate-700 text-center relative overflow-hidden">
                <div className="w-32 h-32 bg-slate-100 dark:bg-slate-900 rounded-[2.5rem] mx-auto mb-6 border-4 border-white dark:border-slate-700 shadow-xl overflow-hidden flex items-center justify-center">
                    {person?.photoUrl ? <img src={person.photoUrl} className="w-full h-full object-cover" /> : <User size={50} className="text-slate-300" />}
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{person?.name}</h3>
                
                {/* Employment Tenure Badge */}
                <div className="mt-4 flex items-center justify-center gap-2">
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 px-4 py-1.5 rounded-full font-black text-[10px] uppercase flex items-center gap-2 border border-emerald-100 dark:border-emerald-800/50 shadow-sm">
                        <Clock size={12}/> Tenure: {getTenure()}
                    </div>
                </div>

                <div className="mt-8 space-y-4 text-left border-t border-slate-50 dark:border-slate-700 pt-6">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">Contact & Identification</p>
                    <div className="flex items-center gap-4 text-slate-500"><div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl"><Phone size={16}/></div> <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{person?.phone || 'N/A'}</span></div>
                    <div className="flex items-center gap-4 text-slate-500"><div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl"><Mail size={16}/></div> <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{person?.email || 'N/A'}</span></div>
                    <div className="flex items-start gap-4 text-slate-500"><div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl"><MapPin size={16}/></div> <span className="text-xs font-bold leading-relaxed text-slate-700 dark:text-slate-300">{person?.address || 'No address recorded'}</span></div>
                    
                    {/* Notes Section (ဝန်ထမ်းအရည်အချင်း မှတ်ချက်များ) */}
                    <div className="mt-6 bg-amber-50/50 dark:bg-amber-900/10 p-5 rounded-3xl border border-amber-100 dark:border-amber-900/30">
                        <div className="flex items-center gap-2 mb-2">
                            <Award size={16} className="text-amber-500"/>
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Internal Notes</p>
                        </div>
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-relaxed italic">
                            "{person?.internalNotes || 'No performance notes yet.'}"
                        </p>
                    </div>
                </div>
            </div>
          </div>

          {/* Right Column: Earnings Matrix (Yearly) */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="absolute top-0 right-0 p-4 opacity-5"><TrendingUp size={150} /></div>
                <div className="relative z-10">
                    <p className="text-emerald-400 font-black text-[10px] uppercase tracking-[0.2em] mb-2 flex items-center gap-2"><DollarSign size={14}/> Total Paid in {selectedYear}</p>
                    <h4 className="text-6xl font-black tracking-tighter">
                        ${payments.reduce((a, b) => a + b, 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </h4>
                </div>
                <div className="bg-white/10 p-6 rounded-3xl backdrop-blur-md border border-white/10 text-center">
                    <p className="text-slate-400 font-bold text-[10px] uppercase mb-1 italic">Joined Since</p>
                    <p className="text-xl font-black text-white">{person?.joinDate?.toDate().toLocaleDateString('en-US', {month: 'short', year: 'numeric'}) || 'N/A'}</p>
                </div>
            </div>

            {/* Payment History Grid */}
            <div className="bg-white dark:bg-slate-800 rounded-[3rem] shadow-xl border-2 border-slate-50 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex items-center gap-2">
                    <FileText size={18} className="text-emerald-500"/>
                    <h3 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-widest">{selectedYear} Payroll Analysis</h3>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-px bg-slate-100 dark:bg-slate-700">
                    {monthNames.map((m, i) => (
                        <div key={m} className="bg-white dark:bg-slate-800 p-6 flex flex-col items-center justify-center hover:bg-emerald-50 dark:hover:bg-slate-700/50 transition-colors">
                            <p className="text-[10px] font-black text-slate-300 uppercase mb-2 tracking-tighter">{m}</p>
                            <p className={`text-lg font-black ${payments[i] > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-100 dark:text-slate-700'}`}>
                                ${payments[i].toLocaleString()}
                            </p> 
                        </div>
                    ))}
                </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}