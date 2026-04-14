// app/add/page.tsx
"use client";
import { useState } from 'react';
import Layout from '@/components/Layout';
import { TAX_CATEGORIES } from '@/lib/constants';
import { db, auth, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Camera, Loader2, Check, AlertCircle } from 'lucide-react';

export default function AddTransaction() {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('other');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null); // ပုံစစ်ဖို့
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // --- ပုံကို အလိုအလျောက် ဆိုဒ်ကျုံ့ပေးမည့် Function ---
  const compressAndGetBase64 = (selectedFile: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1000; // ပုံကို ၁၀၀၀ pixel ထက်မပိုအောင် ကျုံ့မယ်
          let width = img.width;
          let height = img.height;
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6)); // 60% Quality နဲ့ ကျုံ့လိုက်ပြီ
        };
      };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsScanning(true);
    
    try {
      const compressedData = await compressAndGetBase64(selectedFile);
      setPreview(compressedData); // ပုံကို screen ပေါ်မှာ ပြထားမယ်

      // AI ဆီ ပို့မယ်
      const response = await fetch('/api/scan-receipt', {
        method: 'POST',
        body: JSON.stringify({ image: compressedData }),
      });
      const data = await response.json();
      
      if (data.merchant) {
        setDescription(data.merchant);
        setAmount(data.amount.toString());
        if (TAX_CATEGORIES.some(c => c.value === data.category)) setCategory(data.category);
      }
    } catch (err) {
      console.log("AI failed, switching to manual.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || isSaving) return;
    setIsSaving(true);

    try {
      let receiptUrl = "";
      if (preview) { // Preview ထဲက ကျုံ့ထားတဲ့ပုံကိုပဲ တိုက်ရိုက်သိမ်းမယ်
        const storageRef = ref(storage, `receipts/${auth.currentUser.uid}/${Date.now()}.jpg`);
        const response = await fetch(preview);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
        receiptUrl = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, "transactions"), {
        description, amount: parseFloat(amount), category, receiptUrl,
        date: serverTimestamp(), uid: auth.currentUser.uid,
      });
      window.location.href = "/";
    } catch (error) {
      alert("Error saving record");
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-xl mx-auto pt-4 px-4 pb-32">
        <h2 className="text-3xl font-black mb-8 text-slate-900 tracking-tighter uppercase italic">Add Record</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Snap Receipt Area */}
          <div className="relative h-64 border-4 border-dashed border-slate-200 rounded-[3rem] bg-white overflow-hidden flex flex-col items-center justify-center group transition-all hover:border-emerald-400 shadow-sm">
            {preview ? (
                <img src={preview} className="absolute inset-0 w-full h-full object-cover opacity-40 blur-[1px]" />
            ) : null}

            <div className="relative z-10 flex flex-col items-center text-center px-6">
                {isScanning ? (
                    <Loader2 size={48} className="text-emerald-500 animate-spin mb-3" />
                ) : (
                    <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white mb-3 shadow-lg"><Camera size={32} /></div>
                )}
                <p className="font-black text-slate-900">{isScanning ? "AI IS READING..." : "SNAP OR UPLOAD"}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Automatic Compression Enabled</p>
            </div>
            
            <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
          </div>

          {/* Form Area */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-50 space-y-6">
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Merchant / Store Name" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-900 focus:border-emerald-500 outline-none transition-all" required />
            
            <div className="grid grid-cols-2 gap-4">
                <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-2xl text-slate-900 focus:border-emerald-500 outline-none" required />
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-emerald-500 outline-none appearance-none">
                    {TAX_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
            </div>

            <button type="submit" disabled={isSaving || isScanning} className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-600 transition-all active:scale-95 disabled:bg-slate-200">
                {isSaving ? "SAVING..." : "CONFIRM & SAVE"}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}