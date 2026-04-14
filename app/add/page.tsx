// app/add/page.tsx
"use client";
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { TAX_CATEGORIES } from '@/lib/constants';
import { db, auth, storage } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Camera, Loader2, Sparkles, AlertCircle } from 'lucide-react';

export default function AddTransaction() {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('other');
  const [preview, setPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  const base64ToBlob = (base64: string) => {
    const byteString = atob(base64.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    return new Blob([ab], { type: 'image/jpeg' });
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800; // ဆိုဒ်ပိုကျုံ့လိုက်မယ် 500 error မတက်အောင်
          let width = img.width; let height = img.height;
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.5));
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

      const response = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: compressedData }),
      });
      
      const data = await response.json();
      if (data.merchant) {
        setDescription(data.merchant);
        setAmount(data.amount.toString());
        if (TAX_CATEGORIES.some(c => c.value === data.category)) setCategory(data.category);
      } else {
        alert("AI couldn't read details. Please type manually.");
      }
    } catch (err) {
      alert("Scan Error. Please enter details manually.");
    } finally {
      setIsScanning(false); // ဘာဖြစ်ဖြစ် loading ပိတ်မယ်
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
        await uploadBytes(storageRef, base64ToBlob(preview));
        receiptUrl = await getDownloadURL(storageRef);
      }
      await addDoc(collection(db, "transactions"), {
        description, amount: parseFloat(amount), category, receiptUrl,
        date: serverTimestamp(), uid: user.uid,
      });
      window.location.href = "/";
    } catch (error) {
      alert("Save Failed.");
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-xl mx-auto pt-6 px-4 pb-40">
        <h2 className="text-3xl font-black mb-8 text-slate-900 tracking-tighter uppercase italic">Add Record</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <label className="relative h-64 border-4 border-dashed border-slate-200 rounded-[3rem] bg-white overflow-hidden flex flex-col items-center justify-center cursor-pointer shadow-sm group">
            {preview && <img src={preview} className="absolute inset-0 w-full h-full object-cover opacity-30" alt="p" />}
            <div className="relative z-10 flex flex-col items-center text-center">
                {isScanning ? <Loader2 size={48} className="text-emerald-500 animate-spin mb-3" /> : <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white mb-3 shadow-xl"><Camera size={32} /></div>}
                <p className="font-black text-slate-900">{isScanning ? "AI IS READING..." : "SNAP OR UPLOAD"}</p>
            </div>
            <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
          </label>

          <div className={`bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-50 space-y-6 ${isScanning ? 'opacity-50' : 'opacity-100'}`}>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Merchant Name" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-900 focus:border-emerald-500 outline-none" required />
            <div className="grid grid-cols-2 gap-4">
                <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-2xl text-slate-900 focus:border-emerald-500 outline-none" required />
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold appearance-none outline-none">
                    {TAX_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
            </div>
            <button type="submit" disabled={isSaving || isScanning} className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase shadow-xl hover:bg-emerald-600 transition active:scale-95 disabled:bg-slate-200">
                {isSaving ? "SAVING..." : "CONFIRM & SAVE"}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}