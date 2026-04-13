// app/transactions/page.tsx
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, where } from 'firebase/firestore';
import { Trash2, Download, Image as ImageIcon, Search, Filter } from 'lucide-react';

export default function TransactionsList() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showOnlyReceipts, setShowOnlyReceipts] = useState(false);

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

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this record?")) {
      try {
        await deleteDoc(doc(db, "transactions", id));
      } catch (error) {
        alert("Error deleting record");
      }
    }
  };

  const exportToCSV = () => {
    if (transactions.length === 0) return alert("No data to export");
    const headers = "Date,Description,Category,Amount\n";
    const rows = transactions.map(t => {
      const date = t.date?.toDate().toLocaleDateString() || "N/A";
      return `${date},${t.description},${t.category},${t.amount}`;
    }).join("\n");

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax_records_${new Date().getFullYear()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // --- ပြင်ဆင်လိုက်သော Logic အပိုင်း ---
  const filteredTransactions = transactions.filter(t => {
    // ၁။ Search Logic (Description သို့မဟုတ် Category ထဲမှာ စာသားပါသလား စစ်မယ်)
    const matchesSearch = 
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase());

    // ၂။ Receipt Toggle Logic (Toggle ဖွင့်ထားရင် ပုံရှိတဲ့ဟာပဲ ပြမယ်၊ ပိတ်ထားရင် အကုန်ပြမယ်)
    const matchesReceiptToggle = showOnlyReceipts ? (t.receiptUrl && t.receiptUrl !== "") : true;

    return matchesSearch && matchesReceiptToggle;
  });

  return (
    <Layout>
      <div className="pt-6 pb-20">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Records</h2>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Income & Expenses Gallery</p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => setShowOnlyReceipts(!showOnlyReceipts)}
              className={`px-5 py-3 rounded-2xl font-black text-[10px] flex items-center gap-2 transition shadow-md active:scale-95 ${
                showOnlyReceipts 
                ? 'bg-emerald-600 text-white shadow-emerald-200' 
                : 'bg-white text-slate-500 border-2 border-slate-100 hover:bg-slate-50'
              }`}
            >
              <Filter size={14} />
              {showOnlyReceipts ? "SHOWING RECEIPTS ONLY" : "FILTER BY RECEIPT"}
            </button>

            <button 
              onClick={exportToCSV} 
              className="flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] hover:bg-slate-800 transition active:scale-95 shadow-xl"
            >
              <Download size={16} />
              EXPORT CSV
            </button>
          </div>
        </div>

        {/* Search Bar Area */}
        <div className="relative mb-8 group">
          <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-300 group-focus-within:text-emerald-500 transition">
            <Search size={22} />
          </div>
          <input 
            type="text"
            placeholder="Search by description or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-16 pr-6 py-5 border-2 border-slate-100 rounded-[1.8rem] focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 focus:outline-none font-bold text-slate-900 bg-white shadow-sm transition-all text-lg placeholder:text-slate-300"
          />
        </div>
        
        {/* Transactions Table/List */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl border-2 border-slate-50 overflow-hidden">
          <div className="divide-y-2 divide-slate-50">
            {loading ? (
              <p className="p-24 text-center font-black animate-pulse text-slate-200 tracking-widest uppercase text-xs">Syncing Ledger...</p>
            ) : filteredTransactions.length === 0 ? (
              <div className="p-24 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search size={30} className="text-slate-200" />
                </div>
                <p className="text-slate-300 font-black text-xl italic tracking-tight">No records match your filters.</p>
              </div>
            ) : (
              filteredTransactions.map((item) => (
                <div key={item.id} className="p-6 md:p-8 flex justify-between items-center hover:bg-slate-50/50 transition group border-b last:border-0 border-slate-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <p className="font-black text-xl text-slate-900 group-hover:text-emerald-600 transition tracking-tight">{item.description}</p>
                      {item.receiptUrl && (
                        <a 
                          href={item.receiptUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-emerald-500 bg-emerald-50 p-2 rounded-xl transition hover:bg-emerald-500 hover:text-white shadow-sm"
                          title="View Receipt"
                        >
                          <ImageIcon size={18} />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-[10px] font-black px-4 py-1.5 bg-slate-100 text-slate-500 rounded-full uppercase tracking-widest">
                        {item.category.replace('_', ' ')}
                      </span>
                      <span className="text-[11px] font-bold text-slate-300 uppercase tracking-tighter">
                        {item.date?.toDate().toLocaleDateString() || 'Recently'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-8">
                    <p className={`text-2xl md:text-3xl font-black tracking-tighter ${item.category === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {item.category === 'income' ? '+' : '-'}${Number(item.amount).toLocaleString()}
                    </p>
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="text-slate-200 hover:text-rose-600 transition-all p-3 hover:bg-rose-50 rounded-2xl active:scale-90"
                    >
                      <Trash2 size={24} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}