// app/accounts/page.tsx
"use client";
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { Plus, X, Landmark, CreditCard, Wallet, Trash2 } from 'lucide-react';

export default function ChartOfAccounts() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState('Assets');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // auth state ကို စောင့်ကြည့်ပြီးမှ data ဆွဲမယ် (undefined error ကာကွယ်ရန်)
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(collection(db, "chart_of_accounts"), where("uid", "==", user.uid));
        const unsubscribeData = onSnapshot(q, (snapshot) => {
          setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setLoading(false);
        });
        return () => unsubscribeData();
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    try {
      await addDoc(collection(db, "chart_of_accounts"), {
        name: accName,
        type: accType,
        uid: auth.currentUser.uid
      });
      setShowModal(false);
      setAccName('');
    } catch (err) { alert("Error adding account"); }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this account?")) {
      await deleteDoc(doc(db, "chart_of_accounts", id));
    }
  };

  return (
    <Layout>
      <div className="pt-6">
        <div className="flex justify-between items-center mb-10 px-2">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Chart of Accounts</h2>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Assets, Liabilities & Equity</p>
          </div>
          <button onClick={() => setShowModal(true)} className="bg-emerald-600 text-white px-6 py-4 rounded-2xl font-black text-xs shadow-xl flex items-center gap-2 active:scale-95 transition">
            <Plus size={18}/> ADD ACCOUNT
          </button>
        </div>

        {loading ? (
          <p className="p-20 text-center font-black animate-pulse text-slate-300">SYNCING ACCOUNTS...</p>
        ) : (
          ["Assets", "Liabilities", "Equity"].map(type => (
            <div key={type} className="mb-10">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 px-6 italic">{type}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {accounts.filter(a => a.type === type).length === 0 && (
                  <p className="px-6 text-xs font-bold text-slate-300">No {type} accounts yet.</p>
                )}
                {accounts.filter(a => a.type === type).map(acc => (
                  <div key={acc.id} className="bg-white p-6 rounded-[2rem] shadow-lg border-2 border-slate-50 flex justify-between items-center group hover:border-emerald-500 transition relative overflow-hidden">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition">
                            {type === 'Assets' ? <Landmark size={20}/> : type === 'Liabilities' ? <CreditCard size={20}/> : <Wallet size={20}/>}
                        </div>
                        <p className="font-black text-slate-900 text-lg">{acc.name}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <p className="font-black text-emerald-600 text-xl">$0.00</p>
                        <button onClick={() => handleDelete(acc.id)} className="text-slate-200 hover:text-rose-500 transition p-2">
                           <Trash2 size={18} />
                        </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- Add Account Modal --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 relative shadow-2xl animate-in zoom-in duration-200">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900"><X /></button>
            <h3 className="text-2xl font-black text-slate-900 mb-8 tracking-tight uppercase">New Account</h3>
            <form onSubmit={handleAddAccount} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Account Name</label>
                <input type="text" value={accName} onChange={e => setAccName(e.target.value)} placeholder="e.g. Chase Business Checking" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-emerald-500 outline-none transition-all" required />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Account Type</label>
                <select value={accType} onChange={e => setAccType(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-emerald-500 appearance-none transition-all">
                  <option value="Assets">Assets (Bank, Cash, Receivable)</option>
                  <option value="Liabilities">Liabilities (Credit Card, Loans)</option>
                  <option value="Equity">Equity (Owner Investment)</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-emerald-600 transition-all">
                Save Account
              </button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}