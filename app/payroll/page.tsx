// app/payroll/page.tsx
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
// ပြင်ဆင်ချက် ၁: doc နဲ့ updateDoc ပါအောင် ထည့်သွင်းထားပါတယ်
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
// ပြင်ဆင်ချက် ၂: UserX icon ပါအောင် ထည့်သွင်းထားပါတယ်
import { Users, UserPlus, DollarSign, X, UserX } from 'lucide-react';
import Link from 'next/link';

export default function Payroll() {
  const [contractors, setContractors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState<any>(null);
  const [payAmount, setPayAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // ပြင်ဆင်ချက် ၃: query ရဲ့ ကွင်းပိတ်နေရာ မှန်အောင် ပြင်ပေးထားပါတယ်
        const q = query(
          collection(db, "contractors"), 
          where("uid", "==", user.uid), 
          where("status", "==", "active")
        );
        
        const unsubscribeData = onSnapshot(q, (snapshot) => {
          setContractors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setLoading(false);
        });
        return () => unsubscribeData();
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // --- Archive Function ---
  const handleArchive = async (id: string) => {
    if (confirm("ဒီလူက အလုပ်ထွက်သွားပြီလား? Archive လုပ်လိုက်ရင် စာရင်းဟောင်းတွေ မပျောက်ပေမယ့် ဒီ List ထဲမှာ မပေါ်တော့ပါဘူး။")) {
      try {
        const docRef = doc(db, "contractors", id);
        await updateDoc(docRef, { status: 'archived' }); 
        alert("Success! Archived.");
      } catch (err) {
        alert("Error archiving user");
      }
    }
  };

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
            <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight italic uppercase">Contractors</h2>
            <p className="text-slate-400 font-bold uppercase text-[10px] mt-1 tracking-widest italic">US 1099-NEC Management</p>
          </div>
          <Link href="/payroll/add" className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-xs shadow-xl flex items-center gap-2 hover:bg-emerald-600 transition">
            <UserPlus size={18}/> ADD NEW
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {loading ? (
             <p className="p-10 text-center font-black animate-pulse text-slate-300">SYNCING...</p>
          ) : contractors.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 p-20 rounded-[3rem] border-4 border-dashed border-slate-100 dark:border-slate-700 text-center">
                <Users size={60} className="mx-auto text-slate-100 dark:text-slate-700 mb-6" />
                <h3 className="text-xl font-black text-slate-400 italic">No Active Contractors.</h3>
                <p className="text-slate-300 text-xs font-bold mt-2 italic">Note: Old data might not show if "status" field is missing.</p>
            </div>
          ) : (
            contractors.map(c => (
              <div key={c.id} className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-xl border-2 border-slate-50 dark:border-slate-700 flex justify-between items-center group transition-all hover:border-emerald-500">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center font-black text-slate-400 text-xl border-2 border-slate-100 dark:border-slate-700">
                        {c.name?.charAt(0) || 'C'}
                    </div>
                    <div>
                        <p className="font-black text-slate-900 dark:text-white text-xl tracking-tight">{c.name}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.taxId || 'No Tax ID'}</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    {/* ပြင်ဆင်ချက် ၄: Archive ခလုတ်လေး ထည့်ပေးလိုက်ပါပြီ */}
                    <button 
                        onClick={() => handleArchive(c.id)}
                        className="p-3 text-slate-200 hover:text-rose-500 transition-colors"
                        title="Archive Employee"
                    >
                        <UserX size={20} />
                    </button>

                    <button 
                        onClick={() => { setSelectedContractor(c); setShowModal(true); }}
                        className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-black text-xs hover:bg-slate-900 transition shadow-lg"
                    >
                        <DollarSign size={16}/> PAY
                    </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- Custom Modal --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 relative animate-in zoom-in duration-200">
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
                  className="w-full pl-10 pr-4 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-2xl font-black focus:border-emerald-500 focus:bg-white outline-none transition-all text-slate-900"
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