// app/payroll/page.tsx
"use client";
import Layout from '@/components/Layout';
import { Users, UserPlus, DollarSign } from 'lucide-react';

export default function Payroll() {
  return (
    <Layout>
      <div className="pt-4">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Contractor Payroll</h2>
            <p className="text-slate-400 font-bold uppercase text-[10px] mt-1 tracking-widest">Manage 1099-NEC Payments</p>
          </div>
          <button className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-xs shadow-xl flex items-center gap-2">
            <UserPlus size={18}/> ADD CONTRACTOR
          </button>
        </div>

        {/* Contractor Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
           <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-50 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Paid (YTD)</p>
              <h3 className="text-3xl font-black text-slate-900">$0.00</h3>
           </div>
           <div className="bg-emerald-50 p-8 rounded-[2.5rem] border-2 border-emerald-100 shadow-sm">
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Upcoming 1099-NEC Deadline</p>
              <h3 className="text-xl font-black text-emerald-900 italic">Jan 31, 2027</h3>
           </div>
        </div>

        <div className="bg-white p-20 rounded-[3rem] border-4 border-dashed border-slate-100 text-center">
            <Users size={60} className="mx-auto text-slate-100 mb-6" />
            <h3 className="text-xl font-black text-slate-900">Start paying your team</h3>
            <p className="text-slate-400 font-bold text-sm max-w-xs mx-auto mt-2 leading-relaxed">
                Add your first contractor to start tracking tax-deductible professional service payments.
            </p>
        </div>
      </div>
    </Layout>
  );
}