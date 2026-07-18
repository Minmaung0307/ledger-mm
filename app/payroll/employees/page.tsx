// app/payroll/employees/page.tsx
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth, storage } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Users, UserPlus, DollarSign, X, Edit3, Camera, Loader2, UserX, Award, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function Employees() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<any>(null);

  // Form States (Add)
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
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

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(collection(db, "employees"), where("uid", "==", user.uid));
        onSnapshot(q, (snapshot) => {
          const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
          setEmployees(items.filter(i => i.status !== 'archived'));
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
      await addDoc(collection(db, "employees"), {
        name, position, email, phone, address, taxId, salary: parseFloat(salary) || 0,
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
      await updateDoc(doc(db, "employees", editItem.id), {
        name: editItem.name, position: editItem.position || "", phone: editItem.phone || "",
        email: editItem.email || "", address: editItem.address || "", taxId: editItem.taxId || "",
        salary: Number(editItem.salary) || 0, photoUrl: finalPhoto,
        joinDate: new Date(editItem.tempJoinDate), internalNotes: editItem.internalNotes || ""
      });
      setEditItem(null);
    } catch (err) { alert("Error"); } finally { setIsSaving(false); }
  };

  const resetForm = () => {
    setName(''); setPosition(''); setEmail(''); setPhone(''); setAddress(''); setTaxId(''); setSalary('');
    setJoinDate(new Date().toISOString().split('T')[0]); setInternalNotes(''); setFile(null); setPreview(null);
  };

  return (
    <Layout>
      <div className="pt-4 pb-40 px-4 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Employees (W-2)</h2>
          <button onClick={() => setShowAddModal(true)} className="bg-emerald-600 text-white p-4 rounded-2xl shadow-xl active:scale-95 transition-all"><UserPlus size={24}/></button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {employees.map(emp => (
            <div key={emp.id} className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-xl border-2 border-slate-50 dark:border-slate-700 flex justify-between items-center group transition-all hover:border-emerald-500">
                <Link href={`/payroll/view/${emp.id}`} className="flex items-center gap-4 flex-1">
                    <div className="w-14 h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center font-black text-slate-400 text-xl border-2 border-slate-100 dark:border-slate-700 shadow-inner overflow-hidden">
                        {emp.photoUrl ? <img src={emp.photoUrl} className="w-full h-full object-cover" /> : emp.name?.charAt(0)}
                    </div>
                    <div>
                        <p className="font-black text-xl text-slate-800 dark:text-white tracking-tight">{emp.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{emp.position || 'Staff'}</p>
                    </div>
                </Link>
                <div className="flex items-center gap-2">
                    <button onClick={() => {
                        const d = emp.joinDate?.toDate() || new Date();
                        setEditItem({ ...emp, tempJoinDate: d.toISOString().split('T')[0] });
                    }} className="p-3 text-slate-300 hover:text-emerald-500 transition-colors"><Edit3 size={20} /></button>
                    <button onClick={() => { setSelectedPerson(emp); setShowPayModal(true); }} className="bg-slate-900 text-white px-5 py-3 rounded-xl font-black text-xs shadow-lg active:scale-95">PAY</button>
                </div>
            </div>
          ))}
        </div>
      </div>

      {/* ADD MODAL - FULL VERSION */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 p-8 md:p-12 rounded-[3rem] w-full max-w-4xl shadow-2xl relative max-h-[95vh] overflow-y-auto border-t-8 border-emerald-500">
            <button onClick={() => setShowAddModal(false)} className="absolute top-8 right-8 text-slate-400"><X size={24} /></button>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-10 uppercase italic underline decoration-emerald-500 decoration-4">New W-2 Employee</h3>
            <form onSubmit={handleAdd} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-1">
                    <label className="relative h-64 border-4 border-dashed border-slate-200 dark:border-slate-700 rounded-[2.5rem] bg-slate-50 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 transition-all overflow-hidden shadow-inner">
                        {preview ? <img src={preview} className="absolute inset-0 w-full h-full object-cover" /> : <Camera size={48} className="text-slate-300" />}
                        <input type="file" accept="image/*" className="hidden" onChange={e => { const f=e.target.files?.[0]; if(f){ setFile(f); const r=new FileReader(); r.onload=(ev)=>setPreview(ev.target?.result as string); r.readAsDataURL(f); } }} />
                    </label>
                </div>
                <div className="lg:col-span-2 space-y-4">
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl font-black" required />
                    <div className="grid grid-cols-2 gap-4">
                        <input type="text" value={position} onChange={e => setPosition(e.target.value)} placeholder="Position" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl font-bold" required />
                        <input type="number" value={salary} onChange={e => setSalary(e.target.value)} placeholder="Salary ($)" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl font-black text-xl" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl font-bold" />
                        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl font-bold" />
                    </div>
                    <textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="Address" className="w-full h-24 p-4 bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl font-bold" />
                    <input type="text" value={taxId} onChange={e => setTaxId(e.target.value)} placeholder="SSN (Full)" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl font-black tracking-widest" />
                    <input type="date" value={joinDate} onChange={e => setJoinDate(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl font-black" />
                    <textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} placeholder="Performance Notes..." className="w-full h-24 p-4 bg-amber-50 border-2 rounded-2xl italic font-bold" />
                    <button type="submit" disabled={isSaving} className="w-full bg-emerald-600 text-white p-5 rounded-2xl font-black uppercase shadow-xl">COMPLETE REGISTRATION</button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL - FULL VERSION */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] w-full max-w-4xl shadow-2xl relative max-h-[95vh] overflow-y-auto border-t-8 border-blue-500">
            <button onClick={() => setEditItem(null)} className="absolute top-8 right-8 text-slate-400"><X /></button>
            <h3 className="text-2xl font-black mb-8 uppercase italic underline decoration-blue-500 decoration-4 underline-offset-8">Update Employee Profile</h3>
            <form onSubmit={handleUpdate} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <div className="relative h-64 border-4 border-dashed border-slate-200 rounded-[2.5rem] bg-slate-50 flex flex-col items-center justify-center overflow-hidden shadow-inner group">
                        {editItem.photoUrl ? <img src={editItem.photoUrl} className="absolute inset-0 w-full h-full object-cover opacity-80" /> : <Camera size={40} className="text-slate-300" />}
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Camera size={30} className="text-white"/></div>
                        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => { const f=e.target.files?.[0]; if(f){ const r=new FileReader(); r.readAsDataURL(f); r.onload=(ev)=>setEditItem({...editItem, photoUrl: ev.target?.result as string, newFile: f}); } }} />
                    </div>
                </div>
                <div className="lg:col-span-2 space-y-4">
                    <input type="text" value={editItem.name} onChange={e => setEditItem({...editItem, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl font-black" required />
                    <div className="grid grid-cols-2 gap-4">
                        <input type="text" value={editItem.position} onChange={e => setEditItem({...editItem, position: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl font-bold" />
                        <input type="number" value={editItem.salary} onChange={e => setEditItem({...editItem, salary: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl font-black text-xl" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <input type="email" value={editItem.email} onChange={e => setEditItem({...editItem, email: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl font-bold" />
                        <input type="tel" value={editItem.phone} onChange={e => setEditItem({...editItem, phone: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl font-bold" />
                    </div>
                    <textarea value={editItem.address} onChange={e => setEditItem({...editItem, address: e.target.value})} className="w-full h-24 p-4 bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl font-bold" />
                    <input type="text" value={editItem.taxId} onChange={e => setEditItem({...editItem, taxId: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl font-black" placeholder="SSN" />
                    <input type="date" value={editItem.tempJoinDate} onChange={e => setEditItem({...editItem, tempJoinDate: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl font-black" />
                    <textarea value={editItem.internalNotes} onChange={e => setEditItem({...editItem, internalNotes: e.target.value})} className="w-full h-24 p-4 bg-amber-50 dark:bg-amber-950/20 border-2 rounded-2xl italic font-bold" />
                    <button type="submit" disabled={isSaving} className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase shadow-xl hover:bg-blue-600 transition-all">APPLY CHANGES</button>
                </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}