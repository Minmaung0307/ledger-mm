// app/payroll/view/[id]/page.tsx (Updated with Document Storage)
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth, storage } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot, orderBy, updateDoc, arrayUnion } from 'firebase/firestore'; 
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useParams } from 'next/navigation';
import { User, Mail, Phone, MapPin, ShieldCheck, DollarSign, Calendar, ArrowLeft, FileText, UploadCloud, Download, Clock, ChevronDown, Award, Trash2 } from 'lucide-react';

export default function PersonnelProfile() {
  const { id } = useParams();
  const [person, setPerson] = useState<any>(null);
  const [payments, setPayments] = useState<number[]>(Array(12).fill(0));
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isUploading, setIsUploading] = useState(false);
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
          const personData = { id: snap.id, ...snap.data() as any };
          setPerson(personData);

          // ၂။ လစာပေးမှတ်တမ်းများ ရှာဖွေခြင်း
          const q = query(collection(db, "transactions"), where("uid", "==", user.uid), orderBy("date", "desc"));
          const unsubscribeData = onSnapshot(q, (snapshot) => {
            const filteredPayments = snapshot.docs.map(doc => doc.data()).filter((t: any) => 
              t.description.toLowerCase().includes(personData.name.toLowerCase()) &&
              (t.transactionDate?.toDate().getFullYear() === selectedYear || t.date?.toDate().getFullYear() === selectedYear)
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

  // --- Document Upload Logic (ID, Resume သိမ်းရန်) ---
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !person) return;
    setIsUploading(true);
    try {
        const storageRef = ref(storage, `documents/${person.id}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);

        const collectionName = person.salary ? "employees" : "contractors"; // Employee/Contractor ခွဲခြားခြင်း
        await updateDoc(doc(db, collectionName, person.id), {
            documents: arrayUnion({ name: file.name, url: url, type: file.type, date: new Date().toLocaleDateString() })
        });
        alert("Document Saved!");
        window.location.reload();
    } catch (err) { alert("Upload failed"); }
    finally { setIsUploading(false); }
  };

  const getTenure = () => {
    if (!person?.joinDate) return "N/A";
    const join = person.joinDate.toDate();
    const diff = Math.floor((new Date().getTime() - join.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 365 ? `${Math.floor(diff/365)} yr ${Math.floor((diff%365)/30)} mo` : `${Math.floor(diff/30)} months`;
  };

  if (loading) return <Layout><p className="p-20 text-center font-black animate-pulse">Syncing Personnel Data...</p></Layout>;

  return (
    <Layout>
      <div className="pt-4 pb-40 px-4 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-10 no-print">
            <button onClick={() => window.history.back()} className="flex items-center gap-2 text-slate-400 font-bold hover:text-emerald-500 transition-all uppercase text-[10px] tracking-widest"><ArrowLeft size={16}/> Back</button>
            <div className="relative">
                <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="appearance-none bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white px-6 py-2 rounded-xl font-black text-xs outline-none pr-10 border-2 border-transparent focus:border-emerald-500 cursor-pointer">
                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y} FISCAL YEAR</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            {/* Bio Card */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-2xl border-2 border-slate-50 dark:border-slate-700 text-center relative overflow-hidden">
                <div className="w-32 h-32 bg-slate-100 dark:bg-slate-900 rounded-[2.5rem] mx-auto mb-6 border-4 border-white dark:border-slate-700 shadow-lg overflow-hidden flex items-center justify-center">
                    {person?.photoUrl ? <img src={person.photoUrl} className="w-full h-full object-cover" /> : <User size={50} className="text-slate-300" />}
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{person?.name}</h3>
                <div className="mt-4"><span className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 px-4 py-1.5 rounded-full font-black text-[10px] uppercase border border-emerald-100 dark:border-emerald-800/50 shadow-sm inline-flex items-center gap-2"><Clock size={12}/> Tenure: {getTenure()}</span></div>
                
                <div className="mt-8 space-y-4 text-left border-t border-slate-50 dark:border-slate-700 pt-6">
                    <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400"><div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl shadow-inner"><Phone size={16}/></div> <span className="text-sm font-bold">{person?.phone || 'N/A'}</span></div>
                    <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400"><div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl shadow-inner"><Mail size={16}/></div> <span className="text-sm font-bold truncate">{person?.email || 'N/A'}</span></div>
                    <div className="flex items-start gap-4 text-slate-500 dark:text-slate-400"><div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl shadow-inner"><MapPin size={16}/></div> <span className="text-xs font-bold leading-relaxed">{person?.address || 'No address'}</span></div>
                    <div className="mt-6 bg-amber-50/50 dark:bg-amber-900/10 p-5 rounded-3xl border border-amber-100 dark:border-amber-900/30">
                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2 mb-2"><Award size={14}/> Manager's Notes</p>
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-400 italic">"{person?.internalNotes || 'No notes.'}"</p>
                    </div>
                </div>
            </div>

            {/* --- NEW: Document Storage Section --- */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border-2 border-slate-50 dark:border-slate-700 shadow-xl">
                <div className="flex justify-between items-center mb-6 px-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Personal Files</h4>
                    <label className="cursor-pointer text-emerald-500 hover:text-emerald-700 transition">
                        <UploadCloud size={20}/>
                        <input type="file" className="hidden" onChange={handleDocUpload} />
                    </label>
                </div>
                <div className="space-y-3">
                    {person?.documents?.map((d: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <FileText size={18} className="text-slate-300" />
                                <div className="overflow-hidden">
                                    <p className="text-[11px] font-black text-slate-900 dark:text-white truncate">{d.name}</p>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase">{d.date}</p>
                                </div>
                            </div>
                            <a href={d.url} target="_blank" className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition"><Download size={14}/></a>
                        </div>
                    ))}
                    {!person?.documents?.length && <p className="text-center text-[10px] font-bold text-slate-300 py-4 uppercase italic">No IDs or Resumes</p>}
                    {isUploading && <p className="text-center text-[10px] font-black text-emerald-500 animate-pulse">Uploading Document...</p>}
                </div>
            </div>
          </div>

          {/* Right Column: Earnings Matrix (Yearly) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Pay Card - ပိုလှသွားပါပြီ */}
            <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <p className="text-emerald-400 font-black text-[10px] uppercase tracking-[0.2em] mb-2">Total Earnings - {selectedYear}</p>
                    <h4 className="text-6xl font-black tracking-tighter">${payments.reduce((a, b) => a + b, 0).toLocaleString()}</h4>
                </div>
                <div className="text-center md:text-right">
                    <p className="text-slate-500 font-bold text-[10px] uppercase mb-1">Joined Date</p>
                    <p className="text-xl font-black text-white">{person?.joinDate?.toDate().toLocaleDateString('en-US', {month:'short', year:'numeric'}) || 'N/A'}</p>
                </div>
            </div>

            {/* Matrix Grid */}
            <div className="bg-white dark:bg-slate-800 rounded-[3rem] shadow-xl border-2 border-slate-50 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-50 dark:border-slate-700 flex items-center gap-2">
                    <FileText size={18} className="text-emerald-500"/><h3 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-widest">Monthly Payroll Summary</h3>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-px bg-slate-100 dark:bg-slate-700">
                    {monthNames.map((m, i) => (
                        <div key={m} className="bg-white dark:bg-slate-800 p-6 flex flex-col items-center justify-center hover:bg-emerald-50 transition-all">
                            <p className="text-[10px] font-black text-slate-300 uppercase mb-2">{m}</p>
                            <p className={`text-lg font-black ${payments[i] > 0 ? 'text-emerald-600' : 'text-slate-200 dark:text-slate-700'}`}>${payments[i].toLocaleString()}</p> 
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