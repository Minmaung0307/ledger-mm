// app/payroll/employees/page.tsx
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { UserPlus, X, DollarSign, Users as UsersIcon, UserX, Edit3, Loader2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function EmployeesW2() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- Modals States ---
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null); // Edit Modal အတွက်
  
  // --- Form States ---
  const [empName, setEmpName] = useState('');
  const [empPosition, setEmpPosition] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // ၁။ စာရင်းဆွဲထုတ်ခြင်း (အဟောင်းတွေပါ ပြန်ပေါ်အောင် Filter ပြင်ထားပါတယ်)
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(collection(db, "employees"), where("uid", "==", user.uid));
        const unsubscribeData = onSnapshot(q, (snapshot) => {
          const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
          // archived လုပ်ထားသူမှလွဲ၍ ကျန်သူအားလုံး (status မပါသူများအပါအဝင်) ကို ပြမည်
          setEmployees(items.filter(i => i.status !== 'archived'));
          setLoading(false);
        });
        return () => unsubscribeData();
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // ၂။ ဝန်ထမ်းအသစ်ထည့်ခြင်း
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || isSaving) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, "employees"), {
        name: empName,
        position: empPosition,
        uid: auth.currentUser.uid,
        status: 'active',
        createdAt: serverTimestamp()
      });
      setShowAddModal(false);
      setEmpName(''); setEmpPosition('');
    } catch (err) { alert("Error saving employee"); }
    finally { setIsSaving(false); }
  };

  // ၃။ အချက်အလက် ပြင်ဆင်ခြင်း (Update Logic)
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem || isSaving) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, "employees", editItem.id), {
        name: editItem.name,
        position: editItem.position || "",
        salary: Number(editItem.salary) || 0
      });
      setEditItem(null);
      alert("Updated successfully!");
    } catch (err) { alert("Update failed"); }
    finally { setIsSaving(false); }
  };

  // ၄။ Archive Logic (အလုပ်ထွက်သူများအား ဖျောက်ထားခြင်း)
  const handleArchive = async (id: string) => {
    if (confirm("ဒီဝန်ထမ်း အလုပ်ထွက်သွားပြီလား? Archive လုပ်လိုက်ရင် စာရင်းဟောင်းတွေ မပျောက်ပေမယ့် ဒီ List ထဲမှာ မပေါ်တော့ပါဘူး။")) {
      try {
        await updateDoc(doc(db, "employees", id), { status: 'archived' });
      } catch (err) { alert("Error archiving employee"); }
    }
  };

  // ၅။ လစာပေးခြင်း (Ledger ထဲသို့ တိုက်ရိုက်ပို့ခြင်း)
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
        verified: false
      });
      alert("Payment added to Ledger!");
      setShowPayModal(false);
      setPayAmount('');
    } catch (err) { alert("Error recording payroll"); }
    finally { setIsSaving(false); }
  };

  return (
    <Layout>
      <div className="pt-4 pb-40 px-4 max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h2 className="text-3xl font-semibold text-slate-800 dark:text-white tracking-tight uppercase italic">Employees (W-2)</h2>
            <p className="text-slate-400 text-[10px] font-medium uppercase tracking-widest mt-1">Staff Payroll Management</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-full font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2"
          >
            <UserPlus size={18}/> NEW EMPLOYEE
          </button>
        </div>

        {/* --- Sleek List View --- */}
        <div className="space-y-4">
          {loading ? (
             <p className="p-10 text-center font-black animate-pulse text-slate-300 uppercase text-xs tracking-widest">Accessing records...</p>
          ) : employees.length === 0 ? (
            <div className="bg-white dark:bg-slate-800/50 p-16 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 text-center border-dashed">
                <UsersIcon size={40} className="mx-auto mb-4 text-slate-200 dark:text-slate-600" />
                <p className="text-slate-400 font-medium text-sm">No active employees found.</p>
            </div>
          ) : (
            employees.map(emp => (
              <div key={emp.id} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-5 md:px-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center group transition-all hover:border-emerald-400 hover:shadow-xl hover:shadow-emerald-500/5">
                <Link href={`/payroll/view/${emp.id}`} className="flex items-center gap-5 flex-1 w-full cursor-pointer">
                    <div className="w-14 h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center font-black text-slate-400 text-xl border border-slate-100 dark:border-slate-700 shadow-inner group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 group-hover:text-emerald-500 transition-all">
                        {emp.name?.charAt(0)}
                    </div>
                    <div>
                        <p className="font-bold text-lg text-slate-800 dark:text-white tracking-tight group-hover:text-emerald-500 transition-colors">{emp.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{emp.position || 'Staff Member'}</p>
                    </div>
                </Link>

                <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0 border-t md:border-t-0 pt-4 md:pt-0 border-slate-50 dark:border-slate-700 justify-end">
                    {/* Edit Button */}
                    <button onClick={() => setEditItem({...emp})} className="p-2.5 text-slate-300 dark:text-slate-600 hover:text-emerald-500 transition-colors">
                        <Edit3 size={18} />
                    </button>
                    {/* Archive Button */}
                    <button onClick={() => handleArchive(emp.id)} className="p-2.5 text-slate-300 dark:text-slate-600 hover:text-rose-500 transition-colors">
                        <UserX size={18} />
                    </button>
                    {/* Pay Button - Sleek Pill Design */}
                    <button 
                      onClick={() => { setSelectedEmp(emp); setShowPayModal(true); }}
                      className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-6 py-2.5 rounded-full font-bold text-[10px] uppercase tracking-widest shadow-md hover:bg-emerald-600 dark:hover:bg-emerald-400 transition-all active:scale-95"
                    >
                      PAY SALARY
                    </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- MODAL: Add Employee --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[2.5rem] p-10 relative shadow-2xl animate-in zoom-in duration-200">
            <button onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900"><X /></button>
            <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-8 tracking-tight uppercase italic">Register Staff</h3>
            <form onSubmit={handleAddEmployee} className="space-y-6">
              <input type="text" value={empName} onChange={e => setEmpName(e.target.value)} placeholder="Full Name" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-all" required />
              <input type="text" value={empPosition} onChange={e => setEmpPosition(e.target.value)} placeholder="Position (e.g. Manager)" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-all" required />
              <button type="submit" disabled={isSaving} className="w-full bg-emerald-500 text-white p-5 rounded-full font-black uppercase tracking-widest shadow-lg hover:bg-slate-900 transition-all">
                {isSaving ? <Loader2 className="animate-spin mx-auto" /> : "Save Profile"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: Edit Employee --- */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[2.5rem] p-10 relative shadow-2xl animate-in zoom-in duration-200">
            <button onClick={() => setEditItem(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900"><X /></button>
            <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-8 tracking-tight uppercase italic">Edit Employee</h3>
            <form onSubmit={handleUpdate} className="space-y-6">
              <input type="text" value={editItem.name} onChange={e => setEditItem({...editItem, name: e.target.value})} placeholder="Full Name" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-all" required />
              <input type="text" value={editItem.position} onChange={e => setEditItem({...editItem, position: e.target.value})} placeholder="Position" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-all" />
              <input type="number" value={editItem.salary} onChange={e => setEditItem({...editItem, salary: e.target.value})} placeholder="Base Salary ($)" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-all" />
              <button type="submit" disabled={isSaving} className="w-full bg-slate-900 dark:bg-emerald-500 text-white p-5 rounded-full font-black uppercase tracking-widest shadow-xl hover:bg-emerald-600 transition-all">
                {isSaving ? <Loader2 className="animate-spin mx-auto" /> : "Apply Changes"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: Pay Salary --- */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[2.5rem] p-10 relative shadow-2xl animate-in zoom-in duration-200">
            <button onClick={() => setShowPayModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900"><X /></button>
            <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2 tracking-tight uppercase italic">Record Payment</h3>
            <p className="text-slate-500 font-medium mb-8 italic">Paying to: <span className="text-emerald-500 font-black">{selectedEmp?.name}</span></p>
            <form onSubmit={handlePaySubmit} className="space-y-6">
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl font-black text-slate-300">$</span>
                <input type="number" step="0.01" autoFocus value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.00" className="w-full pl-12 pr-6 py-5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl font-black text-3xl text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-all" required />
              </div>
              <button type="submit" disabled={isSaving} className="w-full bg-emerald-500 text-white p-5 rounded-full font-black uppercase tracking-widest shadow-xl hover:bg-slate-900 transition-all flex items-center justify-center gap-2">
                <DollarSign size={20}/> CONFIRM PAYOUT
              </button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}