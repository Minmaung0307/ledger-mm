// app/payroll/page.tsx
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { Users, UserPlus, DollarSign } from 'lucide-react';
import Link from 'next/link';

export default function Payroll() {
  const [contractors, setContractors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(collection(db, "contractors"), where("uid", "==", user.uid));
        const unsubscribeData = onSnapshot(q, (snapshot) => {
          setContractors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setLoading(false);
        });
        return () => unsubscribeData();
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const handlePay = async (cName: string) => {
    const amount = prompt(`Enter payment amount for ${cName}:`);
    if (!amount || isNaN(Number(amount))) return;

    try {
      await addDoc(collection(db, "transactions"), {
        description: `Payroll Payment: ${cName}`,
        amount: parseFloat(amount),
        category: 'contract_labor', // IRS Schedule C Category
        date: serverTimestamp(),
        uid: auth.currentUser?.uid,
      });
      alert(`Payment of $${amount} recorded in Ledger!`);
    } catch (err) {
      alert("Error recording payment");
    }
  };

  return (
    <Layout>
      <div className="pt-4 pb-20">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight text-center md:text-left">Contractors</h2>
            <p className="text-slate-400 font-bold uppercase text-[10px] mt-1 tracking-widest">US 1099-NEC Management</p>
          </div>
          <Link href="/payroll/add" className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-xs shadow-xl flex items-center gap-2 hover:bg-emerald-600 transition">
            <UserPlus size={18}/> ADD NEW
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {loading ? (
             <p className="p-10 text-center font-black animate-pulse text-slate-300">LOADING TEAM...</p>
          ) : contractors.length === 0 ? (
            <div className="bg-white p-20 rounded-[3rem] border-4 border-dashed border-slate-100 text-center">
                <Users size={60} className="mx-auto text-slate-100 mb-6" />
                <h3 className="text-xl font-black text-slate-900 italic">No contractors yet.</h3>
            </div>
          ) : (
            contractors.map(c => (
              <div key={c.id} className="bg-white p-6 rounded-[2.5rem] shadow-xl border-2 border-slate-50 flex justify-between items-center group hover:border-emerald-500 transition-all">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-400 text-xl group-hover:bg-emerald-100 group-hover:text-emerald-600 transition">
                        {c.name.charAt(0)}
                    </div>
                    <div>
                        <p className="font-black text-slate-900 text-xl tracking-tight">{c.name}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.taxId || 'No Tax ID'}</p>
                    </div>
                </div>
                <button 
                    onClick={() => handlePay(c.name)}
                    className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-6 py-3 rounded-xl font-black text-xs hover:bg-emerald-600 hover:text-white transition shadow-sm"
                >
                    <DollarSign size={16}/> PAY
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}