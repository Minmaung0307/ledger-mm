// app/banking/import/page.tsx
"use client";
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import Papa from 'papaparse'; 
import * as XLSX from 'xlsx'; 
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, ChevronDown } from 'lucide-react';

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
        try {
          const q = query(collection(db, "chart_of_accounts"), where("uid", "==", user.uid));
          const snap = await getDocs(q);
          const accs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
          setAccounts(accs);
          if (accs.length > 0) setSelectedAccount(accs[0].name);
        } catch (err) { console.error(err); }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    reader.onload = (evt) => {
      try {
        let rows: any[] = [];
        
        if (fileExtension === 'csv') {
          const text = evt.target?.result as string;
          const result = Papa.parse(text, { header: false, skipEmptyLines: true });
          rows = result.data;
        } else {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          // header: 1 ဆိုတာက ပထမဆုံး စာကြောင်းကိုပဲ ယူတာမဟုတ်ဘဲ ဇယားတစ်ခုလုံးကို array အနေနဲ့ ယူတာပါ
          rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        }

        // --- Smart Header Hunter Logic ---
        // ဇယားထဲမှာ Date, Description, Amount ဆိုတဲ့ စာလုံးတွေ ဘယ် row မှာရှိလဲ လိုက်ရှာမယ်
        let headerRowIndex = -1;
        let dateCol = -1, descCol = -1, amtCol = -1;

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (!Array.isArray(row)) continue;
          
          const dIdx = row.findIndex(c => c?.toString().toLowerCase().includes('date'));
          const deIdx = row.findIndex(c => c?.toString().toLowerCase().includes('desc'));
          const aIdx = row.findIndex(c => c?.toString().toLowerCase().includes('amount'));

          if (dIdx !== -1 && aIdx !== -1) {
            headerRowIndex = i;
            dateCol = dIdx;
            descCol = deIdx;
            amtCol = aIdx;
            break;
          }
        }

        if (headerRowIndex === -1) {
          alert("Excel ထဲမှာ 'Date' နဲ့ 'Amount' ဆိုတဲ့ ခေါင်းစဉ်တွေကို ရှာမတွေ့ပါ။ အပေါ်မှာ အလွတ်တွေရှိရင်လည်း ပြဿနာမရှိပါဘူး၊ ဒါပေမဲ့ ခေါင်းစဉ်စာသားတော့ အတိအကျ ပါရပါမယ်။");
          return;
        }

        // ခေါင်းစဉ်တွေ့တဲ့ row ရဲ့ အောက်ကနေ စပြီး data ယူမယ်
        const normalized = rows.slice(headerRowIndex + 1).map(row => {
          const amtRaw = row[amtCol]?.toString().replace(/[$,]/g, '') || "0";
          return {
            date: row[dateCol],
            description: descCol !== -1 ? row[descCol] : 'No Description',
            amount: parseFloat(amtRaw)
          };
        }).filter(item => item.date && !isNaN(item.amount) && item.amount !== 0);

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
        await addDoc(collection(db, "transactions"), {
          description: row.description,
          amount: Math.abs(row.amount),
          category: row.amount > 0 ? 'income' : 'other',
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
      alert("Error: နေ့စွဲ Format မမှန်ပါ။ (ဥပမာ - 04/15/2026)");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Layout>
      <div className="pt-6 pb-40 max-w-5xl mx-auto px-4">
        <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic mb-10">Data Import Center</h2>

        <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-2xl border-2 border-slate-50 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-2">1. Select Destination Account</label>
              <div className="relative">
                <select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)} 
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-slate-900 focus:border-emerald-500 outline-none appearance-none cursor-pointer">
                  {accounts.map(acc => <option key={acc.id} value={acc.name}>{acc.name}</option>)}
                  <option value="Cash/Other">Cash / Other</option>
                </select>
                <ChevronDown size={20} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

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

          {fileData.length > 0 ? (
            <div className="pt-6 border-t-2 border-slate-50 animate-in fade-in slide-in-from-bottom-4">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest text-center">Data Preview (Ready to Sync)</p>
              <div className="bg-slate-50 p-6 rounded-[2rem] mb-8 overflow-x-auto border border-slate-100">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-200 font-black uppercase"><th className="pb-3">Date</th><th className="pb-3">Description</th><th className="pb-3 text-right">Amount</th></tr>
                  </thead>
                  <tbody className="font-bold text-slate-700">
                    {fileData.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-b last:border-0 border-slate-100">
                        <td className="py-4 text-slate-400">{row.date?.toString()}</td>
                        <td className="py-4 truncate max-w-[200px]">{row.description}</td>
                        <td className={`py-4 text-right ${row.amount > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>${row.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={handleImport} disabled={isProcessing} className="w-full bg-[#009669] text-white p-6 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl hover:bg-slate-900 transition-all active:scale-95 flex items-center justify-center gap-3">
                {isProcessing ? <><Loader2 className="animate-spin" /> SYNCING...</> : "CONFIRM & SYNC TO LEDGER"}
              </button>
            </div>
          ) : (
            <div className="p-16 border-2 border-dashed border-slate-100 rounded-[3rem] text-center text-slate-300 font-black uppercase text-xs tracking-widest">
                Upload a file to see preview and sync button
            </div>
          )}

          {isDone && (
            <div className="p-6 bg-emerald-50 border-2 border-emerald-100 text-emerald-700 rounded-3xl flex items-center justify-center gap-3 font-black">
              <CheckCircle2 size={24}/> SUCCESS! VIEW DASHBOARD
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}