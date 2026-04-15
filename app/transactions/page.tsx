"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth, storage } from '@/lib/firebase';
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, where, updateDoc, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Trash2, Download, Image as ImageIcon, Search, Filter, Edit3, X, CheckCircle2, AlertTriangle, Camera } from 'lucide-react';
import { TAX_CATEGORIES } from '@/lib/constants';

export default function MasterLedger() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showOnlyReceipts, setShowOnlyReceipts] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const q = query(collection(db, "transactions"), where("uid", "==", user.uid), orderBy("date", "desc"));
        const unsubscribeData = onSnapshot(q, (snapshot) => {
          setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setLoading(false);
        });

        const qAcc = query(collection(db, "chart_of_accounts"), where("uid", "==", user.uid));
        const accSnap = await getDocs(qAcc);
        setAccounts(accSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        return () => unsubscribeData();
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // ၁။ Duplicate Check (Description, Amount, Date တူလျှင်)
  const isPotentialDuplicate = (item: any) => {
    const itemDate = item.transactionDate?.toDate().toLocaleDateString() || item.date?.toDate().toLocaleDateString();
    return transactions.some(other => 
      other.id !== item.id && 
      other.description === item.description && 
      other.amount === item.amount &&
      (other.transactionDate?.toDate().toLocaleDateString() || other.date?.toDate().toLocaleDateString()) === itemDate
    );
  };

  const toggleVerify = async (id: string, currentStatus: boolean) => {
    await updateDoc(doc(db, "transactions", id), { verified: !currentStatus });
  };

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    try {
      let finalReceiptUrl = editItem.receiptUrl;
      if (editItem.newFile) {
        const storageRef = ref(storage, `receipts/${auth.currentUser?.uid}/${Date.now()}.jpg`);
        await uploadBytes(storageRef, editItem.newFile);
        finalReceiptUrl = await getDownloadURL(storageRef);
      }
      await updateDoc(doc(db, "transactions", editItem.id), {
        description: editItem.description,
        amount: parseFloat(editItem.amount),
        category: editItem.category,
        bankAccount: editItem.bankAccount || "Other",
        transactionDate: new Date(editItem.tempDate),
        receiptUrl: finalReceiptUrl
      });
      setEditItem(null);
      alert("Updated!");
    } catch (err) { alert("Error updating"); }
  };

  const filtered = transactions.filter(t => 
    (t.description.toLowerCase().includes(searchTerm.toLowerCase()) || t.category.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (showOnlyReceipts ? (t.receiptUrl && t.receiptUrl !== "") : true)
  );

  return (
    <Layout>
      <div className="pt-6 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Master Ledger</h2>
          <button onClick={() => setShowOnlyReceipts(!showOnlyReceipts)} className={`px-5 py-3 rounded-2xl font-black text-[10px] transition shadow-md ${showOnlyReceipts ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500 border-2 border-slate-100'}`}>
            {showOnlyReceipts ? "FILTERED: RECEIPTS" : "SHOW ALL RECORDS"}
          </button>
        </div>

        <div className="relative mb-8"><input type="text" placeholder="Search records..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-6 pr-6 py-5 border-2 border-slate-100 rounded-[1.8rem] focus:border-emerald-500 outline-none font-bold text-slate-900 bg-white shadow-sm transition-all text-lg" /></div>
        
        <div className="bg-white rounded-[2.5rem] shadow-2xl border-2 border-slate-50 overflow-hidden divide-y-2 divide-slate-50">
          {loading ? <p className="p-20 text-center font-black animate-pulse">Syncing...</p> : filtered.map((item) => {
            const hasDuplicate = isPotentialDuplicate(item);
            const isInc = item.category === 'income';
            return (
              <div key={item.id} className={`p-4 md:px-8 md:py-4 flex justify-between items-center hover:bg-slate-50/50 transition relative ${hasDuplicate ? 'bg-amber-50/30' : ''}`}>
                {hasDuplicate && <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-amber-100 text-amber-700 px-3 py-0.5 rounded-full font-black text-[8px] flex items-center gap-1 border border-amber-200 z-10 animate-pulse"><AlertTriangle size={10} /> DUPLICATE?</div>}
                <div className="flex-1 flex items-center gap-4">
                  <button onClick={() => toggleVerify(item.id, item.verified)} className={`p-2 rounded-xl transition-all ${item.verified ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-50 text-slate-200'}`}><CheckCircle2 size={22} /></button>
                  <div>
                    <p className="font-black text-xl text-slate-900 tracking-tight">{item.description}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase ${isInc ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>{item.category.replace('_', ' ')}</span>
                      <span className="text-[9px] font-black px-2 py-1 bg-blue-50 text-blue-500 rounded-full uppercase italic">{item.bankAccount || 'Other'}</span>
                      <span className="text-[10px] font-bold text-slate-300">{(item.transactionDate?.toDate() || item.date?.toDate())?.toLocaleDateString()}</span>
                    </div>
                  </div>
                  {item.receiptUrl && <a href={item.receiptUrl} target="_blank" className="text-emerald-500 bg-emerald-50 p-2 rounded-xl"><ImageIcon size={18} /></a>}
                </div>
                <div className="flex items-center gap-4">
                  <p className={`text-2xl md:text-3xl font-black ${isInc ? 'text-emerald-600' : 'text-rose-600'}`}>{isInc ? '+' : '-'}${Number(item.amount).toLocaleString(undefined,{minimumFractionDigits:2})}</p>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => setEditItem({...item, tempDate: (item.transactionDate?.toDate() || item.date?.toDate() || new Date()).toISOString().split('T')[0]})} className="text-slate-300 hover:text-emerald-500 p-2"><Edit3 size={20} /></button></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white p-10 rounded-[2.5rem] w-full max-w-lg shadow-2xl relative animate-in zoom-in duration-200">
            <button onClick={() => setEditItem(null)} className="absolute top-6 right-6 text-slate-400"><X /></button>
            <h3 className="text-2xl font-black text-slate-900 mb-8 tracking-tight uppercase italic">Update Entry</h3>
            <form onSubmit={handleUpdateTransaction} className="space-y-6">
              <div className="relative h-40 w-full bg-slate-50 rounded-3xl overflow-hidden border-2 border-dashed border-slate-200 flex items-center justify-center group">
                {editItem.receiptUrl ? <img src={editItem.receiptUrl} className="absolute inset-0 w-full h-full object-cover opacity-80" alt="r" /> : <div className="text-center text-slate-300"><Camera size={30} className="mx-auto" /></div>}
                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => { const f = e.target.files?.[0]; if(f){ const r = new FileReader(); r.readAsDataURL(f); r.onload = (ev) => setEditItem({...editItem, receiptUrl: ev.target?.result as string, newFile: f }); } }} />
              </div>
              <input type="text" value={editItem.description} onChange={e => setEditItem({...editItem, description: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black focus:border-emerald-500 outline-none" required />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" step="0.01" value={editItem.amount} onChange={e => setEditItem({...editItem, amount: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-xl" required />
                <input type="date" value={editItem.tempDate} onChange={e => setEditItem({...editItem, tempDate: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <select value={editItem.category} onChange={e => setEditItem({...editItem, category: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold">{TAX_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
                <select value={editItem.bankAccount || "Cash"} onChange={e => setEditItem({...editItem, bankAccount: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold">{accounts.map(acc => <option key={acc.id} value={acc.name}>{acc.name}</option>)}<option value="Cash">Cash / Other</option></select>
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-600 transition shadow-xl active:scale-95">Save Changes</button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}