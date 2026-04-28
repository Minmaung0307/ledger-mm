// app/banking/statements/page.tsx
"use client";
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { db, auth, storage } from '@/lib/firebase';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { UploadCloud, FileText, Download, Trash2, Loader2, Plus } from 'lucide-react';

export default function BankStatements() {
  const [statements, setStatements] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [accName, setAccName] = useState('');
  const [period, setPeriod] = useState(''); // ဥပမာ - April 2026
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, "bank_statements"), where("uid", "==", auth.currentUser?.uid), orderBy("createdAt", "desc")),
      (snap) => setStatements(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    );
    return () => unsubscribe();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !accName || isUploading) return;
    setIsUploading(true);

    try {
      const storageRef = ref(storage, `statements/${auth.currentUser?.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(storageRef);

      await addDoc(collection(db, "bank_statements"), {
        accountName: accName,
        period: period,
        fileUrl: fileUrl,
        fileName: file.name,
        uid: auth.currentUser?.uid,
        createdAt: serverTimestamp()
      });

      setFile(null); setAccName(''); setPeriod('');
      alert("Statement uploaded successfully!");
    } catch (err) { alert("Upload failed"); }
    finally { setIsUploading(false); }
  };

  return (
    <Layout>
      <div className="pt-6 pb-40 max-w-5xl mx-auto px-4">
        <h2 className="text-4xl font-black text-slate-900 mb-10 tracking-tighter uppercase italic">Bank Statements</h2>

        {/* Upload Form */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border-2 border-slate-50 mb-12">
          <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-2">Account Name</label>
              <input type="text" value={accName} onChange={e => setAccName(e.target.value)} placeholder="e.g. BoA Checking" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" required />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-2">Period (Month/Year)</label>
              <input type="text" value={period} onChange={e => setPeriod(e.target.value)} placeholder="e.g. April 2026" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" required />
            </div>
            <div>
              <label className="w-full cursor-pointer bg-slate-50 border-2 border-dashed border-slate-200 p-4 rounded-2xl flex items-center justify-center gap-2 hover:border-emerald-400 transition">
                <UploadCloud size={20} className="text-slate-400" />
                <span className="text-xs font-black text-slate-500 uppercase">{file ? file.name.slice(0,15)+'...' : 'Select PDF'}</span>
                <input type="file" accept=".pdf,.csv" onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" />
              </label>
            </div>
            <button type="submit" disabled={isUploading} className="md:col-span-3 w-full bg-slate-900 text-white p-4 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-600 transition shadow-xl mt-4">
              {isUploading ? <Loader2 className="animate-spin mx-auto" /> : "Upload Statement"}
            </button>
          </form>
        </div>

        {/* Statements List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {statements.map(s => (
            <div key={s.id} className="bg-white p-6 rounded-[2rem] border-2 border-slate-50 shadow-lg flex justify-between items-center group hover:border-emerald-500 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition"><FileText size={24}/></div>
                <div>
                  <p className="font-black text-slate-900">{s.accountName}</p>
                  <p className="text-xs font-bold text-slate-400 uppercase">{s.period}</p>
                </div>
              </div>
              <a href={s.fileUrl} target="_blank" className="p-3 bg-slate-900 text-white rounded-xl shadow-lg hover:scale-110 transition active:scale-95"><Download size={18}/></a>
            </div>
          ))}
          {statements.length === 0 && <p className="p-10 text-center text-slate-300 font-bold col-span-2 italic">No statements uploaded yet.</p>}
        </div>
      </div>
    </Layout>
  );
}