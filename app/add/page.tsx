// app/add/page.tsx
"use client";
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { TAX_CATEGORIES } from '@/lib/constants';
import { db, auth, storage } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore'; 
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Camera, Loader2, Calendar as CalendarIcon, Landmark, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Account {
  id: string;
  name: string;
  type: string;
  uid: string;
}

export default function AddTransaction() {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('other');
  const [bankAccount, setBankAccount] = useState(''); 
  const [transDate, setTransDate] = useState(new Date().toISOString().split('T')[0]); 
  const [accounts, setAccounts] = useState<Account[]>([]); 
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
          const accs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
          setAccounts(accs);
          if (accs.length > 0) setBankAccount(accs[0].name);
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
        bankAccount,
        transactionDate: new Date(transDate),
        date: serverTimestamp(),
        uid: user.uid,
        verified: false
      });
      // window.location.href = "/";
      router.push("/");
      router.refresh();
    } catch (error: any) {
      console.error(error);
      alert("Error: " + error.message);
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      {/* Container ကို max-w-6xl သို့ တိုးချဲ့လိုက်ပါသည် */}
      <div className="max-w-6xl mx-auto pt-6 px-4 pb-40">
        <h2 className="text-3xl font-black mb-8 text-slate-900 tracking-tighter uppercase italic lg:text-left text-center">
            Add Record
        </h2>
        
        {/* Desktop တွင် ၂-ကော်လံ၊ Mobile တွင် ၁-ကော်လံ ဖြစ်စေရန် grid သုံးပါသည် */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* ဘယ်ဘက်ခြမ်း: Photo Upload Area */}
          <div className="space-y-4">
            <label className="relative h-64 lg:h-[540px] border-4 border-dashed border-slate-200 rounded-[3rem] bg-white overflow-hidden flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 transition-all shadow-sm group">
                {preview ? (
                    <img src={preview} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="receipt preview" />
                ) : (
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-3 shadow-inner group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
                            <Camera size={32} />
                        </div>
                        <p className="font-black text-slate-400 uppercase text-xs tracking-widest">Snap Receipt Photo</p>
                    </div>
                )}
                <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
            </label>
            {preview && (
                 <p className="text-center text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center justify-center gap-2">
                    <CheckCircle2 size={14}/> Image Loaded & Compressed
                 </p>
            )}
          </div>

          {/* ညာဘက်ခြမ်း: Data Input Fields Area */}
          <div className="bg-white p-8 lg:p-10 rounded-[2.5rem] shadow-2xl border border-slate-50 space-y-6">
            
            {/* Merchant Name */}
            <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-2">Merchant Name / Description</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Costco, Shell Gas" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-900 focus:border-emerald-500 outline-none transition-all text-lg" required />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Amount */}
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-2">Amount ($)</label>
                    <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-2xl text-slate-900 focus:border-emerald-500 outline-none" required />
                </div>
                {/* Transaction Date Picker */}
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-2 flex items-center gap-2">
                        <CalendarIcon size={14} className="text-emerald-500" /> Date of Purchase
                    </label>
                    <input type="date" value={transDate} onChange={e => setTransDate(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 focus:border-emerald-500 outline-none" required />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category Section */}
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-4">Category</label>
                    <select 
                        value={category} 
                        onChange={e => setCategory(e.target.value)} 
                        className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 focus:border-emerald-500 outline-none appearance-none transition-all"
                    >
                        {TAX_CATEGORIES.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>
                </div>

                {/* Paid From Section */}
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-4 flex items-center gap-2">
                        <Landmark size={14} className="text-emerald-500" /> Paid From (Account)
                    </label>
                    <select 
                        value={bankAccount} 
                        onChange={e => setBankAccount(e.target.value)} 
                        className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 focus:border-emerald-500 outline-none appearance-none transition-all"
                    >
                        {accounts.length > 0 ? (
                            accounts.map(acc => <option key={acc.id} value={acc.name}>{acc.name}</option>)
                        ) : (
                            <option value="">No Accounts Found</option>
                        )}
                        <option value="Cash/Other">Cash / Other</option>
                    </select>
                </div>
            </div>

            {/* Tax Prep Info Box */}
            {category && (
                <div className="p-5 bg-emerald-50 border-l-8 border-emerald-400 rounded-2xl animate-in fade-in slide-in-from-top-2">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest italic mb-2">
                    Tax Prep: {TAX_CATEGORIES.find(c => c.value === category)?.line}
                    </p>
                    <p className="text-xs font-bold text-slate-600 leading-relaxed">
                    {TAX_CATEGORIES.find(c => c.value === category)?.info}
                    </p>
                </div>
            )}

            <button type="submit" disabled={isSaving} className="w-full bg-slate-900 text-white p-6 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-600 transition-all active:scale-95 disabled:bg-slate-200">
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