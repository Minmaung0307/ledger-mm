// app/receipts/page.tsx
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { ImageIcon, Search, ExternalLink, Calendar, DollarSign, Trash2 } from 'lucide-react';

export default function ReceiptGallery() {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // ၁။ User ရဲ့ စာရင်းအားလုံးကို အရင်ဆွဲထုတ်မယ်
        const q = query(
          collection(db, "transactions"), 
          where("uid", "==", user.uid),
          orderBy("date", "desc")
        );

        const unsubscribeData = onSnapshot(q, (snapshot) => {
          const allItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          // ၂။ ပုံ (receiptUrl) တကယ်ရှိတဲ့ စာရင်းတွေကိုပဲ Gallery ထဲ ထည့်မယ်
          const itemsWithImages = allItems.filter((item: any) => 
            item.receiptUrl && item.receiptUrl.trim() !== ""
          );

          setReceipts(itemsWithImages);
          setLoading(false);
        }, (err) => {
          console.error("Gallery Error:", err);
          setLoading(false);
        });

        return () => unsubscribeData();
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Search Logic
  const filteredReceipts = receipts.filter(r => 
    r.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="pt-6 pb-40 px-4 max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
                <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Receipts Gallery</h2>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-2 flex items-center gap-2">
                    <ImageIcon size={14} className="text-emerald-500" /> Digital Tax Evidence Archive
                </p>
            </div>
            
            {/* Search within Gallery */}
            <div className="relative w-full md:w-72">
                <input 
                    type="text" 
                    placeholder="Search merchant..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-sm focus:border-emerald-500 outline-none transition-all"
                />
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
            </div>
        </div>

        {loading ? (
            <p className="p-20 text-center font-black animate-pulse text-slate-300 uppercase tracking-widest">Scanning Archive...</p>
        ) : filteredReceipts.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 p-20 rounded-[3rem] border-4 border-dashed border-slate-100 dark:border-slate-700 text-center">
                <ImageIcon size={60} className="mx-auto text-slate-100 dark:text-slate-700 mb-6" />
                <h3 className="text-xl font-black text-slate-400 uppercase tracking-tight">No Receipts Found</h3>
                <p className="text-slate-300 text-xs font-bold mt-2">Upload photos in 'Add Record' to see them here.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {filteredReceipts.map(r => (
                    <div key={r.id} className="group relative bg-white dark:bg-slate-800 rounded-[2.5rem] overflow-hidden shadow-xl border-2 border-slate-50 dark:border-slate-700 hover:border-emerald-500 transition-all duration-500">
                        {/* Image Preview */}
                        <div className="relative h-56 overflow-hidden">
                            <img 
                                src={r.receiptUrl} 
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                                alt="receipt" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                                <a href={r.receiptUrl} target="_blank" rel="noreferrer" className="w-full bg-white text-slate-900 py-3 rounded-xl font-black text-[10px] uppercase text-center shadow-2xl flex items-center justify-center gap-2 active:scale-95 transition-all">
                                    Full View <ExternalLink size={12}/>
                                </a>
                            </div>
                        </div>

                        {/* Info Section */}
                        <div className="p-6">
                            <p className="font-black text-slate-900 dark:text-white text-lg truncate leading-tight mb-3">
                                {r.description}
                            </p>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-black text-sm">
                                        <DollarSign size={14}/> {Number(r.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                    </div>
                                    <span className="text-[9px] font-black bg-slate-100 dark:bg-slate-700 text-slate-400 px-2 py-1 rounded-md uppercase">
                                        {r.category}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px] uppercase tracking-tighter">
                                    <Calendar size={12}/> {r.transactionDate?.toDate?.().toLocaleDateString() || r.date?.toDate?.().toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </Layout>
  );
}