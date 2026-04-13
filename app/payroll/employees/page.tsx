// app/payroll/employees/page.tsx
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { UserPlus, X, DollarSign, Users as UsersIcon } from 'lucide-react'; // Users ကို UsersIcon လို့ နာမည်ပြောင်းသုံးပါမယ်

export default function EmployeesW2() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [empName, setEmpName] = useState('');
  const [empPosition, setEmpPosition] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Salary Payment States
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [payAmount, setPayAmount] = useState('');

  // ၁။ စာရင်းဆွဲထုတ်ခြင်း
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(collection(db, "employees"), where("uid", "==", user.uid));
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
        createdAt: serverTimestamp()
      });
      setShowAddModal(false);
      setEmpName(''); setEmpPosition('');
    } catch (err) { alert("Error saving employee"); }
    finally { setIsSaving(false); }
  };

  // ၃။ လစာပေးခြင်း (Ledger ထဲ စာရင်းသွင်းခြင်း)
  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp || !payAmount) return;
    try {
      await addDoc(collection(db, "transactions"), {
        description: `W-2 Salary: ${selectedEmp.name}`,
        amount: parseFloat(payAmount),
        category: 'w2_wages', // IRS Expense Category
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
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Employees (W-2)</h2>
            <p className="text-slate-400 font-bold uppercase text-[10px] mt-1 tracking-widest italic">Full-time Staff Management</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-emerald-600 text-white px-6 py-4 rounded-2xl font-black text-xs shadow-xl flex items-center gap-2 active:scale-95 transition-all"
          >
            <UserPlus size={18}/> ADD EMPLOYEE
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {employees.length === 0 ? (
            <div className="bg-white p-20 rounded-[3rem] border-4 border-dashed border-slate-100 text-center text-slate-300 font-bold">
                <UsersIcon size={48} className="mx-auto mb-4 opacity-20" />
                No employees registered yet.
            </div>
          ) : (
            employees.map(emp => (
              <div key={emp.id} className="bg-white p-6 rounded-[2.5rem] shadow-xl border-2 border-slate-50 flex justify-between items-center group hover:border-emerald-500 transition-all">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-slate-400 text-xl group-hover:bg-emerald-100 group-hover:text-emerald-600 transition uppercase border-2 border-slate-100">
                        {emp.name.charAt(0)}
                    </div>
                    <div>
                        <p className="font-black text-slate-900 text-xl tracking-tight">{emp.name}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{emp.position}</p>
                    </div>
                </div>
                <button 
                  onClick={() => { setSelectedEmp(emp); setShowPayModal(true); }}
                  className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[10px] hover:bg-emerald-600 transition shadow-lg tracking-widest uppercase"
                >
                  PAY SALARY
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- MODAL 1: Add Employee --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 relative shadow-2xl animate-in zoom-in duration-200">
            <button onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900"><X /></button>
            <h3 className="text-2xl font-black text-slate-900 mb-8 tracking-tight uppercase">Register Employee</h3>
            <form onSubmit={handleAddEmployee} className="space-y-6">
              <input type="text" value={empName} onChange={e => setEmpName(e.target.value)} placeholder="Full Name" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-emerald-500 outline-none transition-all" required />
              <input type="text" value={empPosition} onChange={e => setEmpPosition(e.target.value)} placeholder="Position (e.g. Manager)" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-emerald-500 outline-none transition-all" required />
              <button type="submit" disabled={isSaving} className="w-full bg-emerald-600 text-white p-5 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-slate-900 transition-all">
                {isSaving ? "SAVING..." : "SAVE EMPLOYEE"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: Pay Salary (ဒါလေး ကျန်ခဲ့လို့ မှိန်နေတာပါ) --- */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 relative shadow-2xl animate-in zoom-in duration-200">
            <button onClick={() => setShowPayModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900"><X /></button>
            <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight uppercase">Record Salary</h3>
            <p className="text-slate-500 font-bold mb-8 italic">Paying to: <span className="text-emerald-600">{selectedEmp?.name}</span></p>
            
            <form onSubmit={handlePaySubmit} className="space-y-6">
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl font-black text-slate-300">$</span>
                <input 
                  type="number" step="0.01" autoFocus
                  value={payAmount} onChange={e => setPayAmount(e.target.value)} 
                  placeholder="0.00" 
                  className="w-full pl-12 pr-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-2xl focus:border-emerald-500 outline-none transition-all" 
                  required 
                />
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2">
                <DollarSign size={20}/> CONFIRM PAYMENT
              </button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}