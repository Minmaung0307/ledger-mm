// app/add/page.tsx
"use client";
import { useState } from 'react';
import Layout from '@/components/Layout';
import { TAX_CATEGORIES } from '@/lib/constants';
import { db, auth, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Camera } from 'lucide-react';

export default function AddTransaction() {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('income');
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser; // login user ကို ဖမ်းလိုက်မယ်
    
    if (!user) {
        alert("Please wait until login is complete.");
        return;
    }
    if (isSaving) return;
    setIsSaving(true);

    try {
      let receiptUrl = "";
      if (file) {
        // auth.currentUser အစား user.uid ကို သုံးပါ
        const storageRef = ref(storage, `receipts/${user.uid}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        receiptUrl = await getDownloadURL(snapshot.ref);
      }

      await addDoc(collection(db, "transactions"), {
        description,
        amount: parseFloat(amount),
        category,
        receiptUrl,
        date: serverTimestamp(),
        uid: user.uid, // ဒီမှာလည်း user.uid ကို သုံးပါ
      });
      
      window.location.href = "/";
    } catch (error) {
      console.error(error);
      alert("Something went wrong!");
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-xl mx-auto pt-6 px-4">
        <h2 className="text-3xl font-extrabold mb-8 text-slate-900 tracking-tight">Add Record</h2>
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-[2.5rem] shadow-2xl border-2 border-slate-50">
          <div>
            <label className="block text-md font-bold text-slate-900 mb-2">Description (ရှင်းလင်းချက်)</label>
            <input 
              type="text" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-4 border-2 border-slate-300 rounded-2xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-slate-900 text-lg font-bold placeholder:text-slate-400 bg-white" 
              placeholder="e.g. Website Project" 
              required
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-md font-bold text-slate-900 mb-2">Amount (ပမာဏ - $)</label>
              <input 
                type="number" 
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-4 border-2 border-slate-300 rounded-2xl focus:border-emerald-500 outline-none text-slate-900 text-lg font-black bg-white" 
                placeholder="0.00" 
                required
              />
            </div>
            <div>
              <label className="block text-md font-bold text-slate-900 mb-2">Tax Category (အမျိုးအစား)</label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-4 border-2 border-slate-300 rounded-2xl focus:border-emerald-500 outline-none text-slate-900 text-lg font-bold bg-white appearance-none cursor-pointer"
              >
                {TAX_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value} className="text-slate-900 font-bold">{cat.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Image Upload Area */}
          <div className="border-4 border-dashed border-slate-100 p-6 rounded-3xl flex flex-col items-center justify-center gap-3 hover:border-emerald-200 transition bg-slate-50/50">
            <Camera size={40} className="text-slate-300" />
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="text-xs font-bold text-slate-500"
            />
            {file && <p className="text-xs font-black text-emerald-600 uppercase">Selected: {file.name}</p>}
          </div>

          <button 
            type="submit" 
            disabled={isSaving}
            className={`w-full p-5 rounded-2xl font-black text-xl text-white transition-all transform active:scale-95 shadow-lg ${
              isSaving ? 'bg-slate-500 animate-pulse cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-200'
            }`}
          >
            {isSaving ? "SAVING TO CLOUD..." : "SAVE TRANSACTION"}
          </button>
        </form>
      </div>
    </Layout>
  );
}