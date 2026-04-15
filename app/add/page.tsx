"use client";
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { TAX_CATEGORIES } from '@/lib/constants';
import { db, auth, storage } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Camera, Loader2 } from 'lucide-react';

export default function ProfessionalEntry() {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('other');
  const [bankAccount, setBankAccount] = useState('');
  const [transDate, setTransDate] = useState(new Date().toISOString().split('T')[0]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const q = query(collection(db, "chart_of_accounts"), where("uid", "==", u.uid));
        const snap = await getDocs(q);
        const accs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        setAccounts(accs);
        if (accs.length > 0) setBankAccount(accs[0].name);
      }
    });
  }, []);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader(); reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image(); img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas'); const MAX = 1000;
          let w = img.width, h = img.height;
          if (w > MAX) { h *= MAX / w; w = MAX; }
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d'); ctx?.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.5));
        };
      };
    });
  };

  const base64ToBlob = (base64: string) => {
    const byteString = atob(base64.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    return new Blob([ab], { type: 'image/jpeg' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!user || isSaving) return; setIsSaving(true);
    try {
      let receiptUrl = "";
      if (preview) {
        const storageRef = ref(storage, `receipts/${user.uid}/${new Date().getFullYear()}/${Date.now()}.jpg`);
        await uploadBytes(storageRef, base64ToBlob(preview));
        receiptUrl = await getDownloadURL(storageRef);
      }
      await addDoc(collection(db, "transactions"), {
        description, amount: parseFloat(amount), category, receiptUrl, bankAccount,
        transactionDate: new Date(transDate), date: serverTimestamp(), uid: user.uid, verified: false
      });
      window.location.href = "/";
    } catch (err) { alert("Save Error"); setIsSaving(false); }
  };

  return (
    <Layout>
      <div className="max-w-xl mx-auto pt-6 px-4 pb-40">
        <h2 className="text-3xl font-black mb-8 text-slate-900 tracking-tighter uppercase italic">New Record</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <label className="relative h-64 border-4 border-dashed border-slate-200 rounded-[3rem] bg-white overflow-hidden flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 transition-all shadow-sm">
            {preview ? <img src={preview} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="p" /> : <div className="text-center text-slate-400 font-black"><Camera size={40} className="mx-auto mb-2" /> SNAP RECEIPT</div>}
            <input type="file" accept="image/*" capture="environment" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setPreview(await compressImage(f)); }} className="hidden" />
          </label>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-50 space-y-6">
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Merchant Name" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-900 focus:border-emerald-500 outline-none" required />
            <div className="grid grid-cols-2 gap-4">
                <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-2xl focus:border-emerald-500 outline-none" required />
                <input type="date" value={transDate} onChange={e => setTransDate(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold appearance-none outline-none">{TAX_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
                <select value={bankAccount} onChange={e => setBankAccount(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold appearance-none outline-none">{accounts.map(acc => <option key={acc.id} value={acc.name}>{acc.name}</option>)}<option value="Cash/Other">Cash / Other</option></select>
            </div>
            <button type="submit" disabled={isSaving} className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-600 transition active:scale-95 disabled:bg-slate-200">
                {isSaving ? <Loader2 className="animate-spin mx-auto" /> : "CONFIRM & SAVE RECORD"}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}