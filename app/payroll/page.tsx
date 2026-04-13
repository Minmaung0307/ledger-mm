// app/payroll/page.tsx
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { Users, UserPlus, DollarSign, X } from 'lucide-react';
import Link from 'next/link';

export default function Payroll() {
  const [contractors, setContractors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState<any>(null);
  const [payAmount, setPayAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

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

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payAmount || isNaN(Number(payAmount)) || isProcessing) return;

    setIsProcessing(true);
    try {
      await addDoc(collection(db, "transactions"), {
        description: `Payroll Payment: ${selectedContractor.name}`,
        amount: parseFloat(payAmount),
        category: 'contract_labor',
        date: serverTimestamp(),
        uid: auth.currentUser?.uid,
      });
      setShowModal(false);
      setPayAmount('');
      alert("Success! Recorded in Ledger.");
    } catch (err) {
      alert("Error recording payment");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Layout>
      <div className="pt-4 pb-20 px-4">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Contractors</h2>
            <p className="text-slate-400 font-bold uppercase text-[10px] mt-1 tracking-widest italic">US 1099-NEC Management</p>
          </div>
          <Link href="/payroll/add" className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-xs shadow-xl flex items-center gap-2 hover:bg-emerald-600 transition">
            <UserPlus size={18}/> ADD NEW
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {loading ? (
             <p className="p-10 text-center font-black animate-pulse text-slate-300">LOADING...</p>
          ) : contractors.length === 0 ? (
            <div className="bg-white p-20 rounded-[3rem] border-4 border-dashed border-slate-100 text-center">
                <Users size={60} className="mx-auto text-slate-100 mb-6" />
                <h3 className="text-xl font-black text-slate-900">No contractors yet.</h3>
            </div>
          ) : (
            contractors.map(c => (
              <div key={c.id} className="bg-white p-6 rounded-[2.5rem] shadow-xl border-2 border-slate-50 flex justify-between items-center group">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-slate-400 text-xl group-hover:bg-emerald-100 group-hover:text-emerald-600 transition">
                        {c.name.charAt(0)}
                    </div>
                    <div>
                        <p className="font-black text-slate-900 text-xl tracking-tight">{c.name}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.taxId || 'No Tax ID'}</p>
                    </div>
                </div>
                <button 
                    onClick={() => { setSelectedContractor(c); setShowModal(true); }}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-black text-xs hover:bg-slate-900 transition shadow-lg"
                >
                    <DollarSign size={16}/> PAY
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- Custom Modal --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900">
              <X size={24} />
            </button>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Record Payment</h3>
            <p className="text-slate-500 font-medium mb-6">Enter the amount paid to <span className="text-emerald-600 font-black">{selectedContractor?.name}</span></p>
            
            <form onSubmit={handlePaySubmit} className="space-y-6">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300">$</span>
                <input 
                  type="number" 
                  autoFocus
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full pl-10 pr-4 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-2xl font-black focus:border-emerald-500 focus:bg-white outline-none transition-all"
                  placeholder="0.00"
                  required
                />
              </div>
              <button 
                type="submit" 
                disabled={isProcessing}
                className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black tracking-widest hover:bg-slate-900 transition shadow-xl"
              >
                {isProcessing ? "PROCESSING..." : "CONFIRM & RECORD"}
              </button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}