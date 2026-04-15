// app/transactions/page.tsx
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth, storage } from '@/lib/firebase'; // storage ထည့်ထားပါတယ်
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, where, updateDoc, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; // storage function များ
import { Trash2, Download, Image as ImageIcon, Search, Filter, Edit3, X, CheckCircle2, AlertTriangle, Camera } from 'lucide-react'; 
import { TAX_CATEGORIES } from '@/lib/constants';

export default function TransactionsList() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showOnlyReceipts, setShowOnlyReceipts] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  useEffect(() => {
      const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        if (user) {
          const q = query(collection(db, "transactions"), where("uid", "==", user.uid), orderBy("date", "desc"));
          const unsubscribeData = onSnapshot(q, (snapshot) => {
            setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
          });

          try {
            const qAcc = query(collection(db, "chart_of_accounts"), where("uid", "==", user.uid));
            const accSnap = await getDocs(qAcc);
            setAccounts(accSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
          } catch (err) { console.error(err); }

          return () => unsubscribeData();
        } else { setLoading(false); }
      });
      return () => unsubscribeAuth();
  }, []);

  const isPotentialDuplicate = (item: any) => {
    const itemDate = item.date?.toDate().toLocaleDateString();
    return transactions.some(other => 
      other.id !== item.id && other.description === item.description && 
      other.amount === item.amount && other.date?.toDate().toLocaleDateString() === itemDate
    );
  };

  const toggleVerify = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "transactions", id), { verified: !currentStatus });
    } catch (error) { alert("Error updating status"); }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this record?")) {
      try { await deleteDoc(doc(db, "transactions", id)); } catch (error) { alert("Error deleting"); }
    }
  };

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;

    try {
      let finalReceiptUrl = editItem.receiptUrl;

      // အကယ်၍ ပုံအသစ် ရွေးထားတယ်ဆိုရင် Storage တင်မယ်
      if (editItem.newFile) {
        const storageRef = ref(storage, `receipts/${auth.currentUser?.uid}/${Date.now()}.jpg`);
        await uploadBytes(storageRef, editItem.newFile);
        finalReceiptUrl = await getDownloadURL(storageRef);
      }

      await updateDoc(doc(db, "transactions", editItem.id), {
        description: editItem.description,
        amount: parseFloat(editItem.amount),
        category: editItem.category,
        bankAccount: editItem.bankAccount || "Other",
        transactionDate: new Date(editItem.tempDate),
        receiptUrl: finalReceiptUrl
      });

      setEditItem(null);
      alert("Updated successfully!");
    } catch (error) { alert("Error updating record"); }
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || t.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesReceiptToggle = showOnlyReceipts ? (t.receiptUrl && t.receiptUrl !== "") : true;
    return matchesSearch && matchesReceiptToggle;
  });

  return (
    <Layout>
      <div className="pt-6 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Ledger Records</h2>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Audit & Management</p>
          </div>
          <div className="flex flex-wrap gap-3">
             <button onClick={() => setShowOnlyReceipts(!showOnlyReceipts)} className={`px-5 py-3 rounded-2xl font-black text-[10px] flex items-center gap-2 transition shadow-md ${showOnlyReceipts ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500 border-2 border-slate-100'}`}>
                <Filter size={14} /> {showOnlyReceipts ? "RECEIPTS ONLY" : "ALL RECORDS"}
             </button>
          </div>
        </div>

        <div className="relative mb-8 group px-2 md:px-0">
          <div className="absolute inset-y-0 left-6 flex items-center text-slate-300"><Search size={22} /></div>
          <input type="text" placeholder="Search records..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-16 pr-6 py-5 border-2 border-slate-100 rounded-[1.8rem] focus:border-emerald-500 outline-none font-bold text-slate-900 bg-white shadow-sm transition-all text-lg"
          />
        </div>
        
        <div className="bg-white rounded-[2.5rem] shadow-2xl border-2 border-slate-50 overflow-hidden">
          <div className="divide-y-2 divide-slate-50">
            {loading ? <p className="p-24 text-center font-black animate-pulse text-slate-200">SYNCING...</p> : filteredTransactions.map((item) => {
                const hasDuplicate = isPotentialDuplicate(item);
                const isIncome = item.category === 'income';
                return (
                  <div key={item.id} className={`p-4 md:px-8 md:py-4 flex justify-between items-center hover:bg-slate-50/50 transition border-b last:border-0 border-slate-50 group relative ${hasDuplicate ? 'bg-amber-50/30' : ''}`}>
                    {hasDuplicate && <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-amber-100 text-amber-700 px-3 py-0.5 rounded-full font-black text-[8px] flex items-center gap-1 border border-amber-200 shadow-sm z-10 animate-pulse"><AlertTriangle size={10} /> POSSIBLE DUPLICATE</div>}
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <button onClick={() => toggleVerify(item.id, item.verified)} className={`p-2 rounded-xl transition-all active:scale-90 ${item.verified ? 'bg-emerald-100 text-emerald-600 shadow-inner' : 'bg-slate-50 text-slate-200 hover:text-slate-400'}`}><CheckCircle2 size={22} /></button>
                        <div>
                          <p className="font-black text-xl text-slate-900 tracking-tight leading-tight">{item.description}</p>
                          <div className="flex flex-wrap items-center gap-3 mt-1">
                            <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${isIncome ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>{item.category.replace('_', ' ')}</span>
                            <span className="text-[9px] font-black px-3 py-1 bg-blue-50 text-blue-500 rounded-full uppercase tracking-widest italic">{item.bankAccount || 'Other'}</span>
                            <span className="text-[10px] font-bold text-slate-300 uppercase italic">{(item.transactionDate?.toDate() || item.date?.toDate())?.toLocaleDateString()}</span>
                          </div>
                        </div>
                        {item.receiptUrl && <a href={item.receiptUrl} target="_blank" className="text-emerald-500 bg-emerald-50 p-2 rounded-xl hover:bg-emerald-500 hover:text-white shadow-sm transition"><ImageIcon size={18} /></a>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 md:gap-8">
                      <p className={`text-2xl md:text-3xl font-black tracking-tighter ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>{isIncome ? '+' : '-'}${Number(item.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => {
                            const dateObj = item.transactionDate?.toDate() || item.date?.toDate() || new Date();
                            setEditItem({ ...item, tempDate: dateObj.toISOString().split('T')[0] });
                        }} className="text-slate-300 hover:text-emerald-500 p-2"><Edit3 size={22} /></button>
                        <button onClick={() => handleDelete(item.id)} className="text-slate-300 hover:text-rose-600 p-2"><Trash2 size={22} /></button>
                      </div>
                    </div>
                  </div>
                );
            })}
          </div>
        </div>
      </div>

      {/* --- Edit Modal --- */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white p-10 rounded-[2.5rem] w-full max-w-lg shadow-2xl relative animate-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
            <button onClick={() => setEditItem(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors"><X size={24} /></button>
            <h3 className="text-2xl font-black text-slate-900 mb-8 tracking-tight uppercase italic underline decoration-emerald-500 decoration-4">Update Entry</h3>
            
            <form onSubmit={handleUpdateTransaction} className="space-y-6">
              {/* Receipt Image Preview & Update */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Receipt Evidence</label>
                <div className="relative h-40 w-full bg-slate-50 rounded-3xl overflow-hidden border-2 border-dashed border-slate-200 flex items-center justify-center group shadow-inner">
                    {editItem.receiptUrl ? (
                        <>
                            <img src={editItem.receiptUrl} className="absolute inset-0 w-full h-full object-cover opacity-80" alt="r" />
                            <div className="relative z-10 bg-slate-900/50 p-3 rounded-2xl text-white opacity-0 group-hover:opacity-100 transition-opacity animate-in fade-in"><Camera size={24} /></div>
                        </>
                    ) : (
                        <div className="text-center text-slate-300 font-black"><Camera size={30} className="mx-auto mb-2" /><p className="text-[9px]">NO IMAGE ATTACHED</p></div>
                    )}
                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.readAsDataURL(file);
                            reader.onload = (ev) => setEditItem({ ...editItem, receiptUrl: ev.target?.result as string, newFile: file });
                        }
                    }} />
                </div>
              </div>

              <input type="text" value={editItem.description} onChange={e => setEditItem({...editItem, description: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-900 focus:border-emerald-500 outline-none" required />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">Amount ($)</label>
                  <input type="number" step="0.01" value={editItem.amount} onChange={e => setEditItem({...editItem, amount: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-xl text-slate-900 focus:border-emerald-500 outline-none" required />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">Date</label>
                  <input type="date" value={editItem.tempDate} onChange={e => setEditItem({...editItem, tempDate: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 focus:border-emerald-500 outline-none" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <select value={editItem.category} onChange={e => setEditItem({...editItem, category: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold appearance-none outline-none">
                    {TAX_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <select value={editItem.bankAccount || "Cash/Other"} onChange={e => setEditItem({...editItem, bankAccount: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold appearance-none outline-none">
                    {accounts.map(acc => <option key={acc.id} value={acc.name}>{acc.name}</option>)}
                    <option value="Cash/Other">Cash / Other</option>
                </select>
              </div>

              <button type="submit" className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-600 transition shadow-xl active:scale-95">Save Changes</button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}