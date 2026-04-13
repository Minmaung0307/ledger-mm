// app/transactions/page.tsx
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, where } from 'firebase/firestore';
import { Trash2, Download, Image as ImageIcon, Search } from 'lucide-react';

export default function TransactionsList() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState(''); // ရှာဖွေဖို့ state
  const [loading, setLoading] = useState(true);

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

  // Search Logic: Description နဲ့ Category ထဲမှာ လိုက်ရှာမယ်
  const filteredTransactions = transactions.filter(t => 
    t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="pt-6 pb-20">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Records</h2>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">History & Management</p>
          </div>
          
          <button 
            onClick={exportToCSV} 
            className="flex items-center justify-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs hover:bg-slate-800 transition active:scale-95 shadow-2xl"
          >
            <Download size={18} />
            EXPORT TO CSV
          </button>
        </div>

        {/* Search Bar Area */}
        <div className="relative mb-8 group">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition">
            <Search size={20} />
          </div>
          <input 
            type="text"
            placeholder="Search descriptions or categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-14 pr-6 py-5 border-2 border-slate-100 rounded-[1.5rem] focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 focus:outline-none font-bold text-slate-900 bg-white shadow-sm transition-all text-lg placeholder:text-slate-300"
          />
        </div>
        
        {/* Transactions Table/List */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl border-2 border-slate-50 overflow-hidden">
          <div className="divide-y-2 divide-slate-50">
            {loading ? (
              <p className="p-20 text-center font-black animate-pulse text-slate-300">LOADING RECORDS...</p>
            ) : filteredTransactions.length === 0 ? (
              <div className="p-20 text-center">
                <p className="text-slate-300 font-black text-2xl italic tracking-tighter">No transactions match your search.</p>
              </div>
            ) : (
              filteredTransactions.map((item) => (
                <div key={item.id} className="p-6 md:p-8 flex justify-between items-center hover:bg-slate-50/50 transition group">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p className="font-black text-xl text-slate-900 group-hover:text-emerald-600 transition">{item.description}</p>
                      {/* ပုံရှိရင် Icon လေး ပြမယ် */}
                      {item.receiptUrl && (
                        <a 
                          href={item.receiptUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-emerald-500 hover:bg-emerald-500 hover:text-white p-2 rounded-xl transition shadow-sm bg-emerald-50"
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
                      <span className="text-xs font-bold text-slate-300">
                        {item.date?.toDate().toLocaleDateString() || 'Recently'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-8">
                    <p className={`text-2xl md:text-3xl font-black ${item.category === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
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