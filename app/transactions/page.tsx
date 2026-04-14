// app/transactions/page.tsx
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, where, updateDoc } from 'firebase/firestore';
import { Trash2, Download, Image as ImageIcon, Search, Filter, Edit3, X, CheckCircle2 } from 'lucide-react'; // CheckCircle2 ပါအောင် ထည့်လိုက်ပါပြီ
import { TAX_CATEGORIES } from '@/lib/constants';

export default function TransactionsList() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showOnlyReceipts, setShowOnlyReceipts] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(
          collection(db, "transactions"),
          where("uid", "==", user.uid),
          orderBy("date", "desc")
        );
        const unsubscribeData = onSnapshot(q, (snapshot) => {
          setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setLoading(false);
        });
        return () => unsubscribeData();
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // ၁။ Bank Reconciliation (ဘဏ်စာရင်းနှင့် တိုက်စစ်ပြီးကြောင်း အမှန်ခြစ်ခြင်း)
  const toggleVerify = async (id: string, currentStatus: boolean) => {
    try {
      const docRef = doc(db, "transactions", id);
      await updateDoc(docRef, { verified: !currentStatus });
    } catch (error) {
      alert("Error updating verification status");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this record?")) {
      try {
        await deleteDoc(doc(db, "transactions", id));
      } catch (error) {
        alert("Error deleting record");
      }
    }
  };

  // ၂။ စာရင်းပြင်ဆင်ခြင်း Logic
  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    try {
      const docRef = doc(db, "transactions", editItem.id);
      await updateDoc(docRef, {
        description: editItem.description,
        amount: parseFloat(editItem.amount),
        category: editItem.category
      });
      setEditItem(null);
      alert("Updated successfully!");
    } catch (error) {
      alert("Error updating record");
    }
  };

  const exportToCSV = () => {
    if (transactions.length === 0) return alert("No data to export");
    const headers = "Date,Description,Category,Amount,Verified\n";
    const rows = transactions.map(t => {
      const date = t.date?.toDate().toLocaleDateString() || "N/A";
      return `${date},${t.description},${t.category},${t.amount},${t.verified ? 'YES' : 'NO'}`;
    }).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax_records_${new Date().getFullYear()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = 
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesReceiptToggle = showOnlyReceipts ? (t.receiptUrl && t.receiptUrl !== "") : true;
    return matchesSearch && matchesReceiptToggle;
  });

  return (
    <Layout>
      <div className="pt-6 pb-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Ledger Records</h2>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1 italic">Reconciliation & Management</p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => setShowOnlyReceipts(!showOnlyReceipts)}
              className={`px-5 py-3 rounded-2xl font-black text-[10px] flex items-center gap-2 transition shadow-md active:scale-95 ${
                showOnlyReceipts ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500 border-2 border-slate-100'
              }`}
            >
              <Filter size={14} />
              {showOnlyReceipts ? "SHOWING RECEIPTS ONLY" : "FILTER BY RECEIPT"}
            </button>
            <button onClick={exportToCSV} className="flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] shadow-xl transition active:scale-95">
              <Download size={16} /> EXPORT CSV
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-8 group px-2 md:px-0">
          <div className="absolute inset-y-0 left-6 flex items-center text-slate-300"><Search size={22} /></div>
          <input 
            type="text" placeholder="Search by description..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-16 pr-6 py-5 border-2 border-slate-100 rounded-[1.8rem] focus:border-emerald-500 outline-none font-bold text-slate-900 bg-white shadow-sm transition-all text-lg"
          />
        </div>
        
        {/* Transaction List */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl border-2 border-slate-50 overflow-hidden">
          <div className="divide-y-2 divide-slate-50">
            {loading ? (
              <p className="p-24 text-center font-black animate-pulse text-slate-200 uppercase tracking-widest text-xs">Syncing Cloud Ledger...</p>
            ) : filteredTransactions.length === 0 ? (
              <p className="p-24 text-center text-slate-300 font-black italic">No records found matching filters.</p>
            ) : (
              filteredTransactions.map((item) => (
                <div key={item.id} className="p-4 md:px-8 md:py-3 flex justify-between items-center hover:bg-slate-50/50 transition border-b last:border-0 border-slate-50 group">
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      {/* အမှန်ခြစ်ခလုတ် - ဘဏ်စာရင်းနဲ့ တိုက်စစ်ပြီးရင် နှိပ်ရန် */}
                      <button 
                        onClick={() => toggleVerify(item.id, item.verified)}
                        className={`p-2 rounded-xl transition-all active:scale-90 ${item.verified ? 'bg-emerald-100 text-emerald-600 shadow-inner' : 'bg-slate-50 text-slate-200 hover:text-slate-400'}`}
                        title={item.verified ? "Verified with Bank" : "Mark as Verified"}
                      >
                        <CheckCircle2 size={22} />
                      </button>

                      <p className="font-black text-xl text-slate-900 tracking-tight">{item.description}</p>
                      
                      {item.receiptUrl && (
                        <a href={item.receiptUrl} target="_blank" rel="noreferrer" className="text-emerald-500 bg-emerald-50 p-2 rounded-xl transition hover:bg-emerald-500 hover:text-white shadow-sm">
                          <ImageIcon size={18} />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-0.5 ml-10">
                      <span className="text-[10px] font-black px-4 py-1.5 bg-slate-100 text-slate-500 rounded-full uppercase tracking-widest">
                        {item.category.replace('_', ' ')}
                      </span>
                      <span className="text-[11px] font-bold text-slate-300 uppercase tracking-tighter italic">
                        {item.date?.toDate().toLocaleDateString() || 'Recently'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 md:gap-6">
                    <p className={`text-2xl md:text-2xl font-black tracking-tighter ${item.category === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {item.category === 'income' ? '+' : '-'}${Number(item.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </p>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditItem({id: item.id, ...item})} className="text-slate-300 hover:text-emerald-500 p-2 hover:bg-emerald-50 rounded-xl transition">
                            <Edit3 size={22} />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="text-slate-300 hover:text-rose-600 p-2 hover:bg-rose-50 rounded-xl transition">
                            <Trash2 size={22} />
                        </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* --- Edit Modal --- */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white p-10 rounded-[2.5rem] w-full max-w-md shadow-2xl relative animate-in zoom-in duration-200">
            <button onClick={() => setEditItem(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors"><X size={24} /></button>
            <h3 className="text-2xl font-black text-slate-900 mb-8 tracking-tight uppercase">Update Transaction</h3>
            <form onSubmit={handleUpdateTransaction} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Description</label>
                <input type="text" value={editItem.description} onChange={e => setEditItem({...editItem, description: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-emerald-500 focus:bg-white transition-all" required />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Amount ($)</label>
                <input type="number" step="0.01" value={editItem.amount} onChange={e => setEditItem({...editItem, amount: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-xl outline-none focus:border-emerald-500 focus:bg-white transition-all" required />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Category</label>
                <select value={editItem.category} onChange={e => setEditItem({...editItem, category: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-emerald-500 focus:bg-white appearance-none transition-all">
                    {TAX_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-600 transition shadow-xl active:scale-95">Apply Changes</button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}