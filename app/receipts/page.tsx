// app/receipts/page.tsx
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Image as ImageIcon, Search, ExternalLink } from 'lucide-react';

export default function ReceiptGallery() {
  const [receipts, setReceipts] = useState<any[]>([]);

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(collection(db, "transactions"), where("uid", "==", user.uid), where("receiptUrl", "!=", ""));
        onSnapshot(q, (snapshot) => {
          setReceipts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
      }
    });
  }, []);

  return (
    <Layout>
      <div className="pt-6 pb-20 px-4">
        <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tighter">Receipt Gallery</h2>
        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-10">All your tax evidence in one place</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {receipts.map(r => (
            <div key={r.id} className="group relative bg-white rounded-[2rem] overflow-hidden shadow-lg border-2 border-slate-50 hover:border-emerald-500 transition-all">
               <img src={r.receiptUrl} className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500" alt="receipt" />
               <div className="p-4 bg-white relative z-10">
                  <p className="font-black text-slate-900 truncate text-sm">{r.description}</p>
                  <p className="text-emerald-600 font-black text-xs mt-1">${r.amount}</p>
                  <a href={r.receiptUrl} target="_blank" className="absolute top-2 right-2 p-2 bg-white/90 rounded-full shadow-md text-slate-400 hover:text-emerald-600 opacity-0 group-hover:opacity-100 transition">
                    <ExternalLink size={14} />
                  </a>
               </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}