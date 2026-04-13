// app/payroll/employees/page.tsx
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { Users, UserPlus, DollarSign } from 'lucide-react';

export default function EmployeesW2() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [payAmount, setPayAmount] = useState('');

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

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // ၁။ လစာ (W-2 Wage) အဖြစ် Ledger ထဲ သွင်းမယ်
      await addDoc(collection(db, "transactions"), {
        description: `W-2 Salary: ${selectedEmp.name}`,
        amount: parseFloat(payAmount),
        category: 'w2_wages',
        date: serverTimestamp(),
        uid: auth.currentUser?.uid,
      });
      alert("Payroll processed and added to Ledger!");
      setShowPayModal(false);
      setPayAmount('');
    } catch (err) { alert("Error processing payroll"); }
  };

  return (
    <Layout>
      <div className="pt-4 pb-20">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">W-2 Employees</h2>
          <button className="bg-emerald-600 text-white px-6 py-4 rounded-2xl font-black text-xs shadow-xl flex items-center gap-2">
            <UserPlus size={18}/> ADD EMPLOYEE
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {employees.length === 0 ? (
            <div className="bg-white p-20 rounded-[3rem] border-4 border-dashed border-slate-100 text-center text-slate-400 font-bold">No W-2 Employees yet.</div>
          ) : (
            employees.map(emp => (
              <div key={emp.id} className="bg-white p-6 rounded-[2rem] shadow-xl border-2 border-slate-50 flex justify-between items-center">
                <p className="font-black text-xl text-slate-900">{emp.name}</p>
                <button onClick={() => { setSelectedEmp(emp); setShowPayModal(true); }} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-xs uppercase">Pay Salary</button>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}