// app/payroll/employees/page.tsx
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
// ပြင်ဆင်ချက် ၁: doc, updateDoc ပါဝင်အောင် ထည့်သွင်းထားပါသည်
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
// ပြင်ဆင်ချက် ၂: UserX icon (Archive အတွက်) ထည့်သွင်းထားပါသည်
import { UserPlus, X, DollarSign, Users as UsersIcon, UserX } from 'lucide-react';

export default function EmployeesW2() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [empName, setEmpName] = useState('');
  const [empPosition, setEmpPosition] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [payAmount, setPayAmount] = useState('');

  // ၁။ စာရင်းဆွဲထုတ်ခြင်း (Active ဖြစ်သူများကိုသာ ပြမည်)
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // ပြင်ဆင်ချက် ၃: status === 'active' ဖြစ်သူများကိုသာ စစ်ထုတ်ယူပါသည်
        const q = query(
          collection(db, "employees"), 
          where("uid", "==", user.uid),
          where("status", "==", "active")
        );
        
        const unsubscribeData = onSnapshot(q, (snapshot) => {
          setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
        status: 'active', // ပြင်ဆင်ချက် ၄: ပုံမှန်အားဖြင့် active အဖြစ် သတ်မှတ်ပါသည်
        createdAt: serverTimestamp()
      });
      setShowAddModal(false);
      setEmpName(''); setEmpPosition('');
    } catch (err) { alert("Error saving employee"); }
    finally { setIsSaving(false); }
  };

  // ၃။ Archive Logic (အလုပ်ထွက်သွားသူများအား သိမ်းဆည်းခြင်း)
  const handleArchive = async (id: string) => {
    if (confirm("ဒီဝန်ထမ်း အလုပ်ထွက်သွားပြီလား? Archive လုပ်လိုက်ရင် စာရင်းဟောင်းတွေ မပျောက်ပေမယ့် ဒီ List ထဲမှာ မပေါ်တော့ပါဘူး။")) {
      try {
        await updateDoc(doc(db, "employees", id), { status: 'archived' });
      } catch (err) { alert("Error archiving employee"); }
    }
  };

  // ၄။ လစာပေးခြင်း
  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp || !payAmount) return;
    try {
      await addDoc(collection(db, "transactions"), {
        description: `W-2 Salary: ${selectedEmp.name}`,
        amount: parseFloat(payAmount),
        category: 'w2_wages',
        date: serverTimestamp(),
        uid: auth.currentUser?.uid,
      });
      alert("Payment recorded successfully!");
      setShowPayModal(false);
      setPayAmount('');
    } catch (err) { alert("Error recording payroll"); }
  };

  return (
    <Layout>
      <div className="pt-4 pb-20 px-4">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase">Employees (W-2)</h2>
            <p className="text-slate-400 font-bold uppercase text-[10px] mt-1 tracking-widest italic">Full-time Staff Management</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-emerald-600 text-white px-6 py-4 rounded-2xl font-black text-xs shadow-xl flex items-center gap-2 active:scale-95 transition-all hover:bg-slate-900"
          >
            <UserPlus size={18}/> ADD EMPLOYEE
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {employees.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 p-20 rounded-[3rem] border-4 border-dashed border-slate-100 dark:border-slate-700 text-center">
                <UsersIcon size={48} className="mx-auto mb-4 opacity-20 text-slate-400" />
                <p className="text-slate-300 font-black italic uppercase">No active employees found.</p>
            </div>
          ) : (
            employees.map(emp => (
              <div key={emp.id} className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-xl border-2 border-slate-50 dark:border-slate-700 flex justify-between items-center group hover:border-emerald-500 transition-all">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center font-black text-slate-400 text-xl border-2 border-slate-100 dark:border-slate-700">
                        {emp.name?.charAt(0) || 'E'}
                    </div>
                    <div>
                        <p className="font-black text-slate-900 dark:text-white text-xl tracking-tight">{emp.name}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{emp.position}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* ပြင်ဆင်ချက် ၅: Archive Button ထည့်သွင်းထားပါသည် */}
                    <button 
                      onClick={() => handleArchive(emp.id)}
                      className="p-3 text-slate-200 hover:text-rose-500 transition-colors"
                      title="Archive Employee"
                    >
                        <UserX size={20} />
                    </button>

                    <button 
                      onClick={() => { setSelectedEmp(emp); setShowPayModal(true); }}
                      className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[10px] hover:bg-emerald-600 transition shadow-lg tracking-widest uppercase"
                    >
                      PAY SALARY
                    </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- MODAL 1: Add Employee --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[2.5rem] p-10 relative shadow-2xl animate-in zoom-in duration-200">
            <button onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900"><X /></button>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-8 tracking-tight uppercase italic">Register Employee</h3>
            <form onSubmit={handleAddEmployee} className="space-y-6">
              <input type="text" value={empName} onChange={e => setEmpName(e.target.value)} placeholder="Full Name" className="w-full p-5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-all" required />
              <input type="text" value={empPosition} onChange={e => setEmpPosition(e.target.value)} placeholder="Position (e.g. Manager)" className="w-full p-5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-all" required />
              <button type="submit" disabled={isSaving} className="w-full bg-emerald-600 text-white p-5 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-slate-900 transition-all">
                {isSaving ? "SAVING..." : "SAVE EMPLOYEE"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: Pay Salary --- */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[2.5rem] p-10 relative shadow-2xl animate-in zoom-in duration-200">
            <button onClick={() => setShowPayModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900"><X /></button>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight uppercase italic">Record Salary</h3>
            <p className="text-slate-500 font-bold mb-8 italic">Paying to: <span className="text-emerald-600 font-black">{selectedEmp?.name}</span></p>
            
            <form onSubmit={handlePaySubmit} className="space-y-6">
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl font-black text-slate-300">$</span>
                <input 
                  type="number" step="0.01" autoFocus
                  value={payAmount} onChange={e => setPayAmount(e.target.value)} 
                  placeholder="0.00" 
                  className="w-full pl-12 pr-6 py-5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-2xl text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-all" 
                  required 
                />
              </div>
              <button type="submit" className="w-full bg-[#111827] text-white p-5 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2">
                <DollarSign size={20}/> CONFIRM PAYMENT
              </button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}