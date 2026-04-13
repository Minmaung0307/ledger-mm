// app/add/page.tsx (Error Message ပါဝင်သော Version)
"use client";
import { useState } from 'react';
import Layout from '@/components/Layout';
import { TAX_CATEGORIES } from '@/lib/constants';
import { db, auth, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Camera, Sparkles, Loader2, AlertCircle } from 'lucide-react';

export default function AddTransaction() {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('income');
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState(''); // Error ပြဖို့

  const handleAIScan = async (selectedFile: File) => {
    setIsScanning(true);
    setErrorMsg('');
    try {
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onload = async () => {
        const base64 = reader.result as string;
        const response = await fetch('/api/scan-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 }),
        });

        const data = await response.json();
        if (data.error) {
           setErrorMsg("AI Scan failed: " + data.error);
        } else if (data.merchant) {
          setDescription(data.merchant);
          setAmount(data.amount.toString());
          const validCat = TAX_CATEGORIES.find(c => c.value === data.category);
          if (validCat) setCategory(data.category);
        }
        setIsScanning(false);
      };
    } catch (error) {
      setErrorMsg("AI Network Error");
      setIsScanning(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      handleAIScan(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user || isSaving) return;
    setIsSaving(true);
    setErrorMsg('');

    try {
      let receiptUrl = "";
      if (file) {
        // ပုံကို Storage ထဲ တင်မယ်
        const storageRef = ref(storage, `receipts/${user.uid}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        receiptUrl = await getDownloadURL(snapshot.ref);
      }

      // Database ထဲ သိမ်းမယ်
      await addDoc(collection(db, "transactions"), {
        description,
        amount: parseFloat(amount),
        category,
        receiptUrl,
        date: serverTimestamp(),
        uid: user.uid,
      });
      
      // အောင်မြင်ရင် Dashboard ကို ပြန်သွားမယ်
      window.location.href = "/";
    } catch (error: any) {
      console.error(error);
      setErrorMsg("Save Failed: " + error.message);
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-xl mx-auto pt-6 px-4 pb-20">
        <h2 className="text-4xl font-black mb-8 text-slate-900 tracking-tight italic text-center md:text-left">Add Record</h2>
        
        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-50 border-2 border-rose-100 text-rose-600 rounded-2xl flex items-center gap-3 font-bold text-sm">
             <AlertCircle size={20} /> {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative border-4 border-dashed border-slate-200 p-10 rounded-[3rem] bg-white flex flex-col items-center justify-center gap-4 hover:border-emerald-400 transition-all cursor-pointer overflow-hidden group shadow-sm">
            {isScanning ? (
                <div className="flex flex-col items-center animate-pulse">
                    <Loader2 size={48} className="text-emerald-500 animate-spin mb-4" />
                    <p className="text-emerald-600 font-black uppercase text-[10px] tracking-widest">AI is reading receipt...</p>
                </div>
            ) : (
                <>
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition">
                        <Camera size={40} />
                    </div>
                    <div className="text-center">
                        <p className="text-slate-900 font-black">Snap or Upload Receipt</p>
                        <p className="text-slate-400 text-[10px] font-bold uppercase mt-1 tracking-widest italic">AI will auto-fill your form</p>
                    </div>
                </>
            )}
            <input 
              type="file" accept="image/*" capture="environment"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={isScanning}
            />
          </div>

          <div className={`bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-50 space-y-6 transition-all ${isScanning ? 'opacity-40 blur-[2px]' : 'opacity-100'}`}>
            <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    Description {isScanning && <Sparkles size={12} className="text-emerald-500 animate-bounce" />}
                </label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} required
                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-900 focus:border-emerald-500 outline-none transition-all text-lg" placeholder="Merchant name" />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        Amount ($) {isScanning && <Sparkles size={12} className="text-emerald-500 animate-bounce" />}
                    </label>
                    <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required
                        className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-2xl text-slate-900 focus:border-emerald-500 outline-none" placeholder="0.00" />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Category</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)}
                        className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-900 focus:border-emerald-500 outline-none appearance-none">
                        {TAX_CATEGORIES.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            <button type="submit" disabled={isSaving || isScanning}
                className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-emerald-600 transition-all active:scale-95 disabled:bg-slate-200 disabled:text-slate-400">
                {isSaving ? "SAVING TO CLOUD..." : "SAVE TRANSACTION"}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}