// app/banking/import/page.tsx
"use client";
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import Papa from 'papaparse'; 
import * as XLSX from 'xlsx'; 
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, Info } from 'lucide-react';

interface Account { id: string; name: string; }

export default function CSVImport() {
  const [fileData, setFileData] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
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

    const fileExtension = file.name.split('.').pop().toLowerCase();
    const reader = new FileReader();

    reader.onload = (evt) => {
      let data: any[] = [];
      if (fileExtension === 'csv') {
        const text = evt.target?.result as string;
        const results = Papa.parse(text, { header: true, skipEmptyLines: true });
        data = results.data;
      } else {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        data = XLSX.utils.sheet_to_json(ws);
      }

      // --- Smart Column Mapping (လူကြီးမင်း၏ Excel နှင့် ကိုက်ညီအောင် ပြင်ဆင်ခြင်း) ---
      const normalizedData = data.map(row => ({
        date: row['Transaction Date'] || row['Date'] || row['date'] || row['date_of_transaction'],
        description: row['Description'] || row['description'] || row['Memo'] || row['Merchant'],
        amount: row['Amount'] || row['amount'] || row['Value'] || row['Price']
      })).filter(item => item.date && item.description && item.amount); // မပြည့်စုံတဲ့ Row တွေ ဖယ်မယ်

      setFileData(normalizedData);
      setIsDone(false);
    };

    if (fileExtension === 'csv') reader.readAsText(file);
    else reader.readAsBinaryString(file);
  };

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
      alert("Successfully synced all transactions!");
    } catch (err) {
      alert("Error during import. Please check date format.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Layout>
      <div className="pt-6 pb-40 max-w-5xl mx-auto px-4">
        <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic mb-10">Data Import Center</h2>

        <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-2xl border-2 border-slate-50 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-2">1. Select Destination Account</label>
              <select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-900 focus:border-emerald-500 transition-all">
                {accounts.map(acc => <option key={acc.id} value={acc.name}>{acc.name}</option>)}
                <option value="Cash/Other">Cash / Other</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-2">2. Upload File (.xlsx or .csv)</label>
              <label className="w-full cursor-pointer bg-emerald-50 border-2 border-dashed border-emerald-200 p-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-emerald-100 transition-all shadow-inner">
                <UploadCloud size={20} className="text-emerald-500" />
                <span className="font-black text-emerald-700 text-xs uppercase">{fileData.length > 0 ? `${fileData.length} Valid Records Found` : 'Choose File'}</span>
                <input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>

          {fileData.length > 0 && (
            <div className="pt-6 border-t-2 border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest text-center">Data Preview (Ready to Sync)</p>
              <div className="bg-slate-50 p-4 rounded-3xl mb-8 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-200"><th className="pb-2">Date</th><th className="pb-2">Description</th><th className="pb-2 text-right">Amount</th></tr>
                  </thead>
                  <tbody className="font-bold text-slate-700">
                    {fileData.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-b last:border-0 border-slate-100">
                        <td className="py-3 text-slate-400">{row.date}</td>
                        <td className="py-3">{row.description}</td>
                        <td className="py-3 text-right text-slate-900">${row.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={handleImport} disabled={isProcessing} className="w-full bg-[#009669] text-white p-6 rounded-[2rem] font-black uppercase tracking-widest shadow-xl hover:bg-slate-900 transition-all active:scale-95 flex items-center justify-center gap-3">
                {isProcessing ? <><Loader2 className="animate-spin" /> SYNCING TO CLOUD...</> : "CONFIRM & SYNC TO LEDGER"}
              </button>
            </div>
          )}

          {isDone && (
            <div className="p-6 bg-emerald-50 border-2 border-emerald-100 text-emerald-700 rounded-3xl flex items-center gap-3 font-black animate-in zoom-in">
              <CheckCircle2 size={24}/> IMPORT COMPLETE! VIEW YOUR DASHBOARD.
            </div>
          )}
        </div>

        {/* --- Updated File Requirements with Example Table --- */}
        <div className="mt-12 p-10 bg-blue-50 rounded-[3rem] border-2 border-blue-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10"><Info size={80}/></div>
            <h4 className="font-black text-blue-900 uppercase text-xs flex items-center gap-2 mb-6 tracking-widest"><AlertCircle size={18}/> File Format Requirements</h4>
            
            <p className="text-blue-800 text-sm font-bold mb-6">သင့် Excel ဖိုင်တွင် Column ခေါင်းစဉ်များကို အောက်ပါအတိုင်း (သို့မဟုတ်) ဆင်တူစွာ ပေးထားပါ -</p>
            
            {/* Example Table UI */}
            <div className="bg-white/60 p-4 rounded-2xl border border-blue-200 shadow-inner max-w-md">
                <table className="w-full text-[10px] font-black uppercase text-blue-400 text-center">
                    <thead>
                        <tr className="border-b border-blue-100">
                            <th className="p-2 border-r border-blue-100 bg-blue-100/50 rounded-tl-lg">Transaction Date</th>
                            <th className="p-2 border-r border-blue-100 bg-blue-100/50">Description</th>
                            <th className="p-2 bg-blue-100/50 rounded-tr-lg">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="text-blue-900">
                        <tr className="border-b border-blue-100">
                            <td className="p-2 border-r border-blue-100">04/01/2026</td>
                            <td className="p-2 border-r border-blue-100 text-left">Publix Commission</td>
                            <td className="p-2">-5012.19</td>
                        </tr>
                        <tr>
                            <td className="p-2 border-r border-blue-100">04/02/2026</td>
                            <td className="p-2 border-r border-blue-100 text-left">Customer Deposit</td>
                            <td className="p-2">1200.00</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div className="mt-6 space-y-2 text-[11px] font-bold text-blue-600/80 italic">
                <p>• ပထမဆုံး စာကြောင်း (Header) မှာ နာမည်မှန်ဖို့ လိုပါတယ်။</p>
                <p>• အသုံးစရိတ်များကို အနှုတ်ဂဏန်း (-) ဖြင့် ရေးနိုင်ပါတယ်။</p>
                <p>• အကယ်၍ Preview တွင် ဘာမှမပေါ်ပါက Column နာမည်များကို Transaction Date ဟု ပြင်ပေးပါ။</p>
            </div>
        </div>
      </div>
    </Layout>
  );
}