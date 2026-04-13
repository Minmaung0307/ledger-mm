// app/invoices/page.tsx
"use client";
import Layout from '@/components/Layout';
import { FileText, Plus } from 'lucide-react';

export default function Invoices() {
  return (
    <Layout>
      <div className="pt-6">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Invoices</h2>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Bill your clients</p>
          </div>
          <button className="bg-emerald-600 text-white p-5 rounded-[1.5rem] shadow-xl hover:bg-emerald-700 transition flex items-center gap-3 font-black text-xs">
            <Plus size={20} /> CREATE INVOICE
          </button>
        </div>

        <div className="bg-white p-20 rounded-[3rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center text-center">
          <div className="bg-slate-50 p-8 rounded-full mb-6">
            <FileText size={60} className="text-slate-200" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2">No Invoices Yet</h3>
          <p className="text-slate-400 font-bold max-w-xs">Professional invoicing feature is coming soon to your personal ledger.</p>
        </div>
      </div>
    </Layout>
  );
}