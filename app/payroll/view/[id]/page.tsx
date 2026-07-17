// app/payroll/view/[id]/page.tsx
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
// ပြင်ဆင်ချက် ၁: orderBy ပါဝင်အောင် သေသေချာချာ import လုပ်ထားပါတယ်
import { doc, getDoc, collection, query, where, onSnapshot, orderBy } from 'firebase/firestore'; 
import { useParams } from 'next/navigation';
// ပြင်ဆင်ချက် ၂: Icons တွေ အကုန်ပြန်သုံးထားလို့ အရောင်မမှိန်တော့ပါဘူး
import { User, Mail, Phone, MapPin, ShieldCheck, DollarSign, Calendar, ArrowLeft, FileText, TrendingUp } from 'lucide-react';

export default function PersonnelProfile() {
  const { id } = useParams();
  const [person, setPerson] = useState<any>(null);
  const [payments, setPayments] = useState<number[]>(Array(12).fill(0)); // payments variable ကို စနစ်တကျ သုံးပါမယ်
  const [loading, setLoading] = useState(true);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user && id) {
        // ၁။ လူ၏အချက်အလက်ကိုယူမယ်
        let docRef = doc(db, "contractors", id as string);
        let snap = await getDoc(docRef);
        if (!snap.exists()) {
          docRef = doc(db, "employees", id as string);
          snap = await getDoc(docRef);
        }
        
        if (snap.exists()) {
          const personData = snap.data();
          setPerson(personData);

          // ၂။ လစာပေးမှတ်တမ်းများ ရှာဖွေခြင်း
          const q = query(
            collection(db, "transactions"), 
            where("uid", "==", user.uid),
            orderBy("date", "desc")
          );

          const unsubscribeData = onSnapshot(q, (snapshot) => {
            const allTrans = snapshot.docs.map(doc => doc.data());
            const filteredPayments = allTrans.filter((t: any) => 
              t.description.toLowerCase().includes(personData.name.toLowerCase()) &&
              (t.category === 'contract_labor' || t.category === 'w2_wages')
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
  }, [id]);

  if (loading) return <Layout><p className="p-20 text-center font-black animate-pulse text-slate-400">ACCESSING PERSONNEL FILE...</p></Layout>;

  return (
    <Layout>
      <div className="pt-4 pb-40 px-4 max-w-6xl mx-auto">
        <button onClick={() => window.history.back()} className="flex items-center gap-2 text-slate-400 font-bold mb-8 hover:text-slate-900 transition uppercase text-[10px] tracking-widest"><ArrowLeft size={16}/> Back to Payroll</button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Profile Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-2xl border-2 border-slate-50 dark:border-slate-700 text-center">
                <div className="w-32 h-32 bg-slate-100 dark:bg-slate-900 rounded-[2.5rem] mx-auto mb-6 border-4 border-white dark:border-slate-700 shadow-lg overflow-hidden flex items-center justify-center">
                    {person?.photoUrl ? <img src={person.photoUrl} className="w-full h-full object-cover" /> : <User size={50} className="text-slate-300" />}
                </div>
                <div className="flex items-center justify-center gap-2 mb-1">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase">{person?.name}</h3>
                    <ShieldCheck size={20} className="text-emerald-500" /> {/* ShieldCheck အသုံးပြုခြင်း */}
                </div>
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest border border-emerald-100 dark:border-emerald-900/30 px-3 py-1 rounded-full inline-block">{person?.position || 'Verified Contractor'}</p>
                
                <div className="mt-8 space-y-4 text-left border-t border-slate-50 dark:border-slate-700 pt-6">
                    <div className="flex items-center gap-4 text-slate-500"><div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg"><Phone size={16}/></div> <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{person?.phone || 'N/A'}</span></div>
                    <div className="flex items-center gap-4 text-slate-500"><div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg"><Mail size={16}/></div> <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{person?.email || 'N/A'}</span></div>
                    <div className="flex items-start gap-4 text-slate-500"><div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg"><MapPin size={16}/></div> <span className="text-xs font-bold leading-tight text-slate-700 dark:text-slate-300">{person?.address || 'No address recorded'}</span></div>
                </div>
            </div>
          </div>

          {/* Right: Earnings Matrix */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="relative z-10">
                    <p className="text-emerald-400 font-black text-[10px] uppercase tracking-[0.2em] mb-2 flex items-center gap-2"><DollarSign size={14}/> Total Earnings Summary</p>
                    <h4 className="text-5xl font-black tracking-tighter">
                        ${payments.reduce((a, b) => a + b, 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </h4>
                </div>
                <div className="text-center md:text-right bg-white/10 p-6 rounded-3xl backdrop-blur-md border border-white/10">
                    <p className="text-slate-400 font-bold text-[10px] uppercase mb-1 flex items-center justify-center md:justify-end gap-1"><TrendingUp size={12}/> Net Payouts</p>
                    <p className="text-2xl font-black text-white italic">Audit Ready</p>
                </div>
            </div>

            {/* Monthly Matrix */}
            <div className="bg-white dark:bg-slate-800 rounded-[3rem] shadow-xl border-2 border-slate-50 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FileText size={18} className="text-emerald-500"/> {/* FileText အသုံးပြုခြင်း */}
                        <h3 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-widest">Monthly Payroll Matrix (2026)</h3>
                    </div>
                    <span className="text-[9px] font-black bg-slate-900 text-white px-3 py-1 rounded-lg uppercase tracking-tighter">Personal Records</span>
                </div>
                
                <div className="grid grid-cols-3 md:grid-cols-4 gap-px bg-slate-100 dark:bg-slate-700">
                    {monthNames.map((m, i) => (
                        <div key={m} className="bg-white dark:bg-slate-800 p-6 flex flex-col items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                            <p className="text-[10px] font-black text-slate-300 uppercase mb-2">{m}</p>
                            <p className={`text-lg font-black ${payments[i] > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-100 dark:text-slate-700'}`}>
                                ${payments[i].toLocaleString()}
                            </p> 
                        </div>
                    ))}
                </div>
                
                <div className="p-8 bg-emerald-600 text-white flex justify-between items-center shadow-inner">
                    <div className="flex items-center gap-3">
                        <Calendar size={24} className="opacity-40" />
                        <p className="font-black uppercase text-xs tracking-[0.2em]">Total Year to Date</p>
                    </div>
                    <p className="text-3xl font-black underline decoration-white/30 underline-offset-8">
                        ${payments.reduce((a, b) => a + b, 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </p>
                </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}