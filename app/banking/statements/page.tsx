// app/banking/statements/page.tsx
"use client";
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { db, auth, storage } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'; // deleteObject ပါအောင် ထည့်ပါ
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

        const qAcc = query(collection(db, "chart_of_accounts"), where("uid", "==", user.uid));
        const accSnap = await getDocs(qAcc);
        setAccounts(accSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));

        return () => unsubscribeData();
      }
    });
    return () => unsubscribeAuth();
  }, [selectedYear]);

  // --- အသစ်: eStatement ဖျက်မည့် Function ---
  const handleDelete = async (id: string, fileUrl: string) => {
    if (!confirm("Are you sure you want to delete this statement record? This will not delete transactions already added to the ledger.")) return;

    try {
      // ၁။ Firestore က စာရင်းကို ဖျက်မယ်
      await deleteDoc(doc(db, "bank_statements", id));
      
      // ၂။ Storage ထဲက ဖိုင်ကို ဖျက်မယ် (Optional - storage နေရာသက်သာအောင်)
      try {
        const fileRef = ref(storage, fileUrl);
        await deleteObject(fileRef);
      } catch (e) { console.error("Storage delete failed, might be already gone."); }

      alert("Statement deleted!");
    } catch (err) {
      alert("Delete failed.");
    }
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (files.length === 0 || !accName || isUploading || !user) return;
    
    setIsUploading(true);
    try {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      for (const file of files) {
        const storagePath = `statements/${user.uid}/${selectedYear}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, file);
        const fileUrl = await getDownloadURL(storageRef);

        const dateMatch = file.name.match(/(\d{4})-(\d{2})-(\d{2})/);
        let periodDisplay = "N/A";
        if (dateMatch) {
          const monthIndex = parseInt(dateMatch[2]) - 1;
          periodDisplay = `${monthNames[monthIndex]} ${dateMatch[1]}`;
        } else {
          periodDisplay = file.name.split(/[-_ ]/)[0];
        }

        await addDoc(collection(db, "bank_statements"), {
          accountName: accName,
          period: periodDisplay,
          fileUrl: fileUrl,
          storagePath: storagePath, // ဖျက်တဲ့အခါ သုံးဖို့ သိမ်းထားမယ်
          fileName: file.name,
          uid: user.uid,
          createdAt: serverTimestamp()
        });
      }
      setFiles([]);
      alert(`Success! Statements uploaded.`);
    } catch (err) {
      alert("Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const syncWithAI = async (statementId: string, fileUrl: string, account: string) => {
    const confirmSync = confirm(`AI will read this PDF and sync to [${account}]. Continue?`);
    if (!confirmSync) return;

    setIsSyncing(statementId);
    try {
        const response = await fetch(fileUrl);
        const blob = await response.blob();
        
        // --- အရေးကြီးသည်: Vercel Request Body Size စစ်ဆေးခြင်း ---
        if (blob.size > 3 * 1024 * 1024) { // 3MB ထက် ကြီးရင် တားမယ် (Base64 ပြောင်းရင် ပိုကြီးလာမှာမို့လို့ပါ)
            throw new Error("File is too large for Vercel Serverless (Max 4.5MB). Please compress the PDF further.");
        }

        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
            const base64data = (reader.result as string).split(',')[1];
            
            const apiRes = await fetch('/api/extract-statement', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pdfBase64: base64data })
            });

            const result = await apiRes.json();
            if (!apiRes.ok) throw new Error(result.error || "AI Failed");

            for (const t of result) {
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
            alert(`Added ${result.length} transactions!`);
            setIsSyncing(null);
        };
    } catch (err: any) {
        alert(err.message);
        setIsSyncing(null);
    }
  };

  return (
    <Layout>
      <div className="pt-6 pb-40 max-w-6xl mx-auto px-4">
        {/* Header & Bulk Form Area (အရင်အတိုင်းပဲမို့လို့ အောက်က list အပိုင်းကိုပဲ အဓိကပြပါမယ်) */}
        
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

        {/* --- Bulk Upload Form (အရင်အတိုင်း) --- */}
        <div className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-2xl border-2 border-slate-50 mb-16 relative">
          <form onSubmit={handleBulkUpload} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-2">Bank Account</label>
                    <select value={accName} onChange={e => setAccName(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-slate-900 focus:border-emerald-500 outline-none appearance-none">
                      {accounts.map(acc => <option key={acc.id} value={acc.name}>{acc.name}</option>)}
                      {accounts.length === 0 && <option value="">No Accounts</option>}
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-2">Select PDFs</label>
                    <label className="w-full cursor-pointer bg-emerald-50 border-2 border-dashed border-emerald-200 p-5 rounded-3xl flex items-center justify-center gap-3">
                        <UploadCloud size={24} className="text-emerald-500" />
                        <span className="font-black text-emerald-700 uppercase text-sm">{files.length > 0 ? `${files.length} Files` : 'Upload'}</span>
                        <input type="file" multiple accept=".pdf" onChange={e => setFiles(Array.from(e.target.files || []))} className="hidden" />
                    </label>
                </div>
            </div>
            <button type="submit" disabled={isUploading || files.length === 0} className="w-full bg-slate-900 text-white p-6 rounded-[2rem] font-black uppercase shadow-xl hover:bg-emerald-600 transition active:scale-95 disabled:bg-slate-100">
                {isUploading ? "UPLOADING..." : "START BULK UPLOAD"}
            </button>
          </form>
        </div>

        {/* --- Statements List With DELETE Button --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
             <p className="col-span-full text-center animate-pulse font-black">Syncing...</p>
          ) : statements.map(s => (
            <div key={s.id} className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-50 shadow-lg flex flex-col justify-between group hover:border-emerald-500 transition-all min-h-[220px] relative">
                <div className="flex items-start justify-between">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400"><FileText size={24}/></div>
                    <div className="flex gap-2">
                        <a href={s.fileUrl} target="_blank" rel="noreferrer" className="p-3 bg-slate-100 text-slate-400 rounded-2xl hover:bg-slate-900 hover:text-white transition"><ExternalLink size={18}/></a>
                        {/* --- DELETE BUTTON --- */}
                        <button onClick={() => handleDelete(s.id, s.fileUrl)} className="p-3 bg-rose-50 text-rose-300 rounded-2xl hover:bg-rose-600 hover:text-white transition shadow-sm"><Trash2 size={18}/></button>
                    </div>
                </div>
                <div>
                    <p className="font-black text-slate-900 text-lg leading-tight truncate pr-4">{s.accountName}</p>
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1 mb-4">{s.period}</p>
                    
                    <button 
                        onClick={() => syncWithAI(s.id, s.fileUrl, s.accountName)}
                        disabled={isSyncing === s.id}
                        className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl font-black text-[10px] shadow-lg hover:bg-slate-900 transition-all uppercase"
                    >
                        {isSyncing === s.id ? "PROCESSING..." : "AI Sync to Ledger"}
                    </button>
                </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}