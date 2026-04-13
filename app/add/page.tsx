// app/add/page.tsx
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
  const [errorMsg, setErrorMsg] = useState('');

  // --- ပုံကို ဆိုဒ်ကျုံ့ပေးမည့် Function (Compression) ---
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200; // ပုံအကျယ်ကို ၁၂၀၀ ထက်မကျော်အောင် ထားမယ်
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Quality ကို 0.7 (70%) ထားပြီး JPEG ပြောင်းမယ် (ဒါဆိုရင် ဆိုဒ်တော်တော် သေးသွားပါပြီ)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleAIScan = async (selectedFile: File) => {
    setIsScanning(true);
    setErrorMsg('');
    try {
      // ၁။ ပုံကို အရင်ကျုံ့မယ်
      const compressedBase64 = await compressImage(selectedFile);

      // ၂။ ကျုံ့ထားတဲ့ ပုံကိုမှ API ဆီ ပို့မယ်
      const response = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: compressedBase64 }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.details || data.error || "Server error");
      }

      if (data.merchant) {
        setDescription(data.merchant);
        setAmount(data.amount.toString());
        const validCat = TAX_CATEGORIES.find(c => c.value === data.category);
        if (validCat) setCategory(data.category);
      }
    } catch (error: any) {
      console.error("AI Error:", error);
      setErrorMsg(`AI Scan Failed: ${error.message}`);
    } finally {
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
        uid: user.uid,
      });
      window.location.href = "/";
    } catch (error: any) {
      setErrorMsg(`Save Failed: ${error.message}`);
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-xl mx-auto pt-6 px-4 pb-32">
        <h2 className="text-4xl font-black mb-8 text-slate-900 tracking-tight italic">Add Record</h2>
        
        {errorMsg && (
          <div className="mb-6 p-5 bg-rose-50 border-2 border-rose-100 text-rose-600 rounded-3xl flex items-start gap-3 font-bold text-sm shadow-sm animate-in fade-in duration-300">
             <AlertCircle size={20} className="mt-0.5 flex-shrink-0" /> 
             <div className="leading-tight">{errorMsg}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative border-4 border-dashed border-slate-200 p-10 rounded-[3.5rem] bg-white flex flex-col items-center justify-center gap-4 hover:border-emerald-400 transition-all cursor-pointer shadow-sm">
            {isScanning ? (
                <div className="flex flex-col items-center">
                    <Loader2 size={48} className="text-emerald-500 animate-spin mb-4" />
                    <p className="text-emerald-600 font-black uppercase text-[10px] tracking-widest animate-pulse">Compressing & AI Reading...</p>
                </div>
            ) : (
                <>
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                        <Camera size={40} />
                    </div>
                    <div className="text-center px-4">
                        <p className="text-slate-900 font-black">Snap Receipt</p>
                        <p className="text-slate-400 text-[10px] font-bold uppercase mt-1 tracking-widest italic opacity-70">AI will auto-fill everything</p>
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

          <div className={`bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-50 space-y-6 transition-all duration-500 ${isScanning ? 'opacity-30 blur-[4px] pointer-events-none scale-95' : 'opacity-100 blur-0 scale-100'}`}>
            <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    Description {isScanning && <Sparkles size={12} className="text-emerald-500 animate-bounce" />}
                </label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} required
                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-900 focus:border-emerald-500 outline-none transition-all text-lg" placeholder="Shop name" />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        Amount ($)
                    </label>
                    <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required
                        className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-2xl text-slate-900 focus:border-emerald-500 outline-none" placeholder="0.00" />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Category</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)}
                        className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-900 focus:border-emerald-500 outline-none appearance-none">
                        {TAX_CATEGORIES.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            <button type="submit" disabled={isSaving || isScanning}
                className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-emerald-600 transition-all active:scale-95 disabled:bg-slate-100 disabled:text-slate-300">
                {isSaving ? "SAVING..." : "SAVE TRANSACTION"}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}