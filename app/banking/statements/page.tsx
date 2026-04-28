// app/banking/statements/page.tsx
"use client";
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { db, auth, storage } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { UploadCloud, FileText, Download, Loader2, ChevronDown, ExternalLink, CheckCircle2, Files, Sparkles, Trash2 } from 'lucide-react';

export default function BankStatements() {
  const [statements, setStatements] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [accName, setAccName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2024 + 2 }, (_, i) => 2024 + i);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // ၁။ Statements ဆွဲထုတ်ခြင်း
        const start = new Date(selectedYear, 0, 1);
        const end = new Date(selectedYear, 11, 31, 23, 59, 59);
        const q = query(collection(db, "bank_statements"), where("uid", "==", user.uid), where("createdAt", ">=", start), where("createdAt", "<=", end), orderBy("createdAt", "desc"));
        onSnapshot(q, (snap) => {
          setStatements(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setLoading(false);
        });

        // ၂။ ဘဏ်အကောင့်များ ဆွဲထုတ်ခြင်း
        const qAcc = query(collection(db, "chart_of_accounts"), where("uid", "==", user.uid));
        const accSnap = await getDocs(qAcc);
        const accList = accSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        setAccounts(accList);
        
        // အရေးကြီးသည်: အကောင့်ရှိလျှင် တန်ဖိုးကို ချက်ချင်း Set လုပ်ပေးပါမည်
        if (accList.length > 0 && !accName) {
            setAccName(accList[0].name);
        }
      }
    });
    return () => unsubscribeAuth();
  }, [selectedYear]);

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    
    // Logic စစ်ဆေးချက် (Debug လုပ်ရန်)
    console.log("Starting Upload for:", accName, "Files:", files.length);

    if (files.length === 0 || isUploading || !user) return;
    
    setIsUploading(true);
    try {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      for (const file of files) {
        const path = `statements/${user.uid}/${selectedYear}/${Date.now()}_${file.name}`;
        const sRef = ref(storage, path);
        await uploadBytes(sRef, file);
        const url = await getDownloadURL(sRef);

        const dateMatch = file.name.match(/(\d{4})-(\d{2})-(\d{2})/);
        let period = dateMatch ? `${monthNames[parseInt(dateMatch[2])-1]} ${dateMatch[1]}` : file.name.split('_')[0];

        await addDoc(collection(db, "bank_statements"), {
          accountName: accName || "Other Account", // Default တန်ဖိုးထည့်ထားပါမည်
          period, fileUrl: url, storagePath: path, uid: user.uid, createdAt: serverTimestamp()
        });
      }
      setFiles([]); 
      alert("Success! Statements Uploaded.");
    } catch (err) { 
      alert("Upload failed. Please try again."); 
    } finally { 
      setIsUploading(false); // အမှားတက်တက်၊ အောင်မြင်မြင် ခလုတ်ကို ပြန်ဖွင့်ပေးပါမည်
    }
  };

  // ... (syncWithAI နဲ့ handleDelete logic တွေက အရင်အတိုင်းပဲမို့လို့ ချန်ခဲ့ပါမယ်) ...

  return (
    <Layout>
      <div className="pt-6 pb-40 max-w-6xl mx-auto px-4">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-10">
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">eStatements</h2>
            <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-black text-xs outline-none shadow-lg">
                {years.reverse().map(y => <option key={y} value={y}>{y} ARCHIVE</option>)}
            </select>
        </div>

        {/* Upload Form Box */}
        <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-2xl border-2 border-slate-50 mb-16">
          <form onSubmit={handleBulkUpload} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                {/* Account Selection */}
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-2">Select Account</label>
                    <select 
                        value={accName} 
                        onChange={e => setAccName(e.target.value)} 
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-900 focus:border-emerald-500 outline-none"
                    >
                        {accounts.length > 0 ? (
                            accounts.map(acc => <option key={acc.id} value={acc.name}>{acc.name}</option>)
                        ) : (
                            <option value="">No Accounts Found</option>
                        )}
                        <option value="Cash/Other">Cash / Other</option>
                    </select>
                </div>

                {/* File Selection */}
                <label className="cursor-pointer bg-emerald-50 border-2 border-dashed border-emerald-200 p-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-emerald-100 transition-all">
                    <UploadCloud size={20} className="text-emerald-500" />
                    <span className="font-black text-emerald-700 uppercase text-xs">
                        {files.length > 0 ? `${files.length} FILES SELECTED` : 'SELECT PDFS'}
                    </span>
                    <input type="file" multiple accept=".pdf" onChange={e => setFiles(Array.from(e.target.files || []))} className="hidden" />
                </label>
            </div>

            {/* Upload Button */}
            <button 
                type="submit" 
                disabled={isUploading || files.length === 0} 
                className={`w-full p-5 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${
                    isUploading || files.length === 0 ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-[#0F172A] text-white hover:bg-emerald-600 shadow-emerald-100/50'
                }`}
            >
                {isUploading ? (
                    <><Loader2 className="animate-spin" size={20} /> UPLOADING TO CLOUD...</>
                ) : (
                    "UPLOAD STATEMENTS"
                )}
            </button>
          </form>
        </div>

        {/* ... (အောက်က List အပိုင်းတွေက အရင်အတိုင်းပဲမို့လို့ ချန်ခဲ့ပါမယ်) ... */}
        
      </div>
    </Layout>
  );
}