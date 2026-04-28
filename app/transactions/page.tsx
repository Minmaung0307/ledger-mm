// app/transactions/page.tsx
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth, storage } from '@/lib/firebase'; // storage ထည့်ထားပါတယ်
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, where, updateDoc, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; // storage function များ
import { Trash2, Download, Image as ImageIcon, Search, Filter, Edit3, X, CheckCircle2, AlertTriangle, Camera, Calendar as CalendarIcon, Landmark } from 'lucide-react';
import { TAX_CATEGORIES } from '@/lib/constants';

export default function TransactionsList() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showOnlyReceipts, setShowOnlyReceipts] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const q = query(
          collection(db, "transactions"), 
          where("uid", "==", user.uid), 
          orderBy("date", "desc")
        );

        const unsubscribeData = onSnapshot(q, (snapshot) => {
          // ၁။ Snapshot တကယ်ရှိမရှိ အရင်စစ်ပါ
          if (!snapshot || snapshot.metadata.hasPendingWrites) {
            // ပိုက်ဆံစာရင်း အသစ်သွင်းနေတုန်း (Local cache အဆင့်) မှာ ခဏစောင့်ခိုင်းတာပါ
            // ဒါဆိုရင် payload error မတက်တော့ပါဘူး
            return; 
          }

          const items = snapshot.docs.map(doc => {
            const data = doc.data();
            return { 
              id: doc.id, 
              ...data,
              // နေ့စွဲဖတ်တဲ့အခါ serverTimestamp မကျလာသေးရင် လက်ရှိအချိန်ကို ခေတ္တသုံးမယ်
              displayDate: data.transactionDate?.toDate?.() || data.date?.toDate?.() || new Date()
            };
          });

          setTransactions(items);
          setLoading(false);
        }, (error) => {
          console.error("Firestore error:", error);
          setLoading(false);
        });

        // Chart of Accounts ဆွဲယူခြင်း
        try {
          const qAcc = query(collection(db, "chart_of_accounts"), where("uid", "==", user.uid));
          const accSnap = await getDocs(qAcc);
          if (accSnap) {
            setAccounts(accSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
          }
        } catch (err) { 
          console.error("Accounts fetch error:", err); 
        }

        return () => unsubscribeData();
      } else {
        setTransactions([]);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const isPotentialDuplicate = (item: any) => {
    // Dismiss လုပ်ထားတဲ့စာရင်းထဲမှာ ပါနေရင် warning မပြတော့ဘူး
    if (dismissedAlerts.includes(item.id)) return false; 

    const itemDate = item.transactionDate?.toDate().toLocaleDateString() || item.date?.toDate().toLocaleDateString();
    return transactions.some(other => 
      other.id !== item.id && 
      other.description === item.description && 
      other.amount === item.amount &&
      (other.transactionDate?.toDate().toLocaleDateString() || other.date?.toDate().toLocaleDateString()) === itemDate
    );
  };

  const toggleVerify = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "transactions", id), { verified: !currentStatus });
    } catch (error) { alert("Error updating status"); }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this record?")) {
      try { await deleteDoc(doc(db, "transactions", id)); } catch (error) { alert("Error deleting"); }
    }
  };

  const handleUpdateTransaction = async (e: React.FormEvent) => {
      e.preventDefault();
      
      // ၁။ editItem ရှိမရှိနဲ့ ID ပါမပါ အရင်စစ်မယ်
      if (!editItem || !editItem.id) {
          alert("Error: Missing record ID. Please refresh and try again.");
          return;
      }

      try {
        let finalReceiptUrl = editItem.receiptUrl || "";

        // ၂။ ပုံအသစ် ရွေးထားတယ်ဆိုရင် Storage အရင်တင်မယ်
        if (editItem.newFile) {
          const storageRef = ref(storage, `receipts/${auth.currentUser?.uid}/${Date.now()}.jpg`);
          await uploadBytes(storageRef, editItem.newFile);
          finalReceiptUrl = await getDownloadURL(storageRef);
        }

        // ၃။ Firestore မှာ တကယ်သွားပြင်မယ့်အပိုင်း
        const docRef = doc(db, "transactions", editItem.id);
        await updateDoc(docRef, {
          description: editItem.description,
          amount: Number(editItem.amount), // parseFloat အစား Number သုံးတာ ပိုစိတ်ချရပါတယ်
          category: editItem.category,
          bankAccount: editItem.bankAccount || "Cash/Other",
          transactionDate: new Date(editItem.tempDate),
          receiptUrl: finalReceiptUrl
        });

        setEditItem(null);
        alert("Updated successfully!");
        window.location.reload(); // UI refresh ဖြစ်သွားအောင်
        
      } catch (error: any) {
        // ၄။ Error တက်ရင် Console မှာ အသေးစိတ်ကြည့်လို့ရအောင် လုပ်ထားပါတယ်
        console.error("Detailed Update Error:", error);
        alert("Update Failed: " + error.message);
      }
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || t.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesReceiptToggle = showOnlyReceipts ? (t.receiptUrl && t.receiptUrl !== "") : true;
    return matchesSearch && matchesReceiptToggle;
  });

  return (
    <Layout>
      <div className="pt-6 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Ledger Records</h2>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Audit & Management</p>
          </div>
          <div className="flex flex-wrap gap-3">
             <button onClick={() => setShowOnlyReceipts(!showOnlyReceipts)} className={`px-5 py-3 rounded-2xl font-black text-[10px] flex items-center gap-2 transition shadow-md ${showOnlyReceipts ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500 border-2 border-slate-100'}`}>
                <Filter size={14} /> {showOnlyReceipts ? "RECEIPTS ONLY" : "ALL RECORDS"}
             </button>
          </div>
        </div>

        <div className="relative mb-8 group px-2 md:px-0">
          <div className="absolute inset-y-0 left-6 flex items-center text-slate-300"><Search size={22} /></div>
          <input type="text" placeholder="Search records..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-16 pr-6 py-5 border-2 border-slate-100 rounded-[1.8rem] focus:border-emerald-500 outline-none font-bold text-slate-900 bg-white shadow-sm transition-all text-lg"
          />
        </div>
        
        <div className="bg-white rounded-[2.5rem] shadow-2xl border-2 border-slate-50 overflow-hidden">
          <div className="divide-y-2 divide-slate-50">
            {loading ? <p className="p-24 text-center font-black animate-pulse text-slate-200">SYNCING...</p> : filteredTransactions.map((item) => {
                const hasDuplicate = isPotentialDuplicate(item);
                const isIncome = item.category === 'income';
                return (
                  <div key={item.id} className={`p-4 md:px-8 md:py-4 flex justify-between items-center hover:bg-slate-50/50 transition border-b last:border-0 border-slate-50 group relative ${hasDuplicate ? 'bg-amber-50/30' : ''}`}>
                    {hasDuplicate && (
                      <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-white border border-amber-200 text-amber-600 px-3 py-1 rounded-full font-black text-[8px] flex items-center gap-2 shadow-sm z-10 animate-pulse">
                        <AlertTriangle size={10} /> POSSIBLE DUPLICATE
                        {/* Warning ကို ဖျောက်ဖို့ ခလုတ်လေးပါ */}
                        <button 
                          onClick={() => setDismissedAlerts([...dismissedAlerts, item.id])} 
                          className="hover:text-slate-900 ml-1 border-l pl-2 border-amber-200 uppercase"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <button onClick={() => toggleVerify(item.id, item.verified)} className={`p-2 rounded-xl transition-all active:scale-90 ${item.verified ? 'bg-emerald-100 text-emerald-600 shadow-inner' : 'bg-slate-50 text-slate-200 hover:text-slate-400'}`}><CheckCircle2 size={22} /></button>
                        <div>
                          <p className="font-black text-xl text-slate-900 tracking-tight leading-tight">{item.description}</p>
                          <div className="flex flex-wrap items-center gap-3 mt-1">
                            <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${isIncome ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>{item.category.replace('_', ' ')}</span>
                            <span className="text-[9px] font-black px-3 py-1 bg-blue-50 text-blue-500 rounded-full uppercase tracking-widest italic">{item.bankAccount || 'Other'}</span>
                            <span className="text-[10px] font-bold text-slate-300 uppercase italic">{(item.transactionDate?.toDate?.() || item.date?.toDate?.() || new Date()).toLocaleDateString()}</span>
                          </div>
                        </div>
                        {item.receiptUrl && <a href={item.receiptUrl} target="_blank" className="text-emerald-500 bg-emerald-50 p-2 rounded-xl hover:bg-emerald-500 hover:text-white shadow-sm transition"><ImageIcon size={18} /></a>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 md:gap-8">
                      <p className={`text-lg md:text-xl font-black tracking-tighter ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>{isIncome ? '+' : '-'}${Number(item.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            // ၁။ payload error ကာကွယ်ရန် Safe Date logic သုံးမယ်
                            const dateObj = item.transactionDate?.toDate?.() || item.date?.toDate?.() || new Date();
                            
                            // ၂။ editItem ထဲကို Data ထည့်တဲ့အခါ category ကို သေချာ လက်ဆင့်ကမ်းမယ်
                            setEditItem({ 
                              ...item, // <--- ဒါလေးက ID ပါသွားအောင် လုပ်ပေးတာပါ
                              id: item.id, // <--- သေချာအောင် ID ကို ထပ်ထည့်ပေးလိုက်ပါ
                              category: item.category, // လက်ရှိ category ကို အသေအချာ bind လုပ်လိုက်တာပါ
                              tempDate: dateObj.toISOString().split('T')[0] 
                            });
                          }} 
                          className="text-slate-300 hover:text-emerald-500 p-2 transition-all active:scale-90"
                        >
                          <Edit3 size={22} />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="text-slate-300 hover:text-rose-600 p-2"><Trash2 size={22} /></button>
                      </div>
                    </div>
                  </div>
                );
            })}
          </div>
        </div>
      </div>

      {/* --- Edit Modal --- */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white p-8 lg:p-10 rounded-[3rem] w-full max-w-2xl shadow-2xl relative animate-in zoom-in duration-200 overflow-y-auto max-h-[95vh] border-t-8 border-emerald-500">
            <button onClick={() => setEditItem(null)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900 transition-colors p-2 bg-slate-50 rounded-full"><X size={24} /></button>
            <h3 className="text-3xl font-black text-slate-900 mb-8 tracking-tighter uppercase italic">Update Entry</h3>
            
            <form onSubmit={handleUpdateTransaction} className="space-y-6">
              {/* Receipt Preview */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2 flex items-center gap-2"><Camera size={14} className="text-emerald-500"/> Receipt Evidence</label>
                <div className="relative h-44 w-full bg-slate-50 rounded-[2.5rem] overflow-hidden border-2 border-dashed border-slate-200 flex items-center justify-center group shadow-inner">
                    {editItem.receiptUrl ? (
                        <>
                            <img src={editItem.receiptUrl} className="absolute inset-0 w-full h-full object-cover opacity-80" alt="r" />
                            <div className="relative z-10 bg-slate-900/50 p-4 rounded-2xl text-white opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                              <Camera size={28} />
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-slate-300 font-black"><Camera size={36} className="mx-auto mb-2 opacity-20" /><p className="text-[10px] tracking-widest">TAP TO CHANGE PHOTO</p></div>
                    )}
                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.readAsDataURL(file);
                            reader.onload = (ev) => setEditItem({ ...editItem, receiptUrl: ev.target?.result as string, newFile: file });
                        }
                    }} />
                </div>
              </div>

              {/* Merchant Name */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Description / Shop Name</label>
                <input type="text" value={editItem.description} onChange={e => setEditItem({...editItem, description: e.target.value})} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-900 focus:border-emerald-500 focus:bg-white outline-none transition-all text-lg" required />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Amount */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Amount ($)</label>
                  <input type="number" step="0.01" value={editItem.amount} onChange={e => setEditItem({...editItem, amount: e.target.value})} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-2xl text-slate-900 focus:border-emerald-500 focus:bg-white outline-none transition-all" required />
                </div>
                {/* Transaction Date */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2 flex items-center gap-2"><CalendarIcon size={14} className="text-emerald-500" /> Date of Record</label>
                  <input type="date" value={editItem.tempDate} onChange={e => setEditItem({...editItem, tempDate: e.target.value})} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 focus:border-emerald-500 focus:bg-white outline-none transition-all" required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Category Section with Tax Guidance */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Category</label>
                  <select value={editItem.category} onChange={e => setEditItem({...editItem, category: e.target.value})} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 focus:border-emerald-500 focus:bg-white outline-none appearance-none transition-all">
                      {TAX_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  {editItem.category && (
                    <div className="mt-4 p-5 bg-emerald-50 border-l-8 border-emerald-400 rounded-2xl animate-in fade-in slide-in-from-top-2">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest italic mb-2">
                        Tax Prep: {TAX_CATEGORIES.find(c => c.value === editItem.category)?.line}
                      </p>
                      <p className="text-xs font-bold text-slate-600 leading-relaxed">
                        {TAX_CATEGORIES.find(c => c.value === editItem.category)?.info}
                      </p>
                    </div>
                  )}
                </div>

                {/* Paid From */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2 flex items-center gap-2"><Landmark size={14} className="text-emerald-500" /> Paid From (Account)</label>
                  <select value={editItem.bankAccount || "Cash/Other"} onChange={e => setEditItem({...editItem, bankAccount: e.target.value})} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 focus:border-emerald-500 focus:bg-white outline-none appearance-none transition-all">
                      {accounts.map(acc => <option key={acc.id} value={acc.name}>{acc.name}</option>)}
                      <option value="Cash/Other">Cash / Other</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="w-full bg-slate-900 text-white p-6 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-600 transition-all active:scale-95 shadow-emerald-100/50">
                APPLY CHANGES & SAVE
              </button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}