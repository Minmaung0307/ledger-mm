// app/add/page.tsx
"use client";
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { TAX_CATEGORIES } from '@/lib/constants';
import { db, auth, storage } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Camera, Loader2, AlertCircle, Sparkles } from 'lucide-react';

export default function AddTransaction() {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('other');
  const [preview, setPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [user, setUser] = useState<any>(null);

  // ၁။ User Login အခြေအနေကို အရင်ဖမ်းထားမယ်
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currUser) => {
      setUser(currUser);
    });
    return () => unsubscribe();
  }, []);

  // ၂။ Base64 ကို Blob ပြောင်းတဲ့ Safe Function (fetch အစား ဒါကို သုံးပါမယ်)
  const base64ToBlob = (base64: string) => {
    const byteString = atob(base64.split(',')[1]);
    const mimeString = base64.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  };

  // ၃။ ပုံကို ချုံ့ပေးမယ့် Function
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1000;
          let width = img.width;
          let height = img.height;
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
      };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile || !user) return;

    setIsScanning(true);
    try {
      const compressedData = await compressImage(selectedFile);
      setPreview(compressedData);

      // AI API ဆီ ပို့မယ်
      const response = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: compressedData }),
      });
      
      const data = await response.json();
      if (data.merchant) {
        setDescription(data.merchant);
        setAmount(data.amount.toString());
        if (TAX_CATEGORIES.some(c => c.value === data.category)) {
          setCategory(data.category);
        }
      }
    } catch (err) {
      console.error("AI failed:", err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSaving) return;
    setIsSaving(true);

    try {
      let receiptUrl = "";
      if (preview) {
        const storageRef = ref(storage, `receipts/${user.uid}/${Date.now()}.jpg`);
        const blob = base64ToBlob(preview); // ဒီမှာ Safe Blob ပြောင်းမယ်
        await uploadBytes(storageRef, blob);
        receiptUrl = await getDownloadURL(storageRef);
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
    } catch (error) {
      alert("Save Failed. Try again.");
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-xl mx-auto pt-6 px-4 pb-40">
        <h2 className="text-3xl font-black mb-8 text-slate-900 tracking-tighter uppercase italic">Add Record</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Snap Receipt Clickable Area */}
          <label className="relative h-64 border-4 border-dashed border-slate-200 rounded-[3rem] bg-white overflow-hidden flex flex-col items-center justify-center cursor-pointer transition-all hover:border-emerald-400 shadow-sm group active:scale-95">
            {preview && (
                <img src={preview} className="absolute inset-0 w-full h-full object-cover opacity-30 blur-[2px]" alt="preview" />
            )}

            <div className="relative z-10 flex flex-col items-center text-center px-6">
                {isScanning ? (
                    <Loader2 size={48} className="text-emerald-500 animate-spin mb-3" />
                ) : (
                    <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white mb-3 shadow-xl group-hover:rotate-12 transition-transform">
                        <Camera size={32} />
                    </div>
                )}
                <p className="font-black text-slate-900 uppercase tracking-tight">
                    {isScanning ? "AI IS READING..." : "SNAP OR UPLOAD"}
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Receipt will be compressed automatically</p>
            </div>
            
            <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                onChange={handleFileChange} 
                className="hidden" // Input ကို ဖျောက်ပြီး label နဲ့ နှိပ်ခိုင်းတာပါ
            />
          </label>

          {/* Form Fields */}
          <div className={`bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-50 space-y-6 transition-all ${isScanning ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            <div className="relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block flex items-center gap-2">
                   Description {isScanning && <Sparkles size={12} className="text-emerald-500 animate-bounce"/>}
                </label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Costco, Home Depot" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-900 focus:border-emerald-500 outline-none transition-all" required />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Amount ($)</label>
                    <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-2xl text-slate-900 focus:border-emerald-500 outline-none" required />
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Category</label>
                    <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-emerald-500 outline-none appearance-none">
                        {TAX_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                </div>
            </div>

            <button type="submit" disabled={isSaving || isScanning} className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-600 transition-all active:scale-95 disabled:bg-slate-200">
                {isSaving ? "SAVING..." : "CONFIRM & SAVE RECORD"}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}