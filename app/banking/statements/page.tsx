// app/banking/statements/page.tsx
"use client";
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { db, auth, storage } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, addDoc, onSnapshot, serverTimestamp, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { UploadCloud, FileText, Loader2, ChevronDown, ExternalLink, CheckCircle2, Trash2 } from 'lucide-react';

export default function BankStatements() {
  const [statements, setStatements] = useState<any[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [accName, setAccName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const years = Array.from({ length: new Date().getFullYear() - 2024 + 2 }, (_, i) => 2024 + i);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const start = new Date(selectedYear, 0, 1);
        const end = new Date(selectedYear, 11, 31, 23, 59, 59);
        const q = query(collection(db, "bank_statements"), where("uid", "==", user.uid), where("createdAt", ">=", start), where("createdAt", "<=", end), orderBy("createdAt", "desc"));
        onSnapshot(q, (snap) => {
          setStatements(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setLoading(false);
        });
      }
    });
    return () => unsubscribeAuth();
  }, [selectedYear]);

  const handleBulkUpload = async () => {
    const user = auth.currentUser;
    if (files.length === 0 || !accName || isUploading || !user) return;
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
          period: period,
          fileUrl: url,
          storagePath: path, 
          createdAt: serverTimestamp()
        });
      }
      setFiles([]); alert("ဖိုင်များ အောင်မြင်စွာ တင်ပြီးပါပြီ။");
    } catch (err) { alert("Upload Failed"); } finally { setIsUploading(false); }
  };

  const handleDelete = async (id: string, path: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      await deleteDoc(doc(db, "bank_statements", id));
      if (path) await deleteObject(ref(storage, path));
    } catch (err) { console.error(err); }
  };

  return (
    <Layout>
      <div className="pt-6 pb-40 max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">eStatements</h2>
            <div className="relative">
                <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="appearance-none bg-emerald-600 text-white px-6 py-2 rounded-xl font-black text-xs outline-none shadow-lg pr-10 cursor-pointer">
                    {years.reverse().map(y => <option key={y} value={y}>{y} ARCHIVE</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white pointer-events-none" />
            </div>
        </div>

        {/* Upload Area */}
        <div className="bg-white p-8 rounded-[3rem] shadow-2xl border-2 border-slate-50 mb-16 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input type="text" value={accName} onChange={e => setAccName(e.target.value)} placeholder="Enter Bank Name (e.g. BoA)" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-slate-900 focus:border-emerald-500 outline-none" />
                <label className="cursor-pointer bg-emerald-50 border-2 border-dashed border-emerald-200 p-5 rounded-3xl flex items-center justify-center gap-3 hover:bg-emerald-100 transition-all text-emerald-700 font-black uppercase text-xs">
                    <UploadCloud size={20} /> {files.length > 0 ? `${files.length} Files Selected` : 'Select PDF Files'}
                    <input type="file" multiple accept=".pdf" onChange={e => setFiles(Array.from(e.target.files || []))} className="hidden" />
                </label>
            </div>
            <button onClick={handleBulkUpload} disabled={isUploading || files.length === 0} className="w-full bg-[#111827] text-white p-5 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-emerald-600 transition-all disabled:bg-slate-100 disabled:text-slate-300">
                {isUploading ? <><Loader2 className="animate-spin inline mr-2" /> UPLOADING...</> : "UPLOAD TO CLOUD"}
            </button>
        </div>

        {/* --- Professional List View --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
             <p className="col-span-full text-center animate-pulse font-black text-slate-300 uppercase tracking-widest">Loading Documents...</p>
          ) : statements.length === 0 ? (
            <div className="col-span-full bg-white p-20 rounded-[3rem] border-4 border-dashed border-slate-100 text-center text-slate-200 font-black italic uppercase">No records found</div>
          ) : (
            statements.map(s => (
              <div key={s.id} className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-50 shadow-xl flex flex-col justify-between group hover:border-emerald-500 transition-all h-52 relative">
                <div className="flex items-start justify-between">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition border-2 border-slate-100"><FileText size={30}/></div>
                    <div className="flex gap-2">
                        <a href={s.fileUrl} target="_blank" className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-900 hover:text-white transition"><ExternalLink size={18}/></a>
                        <button onClick={() => handleDelete(s.id, s.storagePath)} className="p-3 bg-rose-50 text-rose-300 rounded-2xl hover:bg-rose-600 hover:text-white transition"><Trash2 size={18}/></button>
                    </div>
                </div>
                <div className="mt-4">
                    <p className="font-black text-slate-900 text-xl tracking-tight truncate pr-4">{s.accountName}</p>
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1 flex items-center gap-2">
                        <CheckCircle2 size={12}/> Verified: {s.period}
                    </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}