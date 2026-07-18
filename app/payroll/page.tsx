// app/payroll/page.tsx
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth, storage } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Users, UserPlus, DollarSign, X, UserX, Edit3, Camera, Loader2, Mail, Phone, MapPin, Calendar, Award } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation'; 

export default function Contractors() {
  const [contractors, setContractors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<any>(null);

  // Form States (Add)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [taxId, setTaxId] = useState('');
  const [salary, setSalary] = useState('');
  const [joinDate, setJoinDate] = useState(new Date().toISOString().split('T')[0]);
  const [internalNotes, setInternalNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(collection(db, "contractors"), where("uid", "==", user.uid));
        onSnapshot(q, (snapshot) => {
          const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
          setContractors(items.filter(i => i.status !== 'archived'));
          setLoading(false);
        });
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || isSaving) return;
    setIsSaving(true);
    try {
      let photoUrl = "";
      if (file) {
        const sRef = ref(storage, `personnel/${auth.currentUser.uid}/${Date.now()}.jpg`);
        await uploadBytes(sRef, file);
        photoUrl = await getDownloadURL(sRef);
      }
      await addDoc(collection(db, "contractors"), {
        name, email, phone, address, taxId, salary: parseFloat(salary) || 0,
        photoUrl, status: 'active', uid: auth.currentUser.uid, createdAt: serverTimestamp(),
        joinDate: new Date(joinDate), internalNotes
      });
      setShowAddModal(false); resetForm();
    } catch (err) { alert("Error"); } finally { setIsSaving(false); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem || isSaving) return;
    setIsSaving(true);
    try {
      let finalPhoto = editItem.photoUrl;
      if (editItem.newFile) {
        const sRef = ref(storage, `personnel/${auth.currentUser?.uid}/${Date.now()}.jpg`);
        await uploadBytes(sRef, editItem.newFile);
        finalPhoto = await getDownloadURL(sRef);
      }
      await updateDoc(doc(db, "contractors", editItem.id), {
        name: editItem.name, phone: editItem.phone || "", email: editItem.email || "",
        address: editItem.address || "", taxId: editItem.taxId || "",
        salary: Number(editItem.salary) || 0, photoUrl: finalPhoto,
        joinDate: new Date(editItem.tempJoinDate), internalNotes: editItem.internalNotes || ""
      });
      setEditItem(null);
    } catch (err) { alert("Error"); } finally { setIsSaving(false); }
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !payAmount || isSaving) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, "transactions"), {
        description: `W-2 Salary: ${selectedPerson.name}`,
        amount: parseFloat(payAmount),
        category: 'w2_wages',
        date: serverTimestamp(),
        uid: auth.currentUser?.uid,
        verified: false
      });
      alert("Success! Salary recorded in Ledger.");
      setShowPayModal(false);
      setPayAmount('');
    } catch (err) {
      alert("Error recording payment");
    } finally {
      setIsSaving(false);
    }
};

  const resetForm = () => {
    setName(''); setEmail(''); setPhone(''); setAddress(''); setTaxId(''); setSalary('');
    setJoinDate(new Date().toISOString().split('T')[0]); setInternalNotes(''); setFile(null); setPreview(null);
  };

  const handleArchive = async (id: string) => {
      if (confirm("ဒီလူက အလုပ်ထွက်သွားပြီလား? Archive လုပ်လိုက်ရင် စာရင်းဟောင်းတွေ မပျောက်ပေမယ့် ဒီ List ထဲမှာ မပေါ်တော့ပါဘူး။")) {
        try {
          const collectionName = pathname.includes('employees') ? "employees" : "contractors";
          await updateDoc(doc(db, collectionName, id), { status: 'archived' });
        } catch (err) {
          alert("Error archiving user");
        }
      }
    };

  return (
    <Layout>
      <div className="pt-4 pb-40 px-4 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Contractors (1099)</h2>
          <button onClick={() => setShowAddModal(true)} className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl active:scale-95 transition-all"><UserPlus size={24}/></button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {contractors.map(c => (
            <div key={c.id} className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-xl border-2 border-slate-50 dark:border-slate-700 flex justify-between items-center group transition-all hover:border-emerald-500">
              <Link href={`/payroll/view/${c.id}`} className="flex items-center gap-4 flex-1">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-slate-100 dark:border-slate-700">
                      {c.photoUrl ? <img src={c.photoUrl} className="w-full h-full object-cover" /> : <Users size={30} className="text-slate-300"/>}
                  </div>
                  <div>
                      <p className="font-black text-xl text-slate-900 dark:text-white">{c.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{c.phone || 'No Phone'}</p>
                  </div>
              </Link>
              <div className="flex items-center gap-2">
                  <button onClick={() => {
                    const d = c.joinDate?.toDate?.() || c.date?.toDate?.() || new Date();
                    setEditItem({ 
                        ...c, 
                        id: c.id, 
                        tempJoinDate: d.toISOString().split('T')[0],
                        phone: c.phone || "",    // Phone ပါအောင် ထည့်လိုက်ပါတယ်
                        taxId: c.taxId || "",    // SSN ပါအောင် ထည့်လိုက်ပါတယ်
                        address: c.address || "", // Address ပါအောင် ထည့်လိုက်ပါတယ်
                        internalNotes: c.internalNotes || "" // Notes ပါအောင် ထည့်လိုက်ပါတယ်
                    });
                }} className="p-3 text-slate-300 hover:text-emerald-500 transition-colors">
                    <Edit3 size={20}/>
                </button>
                  <button 
                      onClick={() => handleArchive(c.id)} 
                      className="p-3 text-slate-300 dark:text-slate-600 hover:text-rose-500 transition-colors"
                      title="Archive Personnel"
                  >
                      <UserX size={20} />
                  </button>
                  <button onClick={() => { setSelectedPerson(c); setShowPayModal(true); }} className="bg-emerald-600 text-white px-5 py-3 rounded-xl font-black text-xs shadow-lg active:scale-95">PAY</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- ADD MODAL: Full Features --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] w-full max-w-4xl shadow-2xl relative max-h-[95vh] overflow-y-auto">
            <button onClick={() => setShowAddModal(false)} className="absolute top-8 right-8 text-slate-400"><X /></button>
            <h3 className="text-2xl font-black mb-8 uppercase italic underline decoration-emerald-500 decoration-4 underline-offset-8">New Contractor (1099)</h3>
            <form onSubmit={handleAdd} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <label className="relative h-64 border-4 border-dashed border-slate-200 rounded-[2.5rem] bg-slate-50 flex flex-col items-center justify-center cursor-pointer overflow-hidden">
                        {preview ? <img src={preview} className="absolute inset-0 w-full h-full object-cover" /> : <Camera size={40} className="text-slate-300" />}
                        <input type="file" accept="image/*" className="hidden" onChange={e => { const f=e.target.files?.[0]; if(f){ setFile(f); const r=new FileReader(); r.onload=(ev)=>setPreview(ev.target?.result as string); r.readAsDataURL(f); } }} />
                    </label>
                </div>
                <div className="lg:col-span-2 space-y-4">
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl font-black" required />
                    <div className="grid grid-cols-2 gap-4">
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold" />
                        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <input type="text" value={taxId} onChange={e => setTaxId(e.target.value)} placeholder="SSN / EIN" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black" />
                        <input type="number" value={salary} onChange={e => setSalary(e.target.value)} placeholder="Salary ($)" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-xl" />
                    </div>
                    <textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="Address" className="w-full h-24 p-4 bg-slate-50 border-2 rounded-2xl font-bold" />
                    <input type="date" value={joinDate} onChange={e => setJoinDate(e.target.value)} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black" />
                    <textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} placeholder="Performance Notes..." className="w-full h-24 p-4 bg-amber-50 border-2 border-amber-100 rounded-2xl italic font-bold" />
                    <button type="submit" disabled={isSaving} className="w-full bg-emerald-600 text-white p-5 rounded-2xl font-black uppercase shadow-xl hover:bg-slate-900 transition-all">{isSaving ? "SAVING..." : "REGISTER CONTRACTOR"}</button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT MODAL: Mirroring Add Modal --- */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] w-full max-w-4xl shadow-2xl relative max-h-[95vh] overflow-y-auto">
            <button onClick={() => setEditItem(null)} className="absolute top-8 right-8 text-slate-400"><X /></button>
            <h3 className="text-2xl font-black mb-8 uppercase italic underline decoration-blue-500 decoration-4 underline-offset-8">Edit Contractor Profile</h3>
            <form onSubmit={handleUpdate} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <div className="relative h-64 border-4 border-dashed border-slate-200 rounded-[2.5rem] bg-slate-50 flex flex-col items-center justify-center overflow-hidden">
                        {editItem.photoUrl ? <img src={editItem.photoUrl} className="absolute inset-0 w-full h-full object-cover opacity-80" /> : <Camera size={40} className="text-slate-300" />}
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"><Camera size={30} className="text-white"/></div>
                        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => { const f=e.target.files?.[0]; if(f){ const r=new FileReader(); r.readAsDataURL(f); r.onload=(ev)=>setEditItem({...editItem, photoUrl: ev.target?.result as string, newFile: f}); } }} />
                    </div>
                </div>
                <div className="lg:col-span-2 space-y-4">
                    <input type="text" value={editItem.name} onChange={e => setEditItem({...editItem, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl font-black" required />
                    <div className="grid grid-cols-2 gap-4">
                        <input type="email" value={editItem.email} onChange={e => setEditItem({...editItem, email: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl font-bold" />
                        <input type="tel" value={editItem.phone} onChange={e => setEditItem({...editItem, phone: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl font-bold" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <input type="text" value={editItem.taxId} onChange={e => setEditItem({...editItem, taxId: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl font-black text-slate-900 dark:text-white" placeholder="SSN/EIN" />
                        <input type="number" value={editItem.salary} onChange={e => setEditItem({...editItem, salary: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl font-black text-xl" />
                    </div>
                    <textarea value={editItem.address} onChange={e => setEditItem({...editItem, address: e.target.value})} className="w-full h-24 p-4 bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl font-bold" />
                    <input type="date" value={editItem.tempJoinDate} onChange={e => setEditItem({...editItem, tempJoinDate: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl font-black" />
                    <textarea value={editItem.internalNotes} onChange={e => setEditItem({...editItem, internalNotes: e.target.value})} className="w-full h-24 p-4 bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-100 rounded-2xl italic font-bold" />
                    <button type="submit" disabled={isSaving} className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase shadow-xl hover:bg-blue-600 transition-all">APPLY CHANGES</button>
                </div>
            </form>
          </div>
        </div>
      )}

      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[3rem] shadow-2xl p-10 relative animate-in zoom-in duration-200">
            <button onClick={() => setShowPayModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900 bg-slate-50 dark:bg-slate-700 p-2 rounded-full"><X size={20}/></button>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 uppercase italic">Issue Payment</h3>
            <p className="text-slate-500 font-medium mb-10 italic">Paying to: <span className="text-emerald-500 font-black">{selectedPerson?.name}</span></p>
            
            <form onSubmit={handlePay} className="space-y-6">
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300">$</span>
                <input 
                  type="number" step="0.01" autoFocus 
                  value={payAmount} onChange={e => setPayAmount(e.target.value)} 
                  placeholder="0.00" 
                  className="w-full pl-12 pr-6 py-6 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-3xl font-black text-4xl text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-all" 
                  required 
                />
              </div>
              <button type="submit" className="w-full bg-emerald-600 text-white p-6 rounded-full font-black uppercase tracking-widest shadow-xl hover:bg-slate-900 transition-all flex items-center justify-center gap-3 active:scale-95 text-xs">
                <DollarSign size={24}/> CONFIRM & RECORD
              </button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}