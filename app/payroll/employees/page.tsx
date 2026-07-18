// app/payroll/employees/page.tsx
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth, storage } from '@/lib/firebase'; // storage ပါဝင်အောင် သေချာစစ်ပါ
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { UserPlus, X, DollarSign, Users as UsersIcon, UserX, Edit3, Loader2, Camera, Mail, Phone, MapPin } from 'lucide-react';
import Link from 'next/link';

export default function EmployeesW2() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- Modals States ---
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  
  // --- Add Employee States (အစုံအလင် ပြင်ဆင်ထားပါသည်) ---
  const [empName, setEmpName] = useState('');
  const [empPosition, setEmpPosition] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empAddress, setEmpAddress] = useState('');
  const [empTaxId, setEmpTaxId] = useState(''); // SSN
  const [empSalary, setEmpSalary] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [payAmount, setPayAmount] = useState('');
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(collection(db, "employees"), where("uid", "==", user.uid));
        const unsubscribeData = onSnapshot(q, (snapshot) => {
          const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
          setEmployees(items.filter(i => i.status !== 'archived'));
          setLoading(false);
        });
        return () => unsubscribeData();
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // ဓာတ်ပုံ ရွေးချယ်ခြင်း
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(f);
    }
  };

  // ဝန်ထမ်းအသစ်ကို အချက်အလက်အစုံဖြင့် သိမ်းဆည်းခြင်း
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || isSaving) return;
    setIsSaving(true);
    try {
      let photoUrl = "";
      if (file) {
        const storageRef = ref(storage, `personnel/${auth.currentUser.uid}/${Date.now()}.jpg`);
        await uploadBytes(storageRef, file);
        photoUrl = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, "employees"), {
        name: empName,
        position: empPosition,
        email: empEmail,
        phone: empPhone,
        address: empAddress,
        taxId: empTaxId,
        salary: parseFloat(empSalary) || 0,
        photoUrl,
        uid: auth.currentUser.uid,
        status: 'active',
        createdAt: serverTimestamp()
      });
      
      setShowAddModal(false);
      resetForm();
    } catch (err) { alert("Error saving employee"); }
    finally { setIsSaving(false); }
  };

  const resetForm = () => {
    setEmpName(''); setEmpPosition(''); setEmpEmail(''); setEmpPhone('');
    setEmpAddress(''); setEmpTaxId(''); setEmpSalary(''); setFile(null); setPreview(null);
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
        name: editItem.name,
        position: editItem.position || "",
        phone: editItem.phone || "",
        email: editItem.email || "",
        address: editItem.address || "",
        taxId: editItem.taxId || "",
        salary: Number(editItem.salary) || 0,
        photoUrl: finalPhoto
      });
      setEditItem(null);
    } catch (err) { alert("Update failed"); }
    finally { setIsSaving(false); }
  };

  const handleArchive = async (id: string) => {
    if (confirm("ဒီဝန်ထမ်း အလုပ်ထွက်သွားပြီလား? Archive လုပ်လိုက်ရင် စာရင်းဟောင်းတွေ မပျောက်ပါဘူး။")) {
      await updateDoc(doc(db, "employees", id), { status: 'archived' });
    }
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp || !payAmount) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, "transactions"), {
        description: `W-2 Salary: ${selectedEmp.name}`,
        amount: parseFloat(payAmount),
        category: 'w2_wages',
        date: serverTimestamp(),
        uid: auth.currentUser?.uid,
      });
      alert("Payroll Processed!");
      setShowPayModal(false);
      setPayAmount('');
    } catch (err) { alert("Error"); }
    finally { setIsSaving(false); }
  };

  return (
    <Layout>
      <div className="pt-4 pb-40 px-4 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h2 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight italic uppercase">Employees (W-2)</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Personnel Management</p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center gap-2 transition-all">
            <UserPlus size={18}/> REGISTER NEW
          </button>
        </div>

        <div className="space-y-4">
          {loading ? (
             <p className="p-10 text-center font-black animate-pulse text-slate-300">Syncing...</p>
          ) : employees.length === 0 ? (
            <div className="bg-white dark:bg-slate-800/50 p-20 rounded-[3rem] border border-slate-200 dark:border-slate-700 text-center border-dashed">
                <UsersIcon size={48} className="mx-auto mb-4 text-slate-200" />
                <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No employees found.</p>
            </div>
          ) : (
            employees.map(emp => (
              <div key={emp.id} className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-xl border-2 border-slate-50 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center group transition-all hover:border-emerald-500">
                <Link href={`/payroll/view/${emp.id}`} className="flex items-center gap-5 flex-1 w-full cursor-pointer">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-slate-100 dark:border-slate-700 shadow-inner">
                        {emp.photoUrl ? <img src={emp.photoUrl} className="w-full h-full object-cover" /> : emp.name?.charAt(0)}
                    </div>
                    <div>
                        <p className="font-black text-xl text-slate-800 dark:text-white tracking-tight">{emp.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{emp.position || 'Full-time Staff'}</p>
                    </div>
                </Link>

                <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0 border-t md:border-t-0 pt-4 md:pt-0 border-slate-50 dark:border-slate-700 justify-end">
                    <button onClick={() => setEditItem({...emp})} className="p-3 text-slate-300 dark:text-slate-600 hover:text-emerald-500 transition-colors"><Edit3 size={20} /></button>
                    <button onClick={() => handleArchive(emp.id)} className="p-3 text-slate-300 dark:text-slate-600 hover:text-rose-500 transition-colors"><UserX size={20} /></button>
                    <button onClick={() => { setSelectedEmp(emp); setShowPayModal(true); }} className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-6 py-3 rounded-xl font-black text-xs hover:bg-emerald-600 transition-all active:scale-95 shadow-md">PAY SALARY</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- ADD MODAL: Comprehensive Version --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-4xl rounded-[3rem] p-8 md:p-12 relative shadow-2xl animate-in zoom-in duration-200 max-h-[90vh] overflow-y-auto border-t-8 border-emerald-500">
            <button onClick={() => {setShowAddModal(false); resetForm();}} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900 bg-slate-50 p-2 rounded-full"><X size={24} /></button>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-10 tracking-tight italic uppercase">Register New Employee</h3>
            
            <form onSubmit={handleAddEmployee} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-1">
                <label className="relative h-64 border-4 border-dashed border-slate-200 dark:border-slate-700 rounded-[3rem] bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 transition-all overflow-hidden shadow-inner group">
                    {preview ? <img src={preview} className="absolute inset-0 w-full h-full object-cover" alt="p" /> : (
                      <div className="text-center text-slate-300 font-black"><Camera className="mx-auto mb-2 opacity-20" size={48} /> <p className="text-[10px] tracking-widest uppercase">ID PHOTO / FACE</p></div>
                    )}
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
              </div>

              <div className="lg:col-span-2 space-y-5">
                <input type="text" value={empName} onChange={e => setEmpName(e.target.value)} placeholder="Full Legal Name" className="w-full p-5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-3xl font-black text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-all" required />
                <div className="grid grid-cols-2 gap-4">
                    <input type="text" value={empPosition} onChange={e => setEmpPosition(e.target.value)} placeholder="Position / Job Title" className="w-full p-5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-3xl font-bold text-slate-900 dark:text-white outline-none" required />
                    <input type="number" value={empSalary} onChange={e => setEmpSalary(e.target.value)} placeholder="Starting Salary ($)" className="w-full p-5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-3xl font-black text-slate-900 dark:text-white outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <input type="email" value={empEmail} onChange={e => setEmpEmail(e.target.value)} placeholder="Email Address" className="w-full p-5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-3xl font-bold text-slate-900 dark:text-white outline-none" />
                    <input type="tel" value={empPhone} onChange={e => setEmpPhone(e.target.value)} placeholder="Phone Number" className="w-full p-5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-3xl font-bold text-slate-900 dark:text-white outline-none" />
                </div>
                <textarea value={empAddress} onChange={e => setEmpAddress(e.target.value)} placeholder="Full Mailing Address (NC/NY)" className="w-full h-24 p-5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-3xl font-bold text-slate-900 dark:text-white outline-none" />
                <input type="text" value={empTaxId} onChange={e => setEmpTaxId(e.target.value)} placeholder="Social Security Number (SSN)" className="w-full p-5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-3xl font-black tracking-[0.3em] text-slate-900 dark:text-white outline-none" />
                
                <button type="submit" disabled={isSaving} className="w-full bg-slate-900 dark:bg-emerald-600 text-white p-6 rounded-3xl font-black uppercase tracking-widest shadow-2xl hover:bg-emerald-500 transition-all active:scale-95">
                  {isSaving ? <Loader2 className="animate-spin mx-auto" /> : "COMPLETE REGISTRATION"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT MODAL (Contractor နဲ့ ပုံစံတူ) --- */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto border-t-8 border-blue-500">
            <button onClick={() => setEditItem(null)} className="absolute top-6 right-6 text-slate-400 bg-slate-50 p-2 rounded-full"><X size={20}/></button>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-8 tracking-tight uppercase italic">Edit Employee Profile</h3>
            <form onSubmit={handleUpdate} className="space-y-6">
                <div className="relative w-32 h-32 mx-auto bg-slate-50 rounded-3xl overflow-hidden border-4 border-white dark:border-slate-700 shadow-xl group">
                    {editItem.photoUrl ? <img src={editItem.photoUrl} className="absolute inset-0 w-full h-full object-cover opacity-80" alt="p" /> : <UsersIcon size={48} className="text-slate-200 m-auto mt-6" />}
                    <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"><Camera size={24} className="text-white" /></div>
                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => { const f=e.target.files?.[0]; if(f){ const r=new FileReader(); r.readAsDataURL(f); r.onload=(ev)=>setEditItem({...editItem, photoUrl: ev.target?.result as string, newFile: f}); } }} />
                </div>
                <div className="space-y-4">
                    <input type="text" value={editItem.name} onChange={e => setEditItem({...editItem, name: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-3xl font-black text-slate-900 dark:text-white focus:border-blue-500 outline-none transition-all" required />
                    <div className="grid grid-cols-2 gap-4">
                        <input type="tel" value={editItem.phone || ''} onChange={e => setEditItem({...editItem, phone: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl font-bold text-slate-900 dark:text-white outline-none" placeholder="Phone" />
                        <input type="text" value={editItem.taxId || ''} onChange={e => setEditItem({...editItem, taxId: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl font-black text-slate-900 dark:text-white outline-none" placeholder="SSN" />
                    </div>
                    <textarea value={editItem.address || ''} onChange={e => setEditItem({...editItem, address: e.target.value})} className="w-full h-24 p-4 bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl font-bold text-slate-900 dark:text-white outline-none" placeholder="Address" />
                </div>
                <button type="submit" disabled={isSaving} className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase shadow-xl hover:bg-blue-600 transition-all active:scale-95">
                    {isSaving ? <Loader2 className="animate-spin mx-auto" /> : "Save Profile Changes"}
                </button>
            </form>
          </div>
        </div>
      )}

      {/* --- PAY MODAL --- */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[3rem] shadow-2xl p-10 relative animate-in zoom-in duration-200">
            <button onClick={() => setShowPayModal(false)} className="absolute top-8 right-8 text-slate-400 bg-slate-50 p-2 rounded-full"><X size={20}/></button>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 uppercase italic">Issue Salary</h3>
            <p className="text-slate-500 font-bold mb-10 italic">Paying to: <span className="text-emerald-500 font-black">{selectedEmp?.name}</span></p>
            <form onSubmit={handlePaySubmit} className="space-y-6">
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300">$</span>
                <input type="number" step="0.01" autoFocus value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.00" className="w-full pl-12 pr-6 py-6 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-3xl font-black text-4xl text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-all" required />
              </div>
              <button type="submit" disabled={isSaving} className="w-full bg-emerald-600 text-white p-6 rounded-full font-black uppercase tracking-widest shadow-xl hover:bg-slate-900 transition-all flex items-center justify-center gap-3 active:scale-95">
                <DollarSign size={24}/> CONFIRM & PAYOUT
              </button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}