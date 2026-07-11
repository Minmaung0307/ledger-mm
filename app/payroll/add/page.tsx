// app/payroll/add/page.tsx
"use client";
import { useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export default function AddContractor() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [taxId, setTaxId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || isSaving) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, "contractors"), {
        name,
        email,
        taxId,
        uid: auth.currentUser.uid,
        status: 'active', // <--- ဒါလေး သေချာပါရပါမယ်
        createdAt: serverTimestamp()
      });
      router.push('/payroll');
      router.refresh();
    } catch (err) {
      alert("Error saving contractor");
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-xl mx-auto pt-6 px-4 pb-20">
        <h2 className="text-3xl font-black mb-8 text-slate-900 dark:text-white tracking-tight uppercase italic">Add New Contractor</h2>
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-10 rounded-[2.5rem] shadow-2xl border-2 border-slate-50 dark:border-slate-700 space-y-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Legal Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-all" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white focus:border-emerald-500 outline-none" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Tax ID (SSN/EIN)</label>
            <input type="text" value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="000-00-0000"
              className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white focus:border-emerald-500 outline-none" />
          </div>
          <button type="submit" disabled={isSaving} className="w-full bg-slate-900 dark:bg-emerald-600 text-white p-5 rounded-2xl font-black tracking-widest hover:bg-emerald-600 transition shadow-xl active:scale-95 disabled:bg-slate-200">
            {isSaving ? "SAVING..." : "REGISTER CONTRACTOR"}
          </button>
        </form>
      </div>
    </Layout>
  );
}