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
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const start = new Date(selectedYear, 0, 1);
        const end = new Date(selectedYear, 11, 31, 23, 59, 59);
        const q = query(collection(db, "bank_statements"), where("uid", "==", user.uid), where("createdAt", ">=", start), where("createdAt", "<=", end), orderBy("createdAt", "desc"));
        onSnapshot(q, (snap) => {
          setStatements(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setLoading(false);
        });

        const qAcc = query(collection(db, "chart_of_accounts"), where("uid", "==", user.uid));
        const accSnap = await getDocs(qAcc);
        setAccounts(accSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
      }
    });
  }, [selectedYear]);

  const handleDelete = async (id: string, storagePath: string) => {
    if (!confirm("Delete this statement record?")) return;
    try {
      await deleteDoc(doc(db, "bank_statements", id));
      if (storagePath) {
        const fileRef = ref(storage, storagePath);
        await deleteObject(fileRef).catch(() => {});
      }
      alert("Deleted!");
    } catch (err) { alert("Delete failed"); }
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (files.length === 0 || !accName || isUploading || !user) return;
    setIsUploading(true);
    try {
      for (const file of files) {
        const path = `statements/${user.uid}/${selectedYear}/${Date.now()}_${file.name}`;
        const sRef = ref(storage, path);
        await uploadBytes(sRef, file);
        const url = await getDownloadURL(sRef);

        const dateMatch = file.name.match(/(\d{4})-(\d{2})-(\d{2})/);
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        let period = dateMatch ? `${monthNames[parseInt(dateMatch[2])-1]} ${dateMatch[1]}` : file.name.split('_')[0];

        await addDoc(collection(db, "bank_statements"), {
          accountName: accName, period, fileUrl: url, storagePath: path, uid: user.uid, createdAt: serverTimestamp()
        });
      }
      setFiles([]); alert("Success!");
    } catch (err) { alert("Upload failed"); } finally { setIsUploading(false); }
  };

  const syncWithAI = async (statementId: string, fileUrl: string, account: string) => {
    if (!confirm(`AI Sync to [${account}]?`)) return;
    setIsSyncing(statementId);
    try {
      // PDF ကို တိုက်ရိုက်မပို့တော့ဘဲ URL ကိုပဲ ပို့ပါမယ် (4.5MB limit ကျော်ဖို့)
      const apiRes = await fetch('/api/extract-statement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl: fileUrl }) 
      });

      const result = await apiRes.json();
      if (!apiRes.ok) throw new Error(result.error || "AI Sync Failed");

      for (const t of result) {
        await addDoc(collection(db, "transactions"), {
          description: t.description, amount: Math.abs(t.amount),
          category: t.amount > 0 ? 'income' : (t.category || 'other'),
          transactionDate: new Date(t.date), date: serverTimestamp(),
          uid: auth.currentUser?.uid, verified: true, bankAccount: account
        });
      }
      alert(`Synced ${result.length} items!`);
    } catch (err: any) { alert(err.message); } finally { setIsSyncing(null); }
  };

  return (
    <Layout>
      <div className="pt-6 pb-40 max-w-6xl mx-auto px-4">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-10">
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">eStatements</h2>
            <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-black text-xs outline-none">
                {years.reverse().map(y => <option key={y} value={y}>{y} ARCHIVE</option>)}
            </select>
        </div>

        {/* Upload Form */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border-2 border-slate-50 mb-16">
          <form onSubmit={handleBulkUpload} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Account</label>
                <select value={accName} onChange={e => setAccName(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black">{accounts.map(acc => <option key={acc.id} value={acc.name}>{acc.name}</option>)}</select>
            </div>
            <label className="cursor-pointer bg-emerald-50 border-2 border-dashed border-emerald-200 p-4 rounded-2xl flex items-center justify-center gap-3">
                <UploadCloud size={20} className="text-emerald-500" />
                <span className="font-black text-emerald-700 uppercase text-xs">{files.length > 0 ? `${files.length} Files` : 'Select PDFs'}</span>
                <input type="file" multiple accept=".pdf" onChange={e => setFiles(Array.from(e.target.files || []))} className="hidden" />
            </label>
            <button type="submit" disabled={isUploading || files.length === 0} className="md:col-span-2 w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase hover:bg-emerald-600 transition disabled:bg-slate-100">
                {isUploading ? "UPLOADING..." : "UPLOAD STATEMENTS"}
            </button>
          </form>
        </div>

        {/* List Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statements.map(s => (
            <div key={s.id} className="bg-white p-6 rounded-[2rem] border-2 border-slate-50 shadow-lg flex flex-col justify-between group hover:border-emerald-500 transition-all min-h-[220px]">
                <div className="flex justify-between items-start">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400"><FileText size={24}/></div>
                    <div className="flex gap-2">
                        <a href={s.fileUrl} target="_blank" className="p-2 bg-slate-100 rounded-xl hover:bg-slate-900 hover:text-white transition"><ExternalLink size={18}/></a>
                        <button onClick={() => handleDelete(s.id, s.storagePath)} className="p-2 bg-rose-50 text-rose-300 rounded-xl hover:bg-rose-600 hover:text-white transition"><Trash2 size={18}/></button>
                    </div>
                </div>
                <div className="mt-4">
                    <p className="font-black text-slate-900 leading-tight truncate">{s.accountName}</p>
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1 mb-4">{s.period}</p>
                    <button onClick={() => syncWithAI(s.id, s.fileUrl, s.accountName)} disabled={isSyncing === s.id} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-black text-[10px] shadow-lg hover:bg-slate-900 transition active:scale-95">
                        {isSyncing === s.id ? "SYNCING..." : "AI Sync to Ledger"}
                    </button>
                </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}