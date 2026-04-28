// app/banking/import/page.tsx
"use client";
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import Papa from 'papaparse'; // CSV ဖတ်ရန်
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, Landmark } from 'lucide-react';

interface Account {
  id: string;
  name: string;
}

export default function CSVImport() {
  const [fileData, setFileData] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    // ဘဏ်အကောင့်စာရင်း ဆွဲထုတ်ခြင်း
    const fetchAccounts = async () => {
      const user = auth.currentUser;
      if (user) {
        const q = query(collection(db, "chart_of_accounts"), where("uid", "==", user.uid));
        const snap = await getDocs(q);
        const accs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
        setAccounts(accs);
        if (accs.length > 0) setSelectedAccount(accs[0].name); 
      }
    };
    fetchAccounts();
  }, []);

  const handleFileUpload = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        setFileData(results.data);
      }
    });
  };

  const handleImport = async () => {
    if (fileData.length === 0 || !selectedAccount) return;
    setIsProcessing(true);

    try {
      for (const row of fileData) {
        // Excel ထဲက Column နာမည်တွေနဲ့ ချိတ်ဆက်ခြင်း (Date, Description, Amount)
        // နာမည်မတူရင် ဒီနေရာမှာ ပြင်ပေးရပါမယ်
        const amt = parseFloat(row.Amount || row.amount || 0);
        if (amt === 0) continue;

        await addDoc(collection(db, "transactions"), {
          description: row.Description || row.description || "CSV Import",
          amount: Math.abs(amt),
          category: amt > 0 ? 'income' : 'other',
          bankAccount: selectedAccount,
          transactionDate: new Date(row.Date || row.date || new Date()),
          date: serverTimestamp(),
          uid: auth.currentUser?.uid,
          verified: true // CSV ကလာတာမို့လို့ တိုက်ရိုက် Verified လုပ်လိုက်ပါမယ်
        });
      }
      setIsDone(true);
      setFileData([]);
    } catch (err) {
      alert("Import failed. Please check your CSV format.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Layout>
      <div className="pt-6 pb-20 max-w-4xl mx-auto px-4">
        <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic mb-10">Excel / CSV Import</h2>

        <div className="bg-white p-10 rounded-[3rem] shadow-2xl border-2 border-slate-50 space-y-8">
          {/* Step 1: Select Account */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">1. Select Destination Account</label>
              <select 
                value={selectedAccount} 
                onChange={e => setSelectedAccount(e.target.value)}
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-900 outline-none focus:border-emerald-500"
              >
                {accounts.map(acc => <option key={acc.id} value={acc.name}>{acc.name}</option>)}
                <option value="Cash/Other">Cash / Other</option>
              </select>
            </div>

            {/* Step 2: Upload File */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">2. Upload CSV File</label>
              <label className="w-full cursor-pointer bg-emerald-50 border-2 border-dashed border-emerald-200 p-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-emerald-100 transition">
                <UploadCloud size={20} className="text-emerald-600" />
                <span className="font-black text-emerald-700 text-xs uppercase">{fileData.length > 0 ? `${fileData.length} Rows Found` : 'Select CSV'}</span>
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Step 3: Review & Confirm */}
          {fileData.length > 0 && (
            <div className="pt-6 border-t-2 border-slate-50">
              <div className="bg-slate-50 p-6 rounded-3xl mb-6 overflow-x-auto">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Preview (First 3 rows)</p>
                <table className="w-full text-left text-xs font-bold text-slate-600">
                  <tbody>
                    {fileData.slice(0, 3).map((row, i) => (
                      <tr key={i} className="border-b last:border-0 border-slate-200">
                        <td className="py-2">{row.Date || row.date}</td>
                        <td className="py-2">{row.Description || row.description}</td>
                        <td className="py-2 text-right">${row.Amount || row.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button 
                onClick={handleImport} 
                disabled={isProcessing}
                className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-600 transition active:scale-95 flex items-center justify-center gap-3 shadow-xl"
              >
                {isProcessing ? <><Loader2 className="animate-spin" /> IMPORTING...</> : "CONFIRM & ADD TO LEDGER"}
              </button>
            </div>
          )}

          {isDone && (
            <div className="p-6 bg-emerald-100 text-emerald-700 rounded-3xl flex items-center gap-3 font-black animate-in fade-in">
              <CheckCircle2 /> DATA IMPORTED SUCCESSFULLY!
            </div>
          )}
        </div>

        {/* Format Instruction */}
        <div className="mt-12 p-8 bg-blue-50 rounded-[2.5rem] border-2 border-blue-100">
            <h4 className="font-black text-blue-900 uppercase text-xs flex items-center gap-2 mb-3">
                <AlertCircle size={16}/> CSV Format Requirements
            </h4>
            <p className="text-blue-800 text-xs font-bold leading-relaxed">
                သင့် Excel ဖိုင်တွင် Column ခေါင်းစဉ်များကို <span className="underline">Date, Description, Amount</span> ဟု အတိအကျ ပေးထားပါ။ <br/>
                Amount တွင် Deposit ဖြစ်ပါက အပေါင်းဂဏန်း (100)၊ Withdrawal ဖြစ်ပါက အနှုတ်ဂဏန်း (-100) ဟု ထည့်သွင်းပါ။
            </p>
        </div>
      </div>
    </Layout>
  );
}