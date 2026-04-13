// app/invoices/add/page.tsx
"use client";
import { useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function AddInvoice() {
  const [clientName, setClientName] = useState('');
  const [amount, setAmount] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now().toString().slice(-4)}`);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || isSaving) return;
    setIsSaving(true);

    try {
      await addDoc(collection(db, "invoices"), {
        clientName,
        amount: parseFloat(amount),
        invoiceNumber,
        status: 'Unpaid',
        createdAt: serverTimestamp(),
        uid: auth.currentUser.uid
      });
      window.location.href = "/invoices";
    } catch (err) {
      alert("Error saving invoice");
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-xl mx-auto pt-6">
        <h2 className="text-3xl font-black mb-8 text-slate-900">New Invoice</h2>
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2.5rem] shadow-2xl border-2 border-slate-50 space-y-6">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase mb-2 tracking-widest">Client Name</label>
            <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} required
              className="w-full p-4 border-2 border-slate-100 rounded-2xl focus:border-emerald-500 outline-none font-bold" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase mb-2 tracking-widest">Amount ($)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required
                className="w-full p-4 border-2 border-slate-100 rounded-2xl focus:border-emerald-500 outline-none font-bold" />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase mb-2 tracking-widest">Invoice #</label>
              <input type="text" value={invoiceNumber} readOnly
                className="w-full p-4 border-2 border-slate-50 bg-slate-50 rounded-2xl font-bold text-slate-400" />
            </div>
          </div>
          <button type="submit" disabled={isSaving}
            className="w-full bg-emerald-600 text-white p-5 rounded-2xl font-black hover:bg-emerald-700 transition shadow-lg">
            {isSaving ? "CREATING..." : "CREATE & SAVE INVOICE"}
          </button>
        </form>
      </div>
    </Layout>
  );
}