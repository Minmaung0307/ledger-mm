// app/add/page.tsx
"use client";
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { TAX_CATEGORIES } from '@/lib/constants';
import { db, auth, storage } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore'; // getDocs, query, where ထပ်တိုးထားပါတယ်
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Camera, Loader2, Calendar as CalendarIcon, Landmark } from 'lucide-react';

interface Account {
  id: string;
  name: string;
  type: string;
  uid: string;
}

export default function AddTransaction() {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('other');
  
  // --- New States ---
  const [bankAccount, setBankAccount] = useState(''); // Paid From
  const [transDate, setTransDate] = useState(new Date().toISOString().split('T')[0]); // Transaction Date (Default Today)
  const [accounts, setAccounts] = useState<Account[]>([]); // ဘဏ်အကောင့်စာရင်း
  
  const [preview, setPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const q = query(collection(db, "chart_of_accounts"), where("uid", "==", u.uid));
          const snap = await getDocs(q);
          
          const accs = snap.docs.map(doc => ({ 
              id: doc.id, 
              ...doc.data() 
          } as Account));

          // ၁။ ရလာတဲ့ အကောင့်တွေကို State ထဲ ထည့်မယ် (ဒါဆိုရင် accs က အရောင်တောက်လာပါပြီ)
          setAccounts(accs);

          // ၂။ အကောင့်ရှိလျှင် ပထမဆုံးတစ်ခုကို Default အနေနဲ့ Dropdown မှာ ရွေးထားမယ်
          if (accs.length > 0) {
            setBankAccount(accs[0].name);
          }
          
        } catch (err) {
          console.error("Error fetching accounts:", err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const base64ToBlob = (base64: string) => {
    const byteString = atob(base64.split(',')[1]);
    const mimeString = base64.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    return new Blob([ab], { type: mimeString });
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
          const MAX_WIDTH = 1000;
          let width = img.width; let height = img.height;
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.4));
        };
      };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    const compressedData = await compressImage(selectedFile);
    setPreview(compressedData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSaving) return;
    setIsSaving(true);

    try {
      let receiptUrl = "";
      if (preview) {
        const currentYear = new Date().getFullYear();
        const storageRef = ref(storage, `receipts/${user.uid}/${currentYear}/${Date.now()}.jpg`);
        const blob = base64ToBlob(preview);
        await uploadBytes(storageRef, blob);
        receiptUrl = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, "transactions"), {
        description,
        amount: parseFloat(amount),
        category,
        receiptUrl,
        bankAccount, // သိမ်းမည့် ဘဏ်အကောင့်
        transactionDate: new Date(transDate), // အမှန်တကယ်သုံးစွဲသည့်နေ့
        date: serverTimestamp(), // စာရင်းသွင်းသည့်နေ့ (System Record)
        uid: user.uid,
        verified: false
      });
      window.location.href = "/";
    } catch (error: any) {
      console.error(error);
      alert("Error: " + error.message);
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-xl mx-auto pt-6 px-4 pb-40">
        <h2 className="text-3xl font-black mb-8 text-slate-900 tracking-tighter uppercase italic">Add Record</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo Area */}
          <label className="relative h-64 border-4 border-dashed border-slate-200 rounded-[3rem] bg-white overflow-hidden flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 transition-all shadow-sm">
            {preview ? (
                <img src={preview} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="p" />
            ) : (
                <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-3 shadow-inner"><Camera size={32} /></div>
                    <p className="font-black text-slate-400 uppercase text-xs tracking-widest">Snap Receipt Photo</p>
                </div>
            )}
            <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
          </label>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-50 space-y-6">
            {/* Merchant Name */}
            <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Merchant Name / Description</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Costco, Shell Gas" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-900 focus:border-emerald-500 outline-none transition-all" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Amount */}
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Amount ($)</label>
                    <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-2xl text-slate-900 focus:border-emerald-500 outline-none" required />
                </div>
                {/* Transaction Date Picker */}
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Date of Purchase</label>
                    <input type="date" value={transDate} onChange={e => setTransDate(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 focus:border-emerald-500 outline-none appearance-none" required />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category */}
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Category</label>
                    <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold appearance-none outline-none focus:border-emerald-500">
                        {TAX_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                </div>
                {/* Bank Account Selector */}
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Paid From (Account)</label>
                    <select value={bankAccount} onChange={e => setBankAccount(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold appearance-none outline-none focus:border-emerald-500">
                        {accounts.length > 0 ? (
                            accounts.map(acc => <option key={acc.id} value={acc.name}>{acc.name}</option>)
                        ) : (
                            <option value="">No Accounts Found</option>
                        )}
                        <option value="Cash/Other">Cash / Other</option>
                    </select>
                </div>
            </div>

            <button type="submit" disabled={isSaving} className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-600 transition-all active:scale-95 disabled:bg-slate-200">
                {isSaving ? (
                    <span className="flex items-center justify-center gap-2"><Loader2 className="animate-spin" /> SAVING...</span>
                ) : "CONFIRM & SAVE RECORD"}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}