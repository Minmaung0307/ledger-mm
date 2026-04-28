// app/banking/import/page.tsx
"use client";
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import Papa from 'papaparse'; 
import * as XLSX from 'xlsx'; 
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, Info, ChevronDown, FileSpreadsheet } from 'lucide-react';
import { TAX_CATEGORIES } from '@/lib/constants';

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
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const reader = new FileReader();

    reader.onload = (evt) => {
      let rawData: any[] = [];
      try {
        if (fileExtension === 'csv') {
          const text = evt.target?.result as string;
          const results = Papa.parse(text, { header: false, skipEmptyLines: true });
          rawData = results.data;
        } else {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          rawData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
        }

        let headerRowIndex = -1;
        let dateCol = -1, descCol = -1, amtCol = -1;

        for (let i = 0; i < rawData.length; i++) {
          const row = rawData[i];
          if (!Array.isArray(row)) continue;
          const dIdx = row.findIndex(c => c?.toString().toLowerCase().includes('date'));
          const deIdx = row.findIndex(c => c?.toString().toLowerCase().includes('desc'));
          const aIdx = row.findIndex(c => c?.toString().toLowerCase().includes('amount'));
          if (dIdx !== -1 && aIdx !== -1) {
            headerRowIndex = i; dateCol = dIdx; descCol = deIdx; amtCol = aIdx;
            break;
          }
        }

        if (headerRowIndex === -1) {
          alert("Excel ထဲတွင် 'Date' နှင့် 'Amount' ခေါင်းစဉ်များ ရှာမတွေ့ပါ။");
          return;
        }

        const normalized = rawData.slice(headerRowIndex + 1).map(row => {
          const amtRaw = row[amtCol]?.toString().replace(/[$,]/g, '') || "0";
          return {
            date: row[dateCol],
            description: descCol !== -1 ? row[descCol] : 'Imported Item',
            amount: parseFloat(amtRaw)
          };
        }).filter(item => item.date && !isNaN(item.amount) && item.amount !== 0);

        setFileData(normalized);
        setIsDone(false);
      } catch (err) { alert("File Read Error"); }
    };
    if (fileExtension === 'csv') reader.readAsText(file);
    else reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (fileData.length === 0 || !selectedAccount) return;
    setIsProcessing(true);
    try {
      for (const row of fileData) {
        const amt = row.amount;
        let category = amt > 0 ? 'income' : 'other';

        // --- Smart Category Detection ---
        // အကယ်၍ Description ထဲမှာ Gas လို့ပါရင် Car / Truck Category ထဲ တန်းထည့်မယ်
        if (amt < 0 && row.description.toLowerCase().includes('gas')) {
            category = 'car_truck';
        }

        await addDoc(collection(db, "transactions"), {
          description: row.description,
          amount: Math.abs(amt),
          category: category,
          bankAccount: selectedAccount,
          transactionDate: new Date(row.date),
          date: serverTimestamp(),
          uid: auth.currentUser?.uid,
          verified: true
        });
      }
      setIsDone(true);
      setFileData([]);
      alert("စာရင်းသွင်းခြင်း အောင်မြင်ပါသည်။");
    } catch (err) { alert("Import Error"); }
    finally { setIsProcessing(false); }
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
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-2">2. Upload Excel / CSV</label>
              <label htmlFor="file-upload-input" className="w-full cursor-pointer bg-emerald-50 border-2 border-dashed border-emerald-200 p-5 rounded-3xl flex items-center justify-center gap-3 hover:bg-emerald-100 transition-all shadow-inner active:scale-95">
                <UploadCloud size={24} className="text-emerald-500" />
                <span className="font-black text-emerald-700 uppercase text-sm">{fileData.length > 0 ? `${fileData.length} Rows Detected` : 'CHOOSE FILE'}</span>
                <input id="file-upload-input" type="file" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>

          {fileData.length > 0 && (
            <div className="pt-6 border-t-2 border-slate-50 animate-in fade-in slide-in-from-bottom-4">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest text-center italic">Data Preview (Ready to Sync)</p>
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
                        <td className={`py-4 text-right font-black ${row.amount > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>${row.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={handleImport} disabled={isProcessing} className="w-full bg-[#009669] text-white p-6 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl hover:bg-slate-900 transition-all active:scale-95 flex items-center justify-center gap-3">
                {isProcessing ? <><Loader2 className="animate-spin" /> SYNCING...</> : "CONFIRM & SYNC TO LEDGER"}
              </button>
            </div>
          )}
        </div>

        {/* --- UI Upgrade: Formatting Guide with Excel Sample --- */}
        <div className="mt-16 bg-blue-50/50 p-10 rounded-[3rem] border-2 border-blue-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 text-blue-600"><FileSpreadsheet size={100}/></div>
            <h3 className="text-2xl font-black text-blue-900 mb-6 flex items-center gap-3">
                <Info size={24} className="text-blue-500" /> Formatting Guide
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div>
                    <p className="text-blue-800 font-bold mb-4 leading-relaxed">
                        အပေါ်က Preview မှာ ဒေတာတွေ မှန်ကန်စွာ ပေါ်လာဖို့အတွက် သင့် Excel ဖိုင်ရဲ့ Column ခေါင်းစဉ်တွေကို အောက်ပါအတိုင်း ပေးထားရန် လိုအပ်ပါတယ်။
                    </p>
                    <ul className="space-y-3 text-sm font-bold text-blue-600/80 italic">
                        <li className="flex gap-2"><span>•</span> <span><b>Date:</b> နေ့စွဲ (ဥပမာ - 04/15/2026)</span></li>
                        <li className="flex gap-2"><span>•</span> <span><b>Description:</b> ဆိုင်နာမည် (ဥပမာ - Gas, Grocery)</span></li>
                        <li className="flex gap-2"><span>•</span> <span><b>Amount:</b> အဝင်ငွေများကို (2000) နှင့် အသုံးစရိတ်များကို (-50) ဟု ရေးပါ။</span></li>
                    </ul>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-inner border border-blue-100">
                    <p className="text-[10px] font-black text-blue-300 uppercase mb-4 tracking-widest italic">Excel Sample Format</p>
                    <table className="w-full text-[11px] font-bold">
                        <thead>
                            <tr className="bg-blue-50 text-blue-500 border-b border-blue-100">
                                <th className="p-2 text-left">Date</th>
                                <th className="p-2 text-left">Description</th>
                                <th className="p-2 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="text-blue-900">
                            <tr className="border-b border-blue-50"><td className="p-2">04/19/2026</td><td className="p-2">Gas</td><td className="p-2 text-right text-rose-500">-29.00</td></tr>
                            <tr className="border-b border-blue-50"><td className="p-2">04/25/2026</td><td className="p-2">Grocery</td><td className="p-2 text-right text-rose-500">-200.00</td></tr>
                            <tr><td className="p-2">04/25/2026</td><td className="p-2">Client Payment</td><td className="p-2 text-right text-emerald-600">2500.00</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      </div>
    </Layout>
  );
}