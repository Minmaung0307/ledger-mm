// app/banking/import/page.tsx
"use client";
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import Papa from 'papaparse'; 
import * as XLSX from 'xlsx'; 
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, Info, ChevronDown } from 'lucide-react';

interface Account { id: string; name: string; }

export default function CSVImport() {
  const [fileData, setFileData] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const q = query(collection(db, "chart_of_accounts"), where("uid", "==", user.uid));
        const snap = await getDocs(q);
        const accs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        setAccounts(accs);
        if (accs.length > 0) setSelectedAccount(accs[0].name);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const reader = new FileReader();

    reader.onload = (evt) => {
      let rawData: any[] = [];
      try {
        if (fileExtension === 'csv') {
          const text = evt.target?.result as string;
          const results = Papa.parse(text, { header: true, skipEmptyLines: true });
          rawData = results.data;
        } else {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          rawData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        }

        if (rawData.length === 0) {
            alert("ဖိုင်ထဲမှာ အချက်အလက် မတွေ့ပါ။");
            return;
        }

        // --- Smart Header Detection Logic ---
        const normalized = rawData.map(row => {
          // ခေါင်းစဉ်တွေကို အလိုအလျောက် ခန့်မှန်းရှာဖွေခြင်း
          const keys = Object.keys(row);
          
          const dateKey = keys.find(k => k.toLowerCase().includes('date'));
          const descKey = keys.find(k => k.toLowerCase().includes('desc') || k.toLowerCase().includes('memo') || k.toLowerCase().includes('name'));
          const amtKey = keys.find(k => k.toLowerCase().includes('amount') || k.toLowerCase().includes('value') || k.toLowerCase().includes('price'));

          return {
            date: dateKey ? row[dateKey] : null,
            description: descKey ? row[descKey] : 'No Description',
            amount: amtKey ? row[amtKey] : null
          };
        }).filter(item => item.date && item.amount !== null);

        if (normalized.length === 0) {
            alert("Excel ထဲမှာ 'Date' နဲ့ 'Amount' ဆိုတဲ့ ခေါင်းစဉ်တွေကို ရှာမတွေ့ပါ။ ကျေးဇူးပြု၍ ခေါင်းစဉ်နာမည်များကို စစ်ဆေးပေးပါ။");
        }

        setFileData(normalized);
        setIsDone(false);
      } catch (err) {
        alert("ဖိုင်ဖတ်ရတာ အဆင်မပြေပါ။");
      }
    };

    if (fileExtension === 'csv') reader.readAsText(file);
    else reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (fileData.length === 0 || !selectedAccount) return;
    setIsProcessing(true);
    try {
      for (const row of fileData) {
        const amt = parseFloat(row.amount.toString().replace(/[$,]/g, ''));
        if (isNaN(amt)) continue;

        await addDoc(collection(db, "transactions"), {
          description: row.description,
          amount: Math.abs(amt),
          category: amt > 0 ? 'income' : 'other',
          bankAccount: selectedAccount,
          transactionDate: new Date(row.date),
          date: serverTimestamp(),
          uid: auth.currentUser?.uid,
          verified: true
        });
      }
      setIsDone(true);
      setFileData([]);
      alert("အောင်မြင်စွာ စာရင်းသွင်းပြီးပါပြီ။");
    } catch (err) {
      alert("စာရင်းသွင်းရတာ အဆင်မပြေပါ။ နေ့စွဲ Format (ဥပမာ - 04/15/2026) ကို စစ်ပေးပါ။");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Layout>
      <div className="pt-6 pb-40 max-w-5xl mx-auto px-4">
        <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic mb-10 text-center lg:text-left">Data Import Center</h2>

        <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-2xl border-2 border-slate-50 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
            {/* Step 1 */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-2">1. Select Account</label>
              <div className="relative">
                <select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)} 
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-slate-900 focus:border-emerald-500 outline-none appearance-none cursor-pointer">
                  {accounts.map(acc => <option key={acc.id} value={acc.name}>{acc.name}</option>)}
                  <option value="Cash/Other">Cash / Other</option>
                </select>
                <ChevronDown size={20} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Step 2 */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-2">2. Upload File</label>
              <label htmlFor="file-upload-input" className="w-full cursor-pointer bg-emerald-50 border-2 border-dashed border-emerald-200 p-5 rounded-3xl flex items-center justify-center gap-3 hover:bg-emerald-100 transition-all shadow-inner active:scale-95">
                <UploadCloud size={24} className="text-emerald-500" />
                <span className="font-black text-emerald-700 uppercase text-sm">
                    {fileData.length > 0 ? `${fileData.length} Rows Detected` : 'CHOOSE FILE'}
                </span>
                <input id="file-upload-input" type="file" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Step 3: Preview & Confirm */}
          {fileData.length > 0 ? (
            <div className="pt-6 border-t-2 border-slate-50 animate-in fade-in slide-in-from-bottom-4">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest text-center">Data Preview (Ready to Sync)</p>
              <div className="bg-slate-50 p-6 rounded-[2rem] mb-8 overflow-x-auto border border-slate-100">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-200 font-black uppercase">
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Description</th>
                      <th className="pb-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="font-bold text-slate-700">
                    {fileData.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-b last:border-0 border-slate-100">
                        <td className="py-4 text-slate-400">{row.date}</td>
                        <td className="py-4 truncate max-w-[200px]">{row.description}</td>
                        <td className={`py-4 text-right ${parseFloat(row.amount) > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                          ${row.amount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <button onClick={handleImport} disabled={isProcessing} 
                className="w-full bg-[#009669] text-white p-6 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl hover:bg-slate-900 transition-all active:scale-95 flex items-center justify-center gap-3">
                {isProcessing ? <><Loader2 className="animate-spin" /> SYNCING...</> : "CONFIRM & SYNC TO LEDGER"}
              </button>
            </div>
          ) : (
            <div className="p-16 border-2 border-dashed border-slate-100 rounded-[3rem] text-center text-slate-300 font-black uppercase text-xs tracking-widest">
                Upload a file to see preview and sync button
            </div>
          )}

          {isDone && (
            <div className="p-6 bg-emerald-50 border-2 border-emerald-100 text-emerald-700 rounded-3xl flex items-center justify-center gap-3 font-black animate-bounce">
              <CheckCircle2 size={24}/> SUCCESS! VIEW DASHBOARD
            </div>
          )}
        </div>

        {/* Formatting Guide Section က အရင်အတိုင်းပဲမို့လို့ ပိုလှအောင်ပဲ ထားလိုက်ပါမယ် */}
      </div>
    </Layout>
  );
}