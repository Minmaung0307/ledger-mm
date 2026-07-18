// app/payroll/page.tsx
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth, storage } from '@/lib/firebase'; // storage ပါဝင်အောင် ပြင်ထားပါတယ်
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; // ပုံတင်ရန် လိုအပ်သည်များ
import { User, UserPlus, DollarSign, X, UserX, Edit3, Camera, Loader2 } from 'lucide-react'; // Edit3, Camera, Loader2 ထည့်လိုက်ပါပြီ
import Link from 'next/link';

export default function Payroll() {
  const [contractors, setContractors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- New States for Editing ---
  const [editItem, setEditItem] = useState<any>(null); 
  const [isSaving, setIsSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState<any>(null);
  const [payAmount, setPayAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // ပြင်ဆင်ချက်- status စစ်တာကို ဖြုတ်လိုက်ပြီး logic ထဲမှာမှ filter လုပ်ပါမယ် (ဒါမှ အဟောင်းတွေ ပြန်ပေါ်မှာပါ)
        const q = query(collection(db, "contractors"), where("uid", "==", user.uid));
        
        const unsubscribeData = onSnapshot(q, (snapshot) => {
          const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
          // Archived လုပ်ထားသူတွေကိုပဲ ဖယ်ထုတ်ပြီး ကျန်တာအကုန်ပြမယ် (status မပါတဲ့သူတွေပါ ပေါ်လာပါလိမ့်မယ်)
          setContractors(items.filter(i => i.status !== 'archived'));
          setLoading(false);
        });
        return () => unsubscribeData();
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // --- ပြင်ဆင်ချက် သိမ်းဆည်းသည့် Function (Update Logic) ---
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem || isSaving) return;
    setIsSaving(true);
    try {
      let finalPhotoUrl = editItem.photoUrl || "";

      // အကယ်၍ ပုံအသစ် ရွေးထားတယ်ဆိုရင် Storage တင်မယ်
      if (editItem.newFile) {
        const storageRef = ref(storage, `personnel/${auth.currentUser?.uid}/${Date.now()}.jpg`);
        await uploadBytes(storageRef, editItem.newFile);
        finalPhotoUrl = await getDownloadURL(storageRef);
      }

      const docRef = doc(db, "contractors", editItem.id);
      await updateDoc(docRef, {
        name: editItem.name,
        phone: editItem.phone || "",
        email: editItem.email || "",
        address: editItem.address || "",
        taxId: editItem.taxId || "",
        salary: Number(editItem.salary) || 0,
        photoUrl: finalPhotoUrl
      });

      setEditItem(null);
      alert("Profile Updated Successfully!");
    } catch (err) {
      alert("Update failed");
    } finally {
      setIsSaving(false);
    }
  };

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
          <Link href="/payroll/add" className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl flex items-center justify-center hover:bg-emerald-600 transition active:scale-90">
            <UserPlus size={24}/>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {loading ? (
             <p className="p-10 text-center font-black animate-pulse text-slate-300 uppercase">Syncing Personnel...</p>
          ) : (
            contractors.map(c => (
              <div key={c.id} className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-xl border-2 border-slate-50 dark:border-slate-700 flex justify-between items-center group hover:border-emerald-500 transition-all">
                <Link href={`/payroll/view/${c.id}`} className="flex items-center gap-4 flex-1 cursor-pointer">
                    <div className="w-14 h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center font-black text-slate-400 text-xl border-2 border-slate-100 dark:border-slate-700 overflow-hidden shadow-inner">
                        {c.photoUrl ? <img src={c.photoUrl} className="w-full h-full object-cover" /> : (c.name?.charAt(0) || 'C')}
                    </div>
                    <div>
                        <p className="font-black text-slate-900 dark:text-white text-xl tracking-tight group-hover:text-emerald-600 transition-colors underline decoration-transparent group-hover:decoration-emerald-500 underline-offset-4">{c.name}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.phone || 'No Phone'}</p>
                    </div>
                </Link>
                
                <div className="flex items-center gap-2">
                    {/* --- ပြင်ဆင်ရန် Edit ခလုတ်အသစ် --- */}
                    <button 
                        onClick={() => setEditItem({...c})} 
                        className="p-3 text-slate-300 hover:text-emerald-500 transition-colors"
                        title="Edit Profile"
                    >
                        <Edit3 size={20} />
                    </button>

                    <button onClick={() => handleArchive(c.id)} className="p-3 text-slate-200 hover:text-rose-500 transition-colors"><UserX size={20} /></button>
                    <button onClick={() => { setSelectedContractor(c); setShowModal(true); }} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-xs hover:bg-emerald-600 transition shadow-lg tracking-widest">PAY</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- Edit Profile Modal --- */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in duration-200">
            <button onClick={() => setEditItem(null)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900"><X size={24} /></button>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-8 tracking-tight uppercase italic underline decoration-emerald-500 decoration-4">Update Profile</h3>
            
            <form onSubmit={handleUpdate} className="space-y-6">
                <div className="relative w-32 h-32 mx-auto bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] overflow-hidden border-4 border-white dark:border-slate-700 shadow-xl group">
                    {editItem.photoUrl ? <img src={editItem.photoUrl} className="absolute inset-0 w-full h-full object-cover opacity-80" alt="p" /> : <User size={48} className="text-slate-200 m-auto mt-6" />}
                    <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera size={24} className="text-white" /></div>
                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => { const f=e.target.files?.[0]; if(f){ const r=new FileReader(); r.readAsDataURL(f); r.onload=(ev)=>setEditItem({...editItem, photoUrl: ev.target?.result as string, newFile: f}); } }} />
                </div>

                <div className="space-y-4">
                    <input type="text" value={editItem.name} onChange={e => setEditItem({...editItem, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-slate-900 dark:text-white focus:border-emerald-500 outline-none" placeholder="Full Name" required />
                    
                    <div className="grid grid-cols-2 gap-4">
                        <input type="tel" value={editItem.phone} onChange={e => setEditItem({...editItem, phone: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white outline-none" placeholder="Phone" />
                        <input type="text" value={editItem.taxId} onChange={e => setEditItem({...editItem, taxId: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black tracking-widest text-slate-900 dark:text-white outline-none" placeholder="SSN/EIN" />
                    </div>

                    <textarea value={editItem.address} onChange={e => setEditItem({...editItem, address: e.target.value})} className="w-full h-24 p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white outline-none" placeholder="Address" />
                    <input type="number" value={editItem.salary} onChange={e => setEditItem({...editItem, salary: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-slate-900 dark:text-white outline-none" placeholder="Salary ($)" />
                </div>

                <button type="submit" disabled={isSaving} className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-emerald-600 transition-all active:scale-95">
                    {isSaving ? <Loader2 className="animate-spin mx-auto" /> : "Apply Changes"}
                </button>
            </form>
          </div>
        </div>
      )}

      {/* --- Pay Modal (အရင်အတိုင်းပဲ ထားပါသည်) --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 relative animate-in zoom-in duration-200">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900"><X size={24} /></button>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Record Payment</h3>
            <p className="text-slate-500 font-medium mb-6">Enter the amount paid to <span className="text-emerald-600 font-black">{selectedContractor?.name}</span></p>
            <form onSubmit={handlePaySubmit} className="space-y-6">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300">$</span>
                <input type="number" autoFocus value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="w-full pl-10 pr-4 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-2xl font-black focus:border-emerald-500 outline-none transition-all text-slate-900" placeholder="0.00" required />
              </div>
              <button type="submit" disabled={isProcessing} className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black tracking-widest hover:bg-slate-900 transition shadow-xl">
                {isProcessing ? "PROCESSING..." : "CONFIRM & RECORD"}
              </button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}