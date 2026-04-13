// app/invoices/page.tsx
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Plus, FileText, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';

export default function Invoices() {
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(
          collection(db, "invoices"),
          where("uid", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const unsubscribeData = onSnapshot(q, (snapshot) => {
          setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribeData();
      }
    });
    return () => unsubscribeAuth();
  }, []);

  return (
    <Layout>
      <div className="pt-6 pb-20">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Invoices</h2>
            <p className="text-slate-400 font-bold uppercase text-[10px] mt-1 tracking-widest">Client Billing</p>
          </div>
          <Link href="/invoices/add" className="bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-xl hover:bg-emerald-700 transition flex items-center gap-3 font-black text-xs">
            <Plus size={20} /> CREATE INVOICE
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {invoices.length === 0 ? (
            <div className="bg-white p-20 rounded-[3rem] border-4 border-dashed border-slate-100 text-center">
              <FileText size={50} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-400 font-bold">No invoices created yet.</p>
            </div>
          ) : (
            invoices.map(inv => (
              <div key={inv.id} className="bg-white p-6 rounded-[2rem] border-2 border-slate-50 shadow-sm flex justify-between items-center">
                <div>
                  <p className="font-black text-slate-900 text-xl">{inv.clientName}</p>
                  <p className="text-xs font-bold text-slate-400">Invoice #{inv.invoiceNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-slate-900">${Number(inv.amount).toLocaleString()}</p>
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                    {inv.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}