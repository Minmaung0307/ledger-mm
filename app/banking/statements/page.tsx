// app/banking/statements/page.tsx
"use client";
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { db, auth, storage } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { UploadCloud, FileText, Download, Loader2, ChevronDown, ExternalLink, CheckCircle2, Files } from 'lucide-react';

export default function BankStatements() {
  const [statements, setStatements] = useState<any[]>([]);
  const [files, setFiles] = useState<File[]>([]); // ဖိုင်အများကြီးအတွက် Array ပြောင်းလိုက်ပါတယ်
  const [accName, setAccName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
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
        // ၁။ ပုံမှန်အတိုင်း Storage တင်မယ်
        const storageRef = ref(storage, `statements/${user.uid}/${selectedYear}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const fileUrl = await getDownloadURL(storageRef);

        // ၂။ Smart Filename Parsing (eStmt_2026-01-06.pdf ထဲမှ ရက်စွဲကို ဆွဲထုတ်ခြင်း)
        // Regex သုံးပြီး 2026-01-06 ဆိုတဲ့ အပိုင်းကို ရှာမယ်
        const dateMatch = file.name.match(/(\d{4})-(\d{2})-(\d{2})/);
        let periodDisplay = "N/A";

        if (dateMatch) {
          const year = dateMatch[1]; // 2026
          const monthIndex = parseInt(dateMatch[2]) - 1; // 01 -> 0 (Jan)
          periodDisplay = `${monthNames[monthIndex]} ${year}`; // ရလဒ်: Jan 2026
        } else {
          // အကယ်၍ နာမည်ပုံစံမတူရင် ဖိုင်နာမည်ရဲ့ ပထမဆုံး စာသားကို ယူမယ်
          periodDisplay = file.name.split(/[-_ ]/)[0];
        }

        // ၃။ Database ထဲ သိမ်းမယ်
        await addDoc(collection(db, "bank_statements"), {
          accountName: accName,
          period: periodDisplay, // အခုဆိုရင် "Jan 2026" လို့ သိမ်းသွားပါပြီ
          fileUrl: fileUrl,
          fileName: file.name,
          uid: user.uid,
          createdAt: serverTimestamp()
        });
      }

      setFiles([]); setAccName('');
      alert(`Success! ${files.length} statements uploaded and categorized.`);
    } catch (err) {
      console.error(err);
      alert("Upload failed.");
    } finally {
      setIsUploading(false);
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
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-2">Bank / Account Name</label>
                    <input type="text" value={accName} onChange={e => setAccName(e.target.value)} placeholder="e.g. Bank of America" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-slate-900 focus:border-emerald-500 outline-none" required />
                </div>
                
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-2">Select Multiple Files (PDF/JPG)</label>
                    <label className="w-full cursor-pointer bg-emerald-50 border-2 border-dashed border-emerald-200 p-5 rounded-3xl flex items-center justify-center gap-3 hover:bg-emerald-100 transition shadow-inner">
                        <UploadCloud size={24} className="text-emerald-500" />
                        <span className="font-black text-emerald-700 uppercase text-sm">
                            {files.length > 0 ? `${files.length} Files Selected` : 'Click to select files'}
                        </span>
                        <input type="file" multiple accept=".pdf,.csv,.jpg,.png" onChange={e => setFiles(Array.from(e.target.files || []))} className="hidden" />
                    </label>
                </div>
            </div>

            <button type="submit" disabled={isUploading || files.length === 0} className="w-full bg-slate-900 text-white p-6 rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-600 transition active:scale-95 disabled:bg-slate-100 disabled:text-slate-300">
              {isUploading ? (
                <span className="flex items-center justify-center gap-3"><Loader2 className="animate-spin" /> UPLOADING ALL STATEMENTS...</span>
              ) : "START BULK CLOUD SYNC"}
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
              <div key={s.id} className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-50 shadow-lg flex flex-col justify-between group hover:border-emerald-500 transition-all h-48">
                <div className="flex items-start justify-between">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition shadow-inner"><FileText size={24}/></div>
                    <a href={s.fileUrl} target="_blank" rel="noreferrer" className="p-3 bg-slate-100 text-slate-400 rounded-2xl hover:bg-slate-900 hover:text-white transition"><ExternalLink size={18}/></a>
                </div>
                <div>
                    <p className="font-black text-slate-900 text-lg leading-tight truncate pr-4">{s.accountName}</p>
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1 flex items-center gap-2">
                        <CheckCircle2 size={12}/> {s.period}
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