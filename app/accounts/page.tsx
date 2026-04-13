// app/accounts/page.tsx
"use client";
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, query, where, onSnapshot } from 'firebase/firestore';
import { Plus, Landmark, CreditCard, Wallet, X } from 'lucide-react';

export default function ChartOfAccounts() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState('Assets');
  const [editAccount, setEditAccount] = useState<any>(null);

  useEffect(() => {
    const q = query(collection(db, "chart_of_accounts"), where("uid", "==", auth.currentUser?.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, "chart_of_accounts"), {
      name: accName,
      type: accType,
      uid: auth.currentUser?.uid
    });
    setShowModal(false);
    setAccName('');
  };

  return (
    <Layout>
      <div className="pt-6">
        <div className="flex justify-between items-center mb-10 px-2">
          <h2 className="text-4xl font-black text-slate-900">Chart of Accounts</h2>
          <button onClick={() => setShowModal(true)} className="bg-emerald-600 text-white px-6 py-4 rounded-2xl font-black text-xs shadow-xl flex items-center gap-2">
            <Plus size={18}/> ADD NEW
          </button>
        </div>

        {["Assets", "Liabilities", "Equity"].map(type => (
          <div key={type} className="mb-10">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-4">{type}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accounts.filter(a => a.type === type).map(acc => (
                <div 
                  key={acc.id} 
                  onClick={() => setEditAccount(acc)}
                  className="bg-white p-6 rounded-[2rem] shadow-lg border-2 border-slate-50 flex justify-between items-center cursor-pointer hover:border-emerald-500 transition group"
                >
                  <p className="font-black text-slate-900 group-hover:text-emerald-600 transition">{acc.name}</p>
                  <p className="font-black text-emerald-600">$0.00</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add Account Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-slate-400"><X /></button>
            <h3 className="text-2xl font-black text-slate-900 mb-8 tracking-tight">Add Account</h3>
            <form onSubmit={handleAddAccount} className="space-y-6">
              <input type="text" value={accName} onChange={e => setAccName(e.target.value)} placeholder="Account Name (e.g. Chase Checking)" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-emerald-500" required />
              <select value={accType} onChange={e => setAccType(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold">
                <option value="Assets">Assets (Money you have)</option>
                <option value="Liabilities">Liabilities (Money you owe)</option>
                <option value="Equity">Equity (Capital)</option>
              </select>
              <button type="submit" className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase tracking-widest shadow-xl">Save Account</button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}