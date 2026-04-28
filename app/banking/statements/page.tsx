// app/banking/statements/page.tsx
"use client";
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { db, auth, storage } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, orderBy, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { UploadCloud, FileText, Download, Loader2, ChevronDown, ExternalLink, CheckCircle2, Files, Sparkles } from 'lucide-react';

export default function BankStatements() {
  interface Account {
    id: string;
    name: string;
    // တခြားပါတဲ့ field တွေရှိရင်လည်း ထည့်လို့ရပါတယ်
  }

  const [statements, setStatements] = useState<any[]>([]);
  // const [accounts, setAccounts] = useState<any[]>([]); 
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [accName, setAccName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncing, setIsSyncing] = useState<string | null>(null); // ဘယ်ဖိုင်ကို AI sync လုပ်နေလဲ သိဖို့
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2024 + 2 }, (_, i) => 2024 + i);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // ၁။ Statements စာရင်း ဆွဲထုတ်ခြင်း
        const startOfYear = new Date(selectedYear, 0, 1);
        const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59);
        const q = query(
          collection(db, "bank_statements"), 
          where("uid", "==", user.uid), 
          where("createdAt", ">=", startOfYear),
          where("createdAt", "<=", endOfYear),
          orderBy("createdAt", "desc")
        );
        const unsubscribeData = onSnapshot(q, (snap) => {
          setStatements(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setLoading(false);
        });

        // ၂။ ဘဏ်အကောင့်စာရင်း ဆွဲထုတ်ခြင်း (Dropdown မှာ ပြရန်)
        const qAcc = query(collection(db, "chart_of_accounts"), where("uid", "==", user.uid));
        const accSnap = await getDocs(qAcc);
        const accList = accSnap.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        } as Account));
        setAccounts(accList);
        if (accList.length > 0) setAccName(accList[0].name);

        return () => unsubscribeData();
      }
    });
    return () => unsubscribeAuth();
  }, [selectedYear]);

  // --- Bulk Upload Logic ---
  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (files.length === 0 || !accName || isUploading || !user) return;
    
    setIsUploading(true);
    try {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      for (const file of files) {
        const storageRef = ref(storage, `statements/${user.uid}/${selectedYear}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const fileUrl = await getDownloadURL(storageRef);

        const dateMatch = file.name.match(/(\d{4})-(\d{2})-(\d{2})/);
        let periodDisplay = "N/A";
        if (dateMatch) {
          const year = dateMatch[1];
          const monthIndex = parseInt(dateMatch[2]) - 1;
          periodDisplay = `${monthNames[monthIndex]} ${year}`;
        } else {
          periodDisplay = file.name.split(/[-_ ]/)[0];
        }

        await addDoc(collection(db, "bank_statements"), {
          accountName: accName,
          period: periodDisplay,
          fileUrl: fileUrl,
          fileName: file.name,
          uid: user.uid,
          createdAt: serverTimestamp()
        });
      }
      setFiles([]);
      alert(`Success! ${files.length} statements uploaded.`);
    } catch (err) {
      alert("Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  // --- AI Sync to Ledger Logic ---
  const syncWithAI = async (statementId: string, fileUrl: string, account: string) => {
    const confirmSync = confirm(`AI will now read this statement and add all transactions to your ledger under [${account}]. Proceed?`);
    if (!confirmSync) return;

    setIsSyncing(statementId);
    try {
        const response = await fetch(fileUrl);
        const blob = await response.blob();
        const reader = new FileReader();
        
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
            const base64data = (reader.result as string).split(',')[1];
            
            const apiRes = await fetch('/api/extract-statement', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pdfBase64: base64data })
            });

            if (!apiRes.ok) throw new Error("AI extraction failed");
            const transactions = await apiRes.json();

            for (const t of transactions) {
                await addDoc(collection(db, "transactions"), {
                    description: t.description,
                    amount: Math.abs(t.amount),
                    category: t.amount > 0 ? 'income' : (t.category || 'other'),
                    transactionDate: new Date(t.date),
                    date: serverTimestamp(),
                    uid: auth.currentUser?.uid,
                    verified: true,
                    bankAccount: account
                });
            }
            alert(`Successfully added ${transactions.length} records to your ledger!`);
            setIsSyncing(null);
        };
    } catch (err) {
        alert("AI process failed. Ensure the file is not too large.");
        setIsSyncing(null);
    }
  };

  return (
    <Layout>
      <div className="pt-6 pb-40 max-w-6xl mx-auto px-4">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">eStatements Center</h2>
                <div className="mt-4 relative inline-block">
                    <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="appearance-none bg-emerald-600 text-white px-6 py-2.5 pr-10 rounded-2xl font-black text-sm outline-none cursor-pointer shadow-xl"
                    >
                        {years.reverse().map(year => <option key={year} value={year}>{year} ARCHIVE</option>)}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-200 pointer-events-none" />
                </div>
            </div>
        </div>

        {/* --- Bulk Upload Form --- */}
        <div className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-2xl border-2 border-slate-50 mb-16 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5"><Files size={120}/></div>
          
          <h3 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tight">Bulk Upload statements</h3>
          
          <form onSubmit={handleBulkUpload} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-2">Selected Bank Account</label>
                    <select 
                      value={accName} 
                      onChange={e => setAccName(e.target.value)} 
                      className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-slate-900 focus:border-emerald-500 outline-none appearance-none cursor-pointer"
                    >
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.name}>{acc.name}</option>
                      ))}
                      {accounts.length === 0 && <option value="">No Accounts Found</option>}
                    </select>
                </div>
                
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-2">Files (PDF/Images)</label>
                    <label className="w-full cursor-pointer bg-emerald-50 border-2 border-dashed border-emerald-200 p-5 rounded-3xl flex items-center justify-center gap-3 hover:bg-emerald-100 transition shadow-inner text-center">
                        <UploadCloud size={24} className="text-emerald-500" />
                        <span className="font-black text-emerald-700 uppercase text-sm">
                            {files.length > 0 ? `${files.length} Files Selected` : 'Select Multiple Files'}
                        </span>
                        <input type="file" multiple accept=".pdf,.csv,.jpg,.png" onChange={e => setFiles(Array.from(e.target.files || []))} className="hidden" />
                    </label>
                </div>
            </div>

            <button type="submit" disabled={isUploading || files.length === 0} className="w-full bg-slate-900 text-white p-6 rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-600 transition active:scale-95 disabled:bg-slate-100 disabled:text-slate-300">
              {isUploading ? (
                <span className="flex items-center justify-center gap-3"><Loader2 className="animate-spin" /> UPLOADING TO STORAGE...</span>
              ) : "START CLOUD ARCHIVE"}
            </button>
          </form>
        </div>

        {/* --- Statements List --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
             <p className="col-span-full p-20 text-center font-black animate-pulse text-slate-300">SYNCING DOCUMENTS...</p>
          ) : statements.length === 0 ? (
            <div className="col-span-full bg-white p-20 rounded-[3rem] border-4 border-dashed border-slate-100 text-center text-slate-300 font-black italic uppercase">No records found</div>
          ) : (
            statements.map(s => (
              <div key={s.id} className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-50 shadow-lg flex flex-col justify-between group hover:border-emerald-500 transition-all min-h-[220px]">
                <div className="flex items-start justify-between">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition shadow-inner"><FileText size={24}/></div>
                    <div className="flex gap-2">
                        <a href={s.fileUrl} target="_blank" rel="noreferrer" className="p-3 bg-slate-100 text-slate-400 rounded-2xl hover:bg-slate-900 hover:text-white transition" title="View PDF"><ExternalLink size={18}/></a>
                    </div>
                </div>
                <div>
                    <p className="font-black text-slate-900 text-lg leading-tight truncate pr-4">{s.accountName}</p>
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1 flex items-center gap-2 mb-4">
                        <CheckCircle2 size={12}/> {s.period}
                    </p>
                    
                    {/* AI SYNC BUTTON */}
                    <button 
                        onClick={() => syncWithAI(s.id, s.fileUrl, s.accountName)}
                        disabled={isSyncing === s.id}
                        className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl font-black text-[10px] shadow-lg hover:bg-slate-900 transition-all uppercase active:scale-95 disabled:bg-slate-200"
                    >
                        {isSyncing === s.id ? (
                            <><Loader2 size={12} className="animate-spin" /> AI PROCESSING...</>
                        ) : (
                            <><Sparkles size={12}/> AI Sync to Ledger</>
                        )}
                    </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}