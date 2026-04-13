// app/payroll/employees/page.tsx (Updated)
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { Users, UserPlus, X } from 'lucide-react';

export default function EmployeesW2() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [empName, setEmpName] = useState('');
  const [empPosition, setEmpPosition] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(collection(db, "employees"), where("uid", "==", user.uid));
        onSnapshot(q, (snapshot) => {
          setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
      }
    });
  }, []);

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
    } catch (err) { alert("Error!"); }
    finally { setIsSaving(false); }
  };

  return (
    <Layout>
      <div className="pt-4 pb-20 px-4">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight tracking-tighter">Employees (W-2)</h2>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-emerald-600 text-white px-6 py-4 rounded-2xl font-black text-xs shadow-xl flex items-center gap-2"
          >
            <UserPlus size={18}/> ADD EMPLOYEE
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {employees.length === 0 ? (
            <div className="bg-white p-20 rounded-[3rem] border-4 border-dashed border-slate-100 text-center text-slate-300 font-bold">No employees registered.</div>
          ) : (
            employees.map(emp => (
              <div key={emp.id} className="bg-white p-8 rounded-[2.5rem] shadow-xl border-2 border-slate-50 flex justify-between items-center group">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-400 text-xl group-hover:bg-emerald-600 group-hover:text-white transition uppercase">
                        {emp.name.charAt(0)}
                    </div>
                    <div>
                        <p className="font-black text-slate-900 text-xl">{emp.name}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{emp.position}</p>
                    </div>
                </div>
                <button className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-xs">PAY SALARY</button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- Add Employee Modal --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 relative">
            <button onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900"><X /></button>
            <h3 className="text-2xl font-black text-slate-900 mb-8 tracking-tight">Register Employee</h3>
            <form onSubmit={handleAddEmployee} className="space-y-6">
              <input type="text" value={empName} onChange={e => setEmpName(e.target.value)} placeholder="Full Name" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-emerald-500 outline-none" required />
              <input type="text" value={empPosition} onChange={e => setEmpPosition(e.target.value)} placeholder="Position (e.g. Manager)" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-emerald-500 outline-none" required />
              <button type="submit" disabled={isSaving} className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase tracking-widest shadow-xl">
                {isSaving ? "SAVING..." : "SAVE EMPLOYEE"}
              </button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}