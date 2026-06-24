// app/add/page.tsx
"use client";
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { TAX_CATEGORIES } from '@/lib/constants';
import { db, auth, storage } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy } from 'firebase/firestore'; 
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Camera, Loader2, Calendar as CalendarIcon, Landmark, CheckCircle2, Sparkles, HelpCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Account { id: string; name: string; type: string; uid: string; }
interface MerchantHistory { name: string; lastAmount: string; lastCategory: string; }

export default function AddTransaction() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  // Form States
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('other');
  const [bankAccount, setBankAccount] = useState(''); 
  const [transDate, setTransDate] = useState(new Date().toISOString().split('T')[0]); 
  const [isRecurring, setIsRecurring] = useState(false);
  
  // Data States
  const [accounts, setAccounts] = useState<Account[]>([]); 
  const [suggestions, setSuggestions] = useState<MerchantHistory[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<MerchantHistory[]>([]); 
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          // ၁။ ဘဏ်အကောင့်များ ဆွဲထုတ်ခြင်း
          const qAcc = query(collection(db, "chart_of_accounts"), where("uid", "==", u.uid));
          const accSnap = await getDocs(qAcc);
          const accList = accSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
          setAccounts(accList);
          if (accList.length > 0) setBankAccount(accList[0].name);

          // ၂။ စာရင်းဟောင်းများမှ Smart Fill အတွက် Data ဆွဲယူခြင်း
          const transSnap = await getDocs(query(collection(db, "transactions"), where("uid", "==", u.uid), orderBy("date", "desc")));
          const historyMap: Record<string, MerchantHistory> = {};
          transSnap.docs.forEach(doc => {
            const d = doc.data();
            if (!historyMap[d.description]) {
              historyMap[d.description] = { name: d.description, lastAmount: d.amount.toString(), lastCategory: d.category };
            }
          });
          setSuggestions(Object.values(historyMap));
        } catch (err) { console.error(err); }
      }
    });
    return () => unsubscribe();
  }, []);

  // Image Compression (Free Plan & Storage အဆင်ပြေစေရန်)
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

  // --- ပုံရွေးလိုက်တာနဲ့ ချက်ချင်းပြသပြီး AI ခေါ်တာမျိုး မလုပ်တော့ပါ ---
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; 
    if (f) {
      const compressed = await compressImage(f);
      setPreview(compressed);
    }
  };

  const selectSuggestion = (m: MerchantHistory) => {
    setDescription(m.name); setAmount(m.lastAmount); setCategory(m.lastCategory); setShowSuggestions(false);
  };

  // သိမ်းဆည်းသည့် Logic
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSaving) return;
    setIsSaving(true);
    try {
      let receiptUrl = "";
      if (preview) {
        const storageRef = ref(storage, `receipts/${user.uid}/${new Date().getFullYear()}/${Date.now()}.jpg`);
        await uploadBytes(storageRef, base64ToBlob(preview));
        receiptUrl = await getDownloadURL(storageRef);
      }
      const baseData = {
        description, amount: parseFloat(amount), category, receiptUrl, bankAccount,
        uid: user.uid, verified: false, date: serverTimestamp(),
      };
      if (isRecurring) {
        const startDate = new Date(transDate);
        const promises = [];
        for (let m = startDate.getMonth(); m <= 11; m++) {
            const nextDate = new Date(startDate.getFullYear(), m, startDate.getDate());
            promises.push(addDoc(collection(db, "transactions"), {
                ...baseData, transactionDate: nextDate,
                description: `${description} (${nextDate.toLocaleString('default', { month: 'short' })})`
            }));
        }
        await Promise.all(promises);
      } else {
        await addDoc(collection(db, "transactions"), { ...baseData, transactionDate: new Date(transDate) });
      }
      router.push("/");
      router.refresh();
    } catch (error: any) { alert("Error: " + error.message); setIsSaving(false); }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto pt-6 px-4 pb-40">
        <h2 className="text-4xl font-black mb-10 text-slate-900 dark:text-white tracking-tighter uppercase italic lg:text-left text-center">Add Record</h2>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-start">
          <div className="lg:col-span-2 space-y-4">
            <label className="relative h-64 lg:h-[550px] border-4 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] bg-white dark:bg-slate-900 overflow-hidden flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 transition-all shadow-sm group active:scale-95">
                {preview ? <img src={preview} className="absolute inset-0 w-full h-full object-cover" alt="p" /> : (
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-3 shadow-inner group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors"><Camera size={40} /></div>
                    <p className="font-black text-slate-400 uppercase text-xs tracking-widest">Snap Receipt Photo</p>
                  </div>
                )}
                <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
            </label>
            {preview && <p className="text-center text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center justify-center gap-2 animate-pulse"><CheckCircle2 size={14}/> Image Ready for Sync</p>}
          </div>

          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white dark:bg-slate-800 p-8 lg:p-12 rounded-[3.5rem] shadow-2xl border border-slate-50 dark:border-slate-700 space-y-8 relative">
              <div className="relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-2 flex items-center gap-2">Merchant Name / Description</label>
                <input type="text" value={description} onChange={e => {
                    setDescription(e.target.value);
                    if (e.target.value.length > 1) {
                        setFilteredSuggestions(suggestions.filter(m => m.name.toLowerCase().includes(e.target.value.toLowerCase())));
                        setShowSuggestions(true);
                    } else { setShowSuggestions(false); }
                }} onFocus={() => description.length > 1 && setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} placeholder="Enter name..." className="w-full p-5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-all text-xl" required />
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[2rem] shadow-2xl overflow-hidden">
                    {filteredSuggestions.slice(0, 5).map((m, i) => (
                      <button key={i} type="button" onClick={() => selectSuggestion(m)} className="w-full text-left p-5 hover:bg-emerald-50 dark:hover:bg-slate-700 font-bold text-slate-700 dark:text-slate-300 border-b last:border-0 border-slate-50 dark:border-slate-700 flex justify-between items-center"><span className="truncate">{m.name}</span><span className="text-[9px] font-black opacity-50 uppercase tracking-widest">Fill: ${m.lastAmount}</span></button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-2">Amount ($)</label><input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full p-5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-3xl text-slate-900 dark:text-white focus:border-emerald-500 outline-none" required /></div>
                <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-2 flex items-center gap-2"><CalendarIcon size={14} className="text-emerald-500" /> Date</label><input type="date" value={transDate} onChange={e => setTransDate(e.target.value)} className="w-full p-5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white focus:border-emerald-500 outline-none" required /></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-4">Category</label><select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white outline-none appearance-none cursor-pointer">{TAX_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
                <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-4 flex items-center gap-2"><Landmark size={14} className="text-emerald-500" /> Paid From</label><select value={bankAccount} onChange={e => setBankAccount(e.target.value)} className="w-full p-5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white outline-none appearance-none cursor-pointer">{accounts.map(acc => <option key={acc.id} value={acc.name}>{acc.name}</option>)}<option value="Cash/Other">Cash / Other</option></select></div>
              </div>

              <div className="flex items-center gap-4 p-5 bg-emerald-50 dark:bg-emerald-950/20 rounded-3xl border-2 border-emerald-100 dark:border-emerald-900/50">
                  <input type="checkbox" id="rec" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} className="w-6 h-6 accent-emerald-600 cursor-pointer shadow-md" />
                  <label htmlFor="rec" className="text-xs font-black text-emerald-800 dark:text-emerald-400 cursor-pointer uppercase tracking-tighter italic">Repeat monthly until Dec {new Date(transDate).getFullYear()}?</label>
              </div>

              {category === 'retirement_plans' && (
                <div className="mt-4 p-6 bg-indigo-50 dark:bg-indigo-900/20 border-l-8 border-indigo-500 rounded-[2rem] animate-in fade-in zoom-in shadow-sm"><div className="flex items-start gap-3"><div className="bg-indigo-500 text-white p-2 rounded-full flex-shrink-0 animate-pulse"><HelpCircle size={20} /></div><div><h4 className="font-black text-indigo-900 dark:text-indigo-300 uppercase text-xs tracking-widest mb-1">Why 401(k)?</h4><p className="text-sm font-bold text-indigo-700 dark:text-indigo-400 leading-relaxed">{TAX_CATEGORIES.find(c => c.value === 'retirement_plans')?.tip}</p></div></div></div>
              )}

              <button type="submit" disabled={isSaving} className="w-full bg-slate-900 dark:bg-emerald-600 text-white p-7 rounded-[2rem] font-black uppercase tracking-[0.3em] shadow-xl hover:bg-emerald-600 dark:hover:bg-slate-900 transition-all active:scale-95 disabled:bg-slate-200">
                  {isSaving ? <Loader2 className="animate-spin mx-auto" /> : "CONFIRM & SAVE RECORD"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}