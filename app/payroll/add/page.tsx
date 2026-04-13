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
  const [taxId, setTaxId] = useState(''); // SSN သို့မဟုတ် EIN
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
        createdAt: serverTimestamp()
      });
      router.push('/payroll');
    } catch (err) {
      alert("Error saving contractor");
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-xl mx-auto pt-6 px-4">
        <h2 className="text-3xl font-black mb-8 text-slate-900 tracking-tight">Add Contractor</h2>
        <form onSubmit={handleSubmit} className="bg-white p-10 rounded-[2.5rem] shadow-2xl border-2 border-slate-50 space-y-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Legal Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full p-4 border-2 border-slate-100 rounded-2xl focus:border-emerald-500 outline-none font-bold text-slate-900" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 border-2 border-slate-100 rounded-2xl focus:border-emerald-500 outline-none font-bold text-slate-900" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tax ID (SSN/EIN)</label>
            <input type="text" value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="000-00-0000"
              className="w-full p-4 border-2 border-slate-100 rounded-2xl focus:border-emerald-500 outline-none font-bold text-slate-900" />
          </div>
          <button type="submit" disabled={isSaving} className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black tracking-widest hover:bg-emerald-600 transition shadow-xl">
            {isSaving ? "SAVING..." : "REGISTER CONTRACTOR"}
          </button>
        </form>
      </div>
    </Layout>
  );
}