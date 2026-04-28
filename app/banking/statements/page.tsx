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
        // ရွေးချယ်ထားသော နှစ်၏ Range သတ်မှတ်ခြင်း
        const start = new Date(selectedYear, 0, 1);
        const end = new Date(selectedYear, 11, 31, 23, 59, 59);

        const q = query(
          collection(db, "bank_statements"), 
          where("uid", "==", user.uid), 
          where("createdAt", ">=", start),
          where("createdAt", "<=", end),
          orderBy("createdAt", "desc")
        );

        const unsubscribeData = onSnapshot(q, (snap) => {
          const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          console.log("Found Documents:", docs.length); // Debug အတွက် ထည့်ထားပါသည်
          setStatements(docs);
          setLoading(false);
        }, (error) => {
          // --- အကယ်၍ Index မရှိလျှင် ဤနေရာတွင် Link ပြပါလိမ့်မည် ---
          console.error("Firestore Listen Error:", error);
          if (error.message.includes("requires an index")) {
              alert("Firebase Index ဆောက်ရန် လိုအပ်နေပါသည်။ Browser Console (F12) တွင် Link ကို နှိပ်ပေးပါ။");
          }
          setLoading(false);
        });

        // ဘဏ်အကောင့်စာရင်း ဆွဲထုတ်ခြင်း
        const qAcc = query(collection(db, "chart_of_accounts"), where("uid", "==", user.uid));
        const accSnap = await getDocs(qAcc);
        setAccounts(accSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));

        return () => unsubscribeData();
      }
    });
    return () => unsubscribeAuth();
  }, [selectedYear]);

  // --- ပြင်ဆင်လိုက်သော အပိုင်း: handleBulkUpload ကို onClick ဖြင့် တိုက်ရိုက်ခေါ်ခြင်း ---
  const handleBulkUpload = async () => {
    const user = auth.currentUser;
    
    // Debug အတွက် Console မှာ ကြည့်ရန်
    console.log("Upload Button Triggered");
    console.log("Files:", files.length, "Account:", accName);

    if (files.length === 0) {
      alert("Please select files first!");
      return;
    }
    if (!accName) {
      alert("Please select an account!");
      return;
    }
    if (isUploading || !user) return;
    
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
          accountName: accName,
          period, fileUrl: url, storagePath: path, uid: user.uid, createdAt: serverTimestamp()
        });
      }
      setFiles([]); 
      alert("All statements uploaded successfully!");
    } catch (err) { 
      alert("Error: Some files failed to upload."); 
    } finally { 
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, storagePath: string) => {
    if (!confirm("Are you sure you want to delete this statement?")) return;
    try {
      await deleteDoc(doc(db, "bank_statements", id));
      if (storagePath) {
        const fileRef = ref(storage, storagePath);
        await deleteObject(fileRef).catch(() => {});
      }
      alert("Deleted!");
    } catch (err) { alert("Delete failed"); }
  };

  const syncWithAI = async (statementId: string, fileUrl: string, account: string) => {
    const confirmSync = confirm(`AI will now sync this statement to [${account}]. Continue?`);
    if (!confirmSync) return;

    setIsSyncing(statementId);
    try {
        // PDF ကို ပို့မယ့်အစား URL ကိုပဲ ပို့လိုက်ပါမယ် (ပိုမြန်ပြီး 500 error ကင်းစေပါတယ်)
        const apiRes = await fetch('/api/extract-statement', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileUrl: fileUrl }) 
        });

        if (!apiRes.ok) {
            const errData = await apiRes.json();
            throw new Error(errData.details || "AI Timeout or Error");
        }

        const transactions = await apiRes.json();

        // Database ထဲ တစ်ခုချင်းစီ သွင်းမယ်
        for (const t of transactions) {
            await addDoc(collection(db, "transactions"), {
                description: t.description,
                amount: Math.abs(t.amount),
                category: t.amount > 0 ? 'income' : 'other',
                transactionDate: new Date(t.date),
                date: serverTimestamp(),
                uid: auth.currentUser?.uid,
                verified: true,
                bankAccount: account
            });
        }
        alert(`Success! Added ${transactions.length} records to Ledger.`);
    } catch (err: any) {
        alert("AI Sync Error: " + err.message);
    } finally {
        setIsSyncing(null);
    }
  };

  return (
    <Layout>
      <div className="pt-6 pb-40 max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">eStatements</h2>
            <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-black text-xs outline-none shadow-lg">
                {years.reverse().map(y => <option key={y} value={y}>{y} ARCHIVE</option>)}
            </select>
        </div>

        {/* --- ပြင်ဆင်လိုက်သော Upload Box: Form မဟုတ်ဘဲ Div ဖြစ်သွားပါသည် --- */}
        <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-2xl border-2 border-slate-50 mb-16">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-2">Select Account</label>
                    <select 
                        value={accName} 
                        onChange={e => setAccName(e.target.value)} 
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-900 focus:border-emerald-500 outline-none appearance-none"
                    >
                        {accounts.map(acc => <option key={acc.id} value={acc.name}>{acc.name}</option>)}
                        <option value="Cash/Other">Cash / Other</option>
                    </select>
                </div>

                <label className="cursor-pointer bg-emerald-50 border-2 border-dashed border-emerald-200 p-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-emerald-100 transition-all">
                    <UploadCloud size={20} className="text-emerald-500" />
                    <span className="font-black text-emerald-700 uppercase text-xs">
                        {files.length > 0 ? `${files.length} FILES SELECTED` : 'SELECT PDFS'}
                    </span>
                    <input type="file" multiple accept=".pdf" onChange={e => setFiles(Array.from(e.target.files || []))} className="hidden" />
                </label>
            </div>

            {/* Submit Button ပြောင်းလဲခြင်း */}
            <button 
                type="button" // type="submit" အစား "button" ဖြစ်သွားပါပြီ
                onClick={handleBulkUpload} // onClick ဖြင့် တိုက်ရိုက်ချိတ်ဆက်ပါသည်
                disabled={isUploading || files.length === 0} 
                className={`w-full p-5 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${
                    isUploading || files.length === 0 ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-slate-900 shadow-emerald-500/20'
                }`}
            >
                {isUploading ? (
                    <><Loader2 className="animate-spin" size={20} /> UPLOADING...</>
                ) : (
                    "UPLOAD STATEMENTS"
                )}
            </button>
          </div>
        </div>

        {/* List of Statements */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
             <p className="col-span-full text-center animate-pulse font-black uppercase text-slate-300 tracking-widest">Loading Records...</p>
          ) : statements.length === 0 ? (
            <div className="col-span-full bg-white p-20 rounded-[3rem] border-4 border-dashed border-slate-100 text-center text-slate-200 font-black italic uppercase">No records found</div>
          ) : (
            statements.map(s => (
              <div key={s.id} className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-50 shadow-lg flex flex-col justify-between group hover:border-emerald-500 transition-all min-h-[220px] relative overflow-hidden">
                <div className="flex items-start justify-between">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition shadow-inner"><FileText size={24}/></div>
                    <div className="flex gap-2">
                        <a href={s.fileUrl} target="_blank" rel="noreferrer" className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-900 hover:text-white transition"><ExternalLink size={18}/></a>
                        <button onClick={() => handleDelete(s.id, s.storagePath)} className="p-3 bg-rose-50 text-rose-300 rounded-2xl hover:bg-rose-600 hover:text-white transition"><Trash2 size={18}/></button>
                    </div>
                </div>
                <div className="mt-4">
                    <p className="font-black text-slate-900 text-lg leading-tight truncate pr-4">{s.accountName}</p>
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1 mb-4 flex items-center gap-2">
                        <CheckCircle2 size={12}/> {s.period}
                    </p>
                    <button 
                        onClick={() => syncWithAI(s.id, s.fileUrl, s.accountName)}
                        disabled={isSyncing === s.id}
                        className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl font-black text-[10px] shadow-lg hover:bg-slate-900 transition-all uppercase disabled:bg-slate-200"
                    >
                        {isSyncing === s.id ? <><Loader2 size={12} className="animate-spin" /> SYNCING...</> : <><Sparkles size={12}/> AI Sync to Ledger</>}
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