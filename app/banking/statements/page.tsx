// app/banking/statements/page.tsx
"use client";
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { db, auth, storage } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, orderBy, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { UploadCloud, FileText, Download, Loader2, X, ChevronDown, ExternalLink, Sparkles } from 'lucide-react';

export default function BankStatements() {
  const [statements, setStatements] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [accName, setAccName] = useState('');
  const [period, setPeriod] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  // --- Features အတွက် State များ ---
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear()); // ၁။ Yearly Archive
  const [accountHistory, setAccountHistory] = useState<string[]>([]); // ၂။ Smart Suggestion
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // ၁။ နှစ်အလိုက် စစ်ထုတ်ခြင်း Logic
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
        }, (err) => {
          console.error("Index or Error:", err);
          setLoading(false);
        });

        // ၂။ Auto-complete အတွက် အကောင့်နာမည်များ ဆွဲထုတ်ခြင်း
        const qHistory = query(collection(db, "bank_statements"), where("uid", "==", user.uid));
        const historySnap = await getDocs(qHistory);
        const names = historySnap.docs.map(doc => doc.data().accountName);
        setAccountHistory(Array.from(new Set(names)));

        return () => unsubscribeData();
      }
    });
    return () => unsubscribeAuth();
  }, [selectedYear]);

  const handleAccNameChange = (val: string) => {
    setAccName(val);
    if (val.length > 0) {
      const filtered = accountHistory.filter(name => name.toLowerCase().includes(val.toLowerCase()));
      setFilteredSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!file || !accName || isUploading || !user) return;
    
    setIsUploading(true);
    try {
      const storageRef = ref(storage, `statements/${user.uid}/${selectedYear}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(storageRef);

      await addDoc(collection(db, "bank_statements"), {
        accountName: accName,
        period: period,
        fileUrl: fileUrl,
        fileName: file.name,
        uid: user.uid,
        createdAt: serverTimestamp()
      });

      setFile(null); setAccName(''); setPeriod('');
      alert("Statement Saved Successfully!");
    } catch (err) { alert("Upload failed"); }
    finally { setIsUploading(false); }
  };

  return (
    <Layout>
      <div className="pt-6 pb-40 max-w-5xl mx-auto px-4">
        
        {/* --- ၁။ Header with Year Selector --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Bank Statements</h2>
                
                <div className="mt-4 relative inline-block group">
                    <select 
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="appearance-none bg-emerald-600 text-white px-6 py-2.5 pr-10 rounded-2xl font-black text-sm outline-none cursor-pointer hover:bg-slate-900 transition-all shadow-xl"
                    >
                        {[2024, 2025, 2026, 2027].map(year => (
                            <option key={year} value={year}>{year} ARCHIVE</option>
                        ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-200 pointer-events-none" />
                </div>
            </div>
        </div>

        {/* --- ၂။ Upload Form with Smart Suggestions --- */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border-2 border-slate-50 mb-12">
          <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div className="relative">
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-2 flex items-center gap-2">
                Account Name <Sparkles size={12} className="text-emerald-500"/>
              </label>
              <input 
                type="text" value={accName} 
                onChange={e => handleAccNameChange(e.target.value)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="e.g. BoA Checking" 
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-900 placeholder:text-slate-300 focus:border-emerald-500 focus:bg-white outline-none transition-all" required 
              />
              {/* Auto-complete List */}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white border-2 border-slate-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1">
                  {filteredSuggestions.map((name, i) => (
                    <button key={i} type="button" onClick={() => { setAccName(name); setShowSuggestions(false); }} className="w-full text-left p-4 hover:bg-emerald-50 font-black text-slate-700 border-b last:border-0 border-slate-50">
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-2">Period (Month/Year)</label>
              <input 
                type="text" value={period} onChange={e => setPeriod(e.target.value)} 
                placeholder="e.g. April 2026" 
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-900 placeholder:text-slate-300 focus:border-emerald-500 focus:bg-white outline-none transition-all" required 
              />
            </div>

            <div>
              <label className="w-full cursor-pointer bg-slate-50 border-2 border-dashed border-slate-200 p-4 rounded-2xl flex items-center justify-center gap-2 hover:border-emerald-400 transition shadow-inner">
                <UploadCloud size={20} className="text-slate-400" />
                <span className="text-xs font-black text-slate-500 uppercase truncate max-w-[120px]">{file ? file.name : 'Select File'}</span>
                <input type="file" accept=".pdf,.csv,.jpg,.png" onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" />
              </label>
            </div>

            <button type="submit" disabled={isUploading} className="md:col-span-3 w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-600 transition shadow-xl active:scale-95 disabled:bg-slate-300">
              {isUploading ? <Loader2 className="animate-spin mx-auto" /> : "Secure Upload to Cloud Storage"}
            </button>
          </form>
        </div>

        {/* --- ၃။ Statements List with "OPEN/VIEW" Capability --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading ? (
             <p className="p-10 text-center font-black animate-pulse text-slate-200 uppercase tracking-widest">Fetching {selectedYear} Documents...</p>
          ) : statements.length === 0 ? (
            <div className="col-span-2 bg-white p-20 rounded-[3rem] border-4 border-dashed border-slate-100 text-center">
                <FileText size={48} className="mx-auto text-slate-100 mb-4" />
                <p className="text-slate-300 font-black italic uppercase">No records found for {selectedYear}</p>
            </div>
          ) : (
            statements.map(s => (
              <div key={s.id} className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-50 shadow-lg flex justify-between items-center group hover:border-emerald-500 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition border-2 border-slate-100"><FileText size={28}/></div>
                  <div>
                    <p className="font-black text-slate-900 text-lg tracking-tight">{s.accountName}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.period}</p>
                  </div>
                </div>
                {/* PDF ဖွင့်ကြည့်ရန် ခလုတ်အသစ် */}
                <a 
                  href={s.fileUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[10px] shadow-lg hover:bg-emerald-600 transition-all uppercase tracking-tighter"
                >
                  View File <ExternalLink size={14}/>
                </a>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}