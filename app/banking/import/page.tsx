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
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // ၁။ ဘဏ်အကောင့်များ ဆွဲထုတ်ခြင်း
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const q = query(collection(db, "chart_of_accounts"), where("uid", "==", user.uid));
          const snap = await getDocs(q);
          const accs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
          setAccounts(accs);
          if (accs.length > 0) setSelectedAccount(accs[0].name);
          else setSelectedAccount('Cash/Other');
        } catch (err) {
          console.error(err);
        } finally {
          setLoadingAccounts(false);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // ၂။ ဖိုင်ဖတ်သည့် Logic
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
          const ws = wb.Sheets[wb.SheetNames[0]];
          rawData = XLSX.utils.sheet_to_json(ws);
        }

        // --- Smart Mapping: လူကြီးမင်း၏ Excel နှင့် ညှိခြင်း ---
        const normalized = rawData.map(row => {
          // Date ရှာဖွေခြင်း
          const dateVal = row['Transaction Date'] || row['Date'] || row['date'] || row['Posting Date'];
          // Description ရှာဖွေခြင်း
          const descVal = row['Description'] || row['description'] || row['Memo'];
          // Amount ရှာဖွေခြင်း
          const amtVal = row['Amount'] || row['amount'] || row['Value'];

          return { date: dateVal, description: descVal, amount: amtVal };
        }).filter(item => item.date && item.description && item.amount !== undefined);

        setFileData(normalized);
        setIsDone(false);
      } catch (err) {
        alert("Could not read file. Please ensure it's a valid Excel or CSV.");
      }
    };

    if (fileExtension === 'csv') reader.readAsText(file);
    else reader.readAsBinaryString(file);
  };

  // ၃။ Ledger ထဲ သိမ်းခြင်း
  const handleImport = async () => {
    if (fileData.length === 0 || !selectedAccount) return;
    setIsProcessing(true);

    try {
      for (const row of fileData) {
        const amt = parseFloat(row.amount);
        if (isNaN(amt)) continue;

        await addDoc(collection(db, "transactions"), {
          description: row.description,
          amount: Math.abs(amt),
          category: amt > 0 ? 'income' : 'other', // အပေါင်းဆိုရင် ဝင်ငွေ၊ အနှုတ်ဆိုရင် အသုံးစရိတ်
          bankAccount: selectedAccount,
          transactionDate: new Date(row.date),
          date: serverTimestamp(),
          uid: auth.currentUser?.uid,
          verified: true
        });
      }
      setIsDone(true);
      setFileData([]);
      alert("Successfully synced to Ledger!");
    } catch (err) {
      alert("Error during sync. Please check date formats in Excel.");
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
            {/* Step 1: Destination */}
            <div className="relative">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-2">1. Select Destination Account</label>
              <div className="relative">
                <select 
                  value={selectedAccount} 
                  onChange={e => setSelectedAccount(e.target.value)} 
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-slate-900 focus:border-emerald-500 outline-none appearance-none transition-all cursor-pointer"
                >
                  {accounts.map(acc => <option key={acc.id} value={acc.name}>{acc.name}</option>)}
                  <option value="Cash/Other">Cash / Other</option>
                </select>
                <ChevronDown size={20} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Step 2: Upload - Label ကို Input နဲ့ သေချာချိတ်ထားပါတယ် */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-2">2. Upload Excel or CSV</label>
              <label htmlFor="file-upload" className="w-full cursor-pointer bg-emerald-50 border-2 border-dashed border-emerald-200 p-5 rounded-3xl flex items-center justify-center gap-3 hover:bg-emerald-100 transition-all shadow-inner active:scale-95">
                <UploadCloud size={24} className="text-emerald-500" />
                <span className="font-black text-emerald-700 uppercase text-sm">
                    {fileData.length > 0 ? `${fileData.length} Rows Found` : 'Choose File'}
                </span>
              </label>
              <input 
                id="file-upload" 
                type="file" 
                accept=".csv, .xlsx, .xls" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
            </div>
          </div>

          {/* Step 3: Preview and Confirm - Data ရှိမှ ပေါ်လာပါမယ် */}
          {fileData.length > 0 ? (
            <div className="pt-6 border-t-2 border-slate-50 animate-in fade-in slide-in-from-bottom-4">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest text-center">Previewing Data (First 5 Rows)</p>
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
                    {fileData.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-b last:border-0 border-slate-100">
                        <td className="py-4 text-slate-400">{row.date}</td>
                        <td className="py-4">{row.description}</td>
                        <td className={`py-4 text-right ${parseFloat(row.amount) > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                          ${row.amount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <button 
                onClick={handleImport} 
                disabled={isProcessing} 
                className="w-full bg-[#009669] text-white p-6 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl hover:bg-slate-900 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                {isProcessing ? <><Loader2 className="animate-spin" /> SYNCING DATA...</> : "CONFIRM & SYNC TO LEDGER"}
              </button>
            </div>
          ) : (
            <div className="p-10 border-2 border-dashed border-slate-100 rounded-[2rem] text-center text-slate-300 font-black uppercase text-xs tracking-widest">
                Upload a file to see preview and sync button
            </div>
          )}

          {isDone && (
            <div className="p-6 bg-emerald-50 border-2 border-emerald-100 text-emerald-700 rounded-3xl flex items-center justify-center gap-3 font-black animate-in zoom-in">
              <CheckCircle2 size={24}/> SUCCESS! ALL RECORDS SYNCED.
            </div>
          )}
        </div>

        {/* --- Instruction Guide --- */}
        <div className="mt-12 p-10 bg-blue-50 rounded-[3rem] border-2 border-blue-100 relative overflow-hidden">
            <h4 className="font-black text-blue-900 uppercase text-xs flex items-center gap-2 mb-6 tracking-widest"><AlertCircle size={18}/> Formatting Guide</h4>
            <div className="bg-white/60 p-5 rounded-2xl border border-blue-200 shadow-inner max-w-md mx-auto">
                <table className="w-full text-[10px] font-black uppercase text-blue-400 text-center">
                    <thead>
                        <tr className="border-b border-blue-100">
                            <th className="p-2 bg-blue-100/30">Transaction Date</th>
                            <th className="p-2 bg-blue-100/30">Description</th>
                            <th className="p-2 bg-blue-100/30">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="text-blue-900 italic">
                        <tr><td className="p-2">04/01/2026</td><td className="p-2 text-left">Starbucks</td><td className="p-2">-15.50</td></tr>
                        <tr><td className="p-2">04/02/2026</td><td className="p-2 text-left">Client Payment</td><td className="p-2">2500.00</td></tr>
                    </tbody>
                </table>
            </div>
            <p className="text-blue-800 text-[11px] font-bold text-center mt-6 leading-relaxed opacity-70">
                အပေါ်က preview မှာ ဒေတာမပေါ်ရင် Excel ထဲက Column နာမည်တွေကို Transaction Date ဟု ပြင်ပေးပါ။
            </p>
        </div>
      </div>
    </Layout>
  );
}