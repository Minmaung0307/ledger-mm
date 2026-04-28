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

  // --- New States for Filtering & Suggestions ---
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [accountHistory, setAccountHistory] = useState<string[]>([]);
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
          console.error("Index needed or Error:", err);
          setLoading(false);
        });

        // ၂။ Auto-complete အတွက် အကောင့်နာမည်ဟောင်းများ ဆွဲထုတ်ခြင်း
        const qHistory = query(collection(db, "bank_statements"), where("uid", "==", user.uid));
        const historySnap = await getDocs(qHistory);
        const names = historySnap.docs.map(doc => doc.data().accountName);
        setAccountHistory(Array.from(new Set(names))); // Unique ဖြစ်အောင်လုပ်မယ်

        return () => unsubscribeData();
      }
    });
    return () => unsubscribeAuth();
  }, [selectedYear]);

  // Account Name ရိုက်တဲ့အခါ Suggestion ပြပေးမယ့် function
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
      alert("Statement Saved!");
    } catch (err) { alert("Upload failed"); }
    finally { setIsUploading(false); }
  };

  return (
    <Layout>
      <div className="pt-6 pb-40 max-w-5xl mx-auto px-4">
        
        {/* Header with Year Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Bank Statements</h2>
                
                <div className="mt-4 relative inline-block group">
                    <select 
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="appearance-none bg-emerald-50 border-2 border-emerald-100 text-emerald-700 px-6 py-2 pr-10 rounded-xl font-black text-sm outline-none cursor-pointer hover:bg-emerald-100 transition-all shadow-sm"
                    >
                        {[2024, 2025, 2026, 2027].map(year => (
                            <option key={year} value={year}>{year} STATEMENTS</option>
                        ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none" />
                </div>
            </div>
        </div>

        {/* Upload Form with Auto-complete */}
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
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-900 focus:border-emerald-500 focus:bg-white outline-none transition-all" required 
              />
              {/* Auto-complete Suggestions Dropdown */}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white border-2 border-slate-100 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1">
                  {filteredSuggestions.map((name, i) => (
                    <button key={i} type="button" onClick={() => { setAccName(name); setShowSuggestions(false); }} className="w-full text-left p-4 hover:bg-emerald-50 font-bold text-slate-700 border-b last:border-0 border-slate-50">
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
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-900 focus:border-emerald-500 focus:bg-white outline-none transition-all" required 
              />
            </div>

            <div>
              <label className="w-full cursor-pointer bg-slate-50 border-2 border-dashed border-slate-200 p-4 rounded-2xl flex items-center justify-center gap-2 hover:border-emerald-400 transition">
                <UploadCloud size={20} className="text-slate-400" />
                <span className="text-xs font-black text-slate-500 uppercase truncate max-w-[150px]">{file ? file.name : 'Select PDF/CSV'}</span>
                <input type="file" accept=".pdf,.csv,.jpg,.png" onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" />
              </label>
            </div>

            <button type="submit" disabled={isUploading} className="md:col-span-3 w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-600 transition shadow-xl active:scale-95 disabled:bg-slate-300">
              {isUploading ? <Loader2 className="animate-spin mx-auto" /> : "Secure Upload to Cloud"}
            </button>
          </form>
        </div>

        {/* Statements List with "Open/View" Capability */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading ? (
             <p className="p-10 text-center font-black animate-pulse text-slate-200 uppercase">Fetching {selectedYear} Archive...</p>
          ) : statements.length === 0 ? (
            <p className="p-10 text-center text-slate-300 font-bold col-span-2 italic uppercase">No statements found for {selectedYear}.</p>
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
                {/* PDF ကို New Tab မှာ တန်းဖွင့်ပေးမယ့် ခလုတ် */}
                <a 
                  href={s.fileUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-xl font-black text-[10px] shadow-lg hover:bg-emerald-600 transition-all uppercase tracking-tighter"
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