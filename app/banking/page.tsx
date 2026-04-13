// app/banking/page.tsx
"use client";
import Layout from '@/components/Layout';
import { Landmark, UploadCloud, Link as LinkIcon } from 'lucide-react';

export default function Banking() {
  return (
    <Layout>
      <div className="pt-4">
        <h2 className="text-4xl font-black text-slate-900 mb-2">Banking</h2>
        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-10">Connect & Sync Finances</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="md:col-span-2 bg-white p-12 rounded-[3rem] shadow-xl border-2 border-slate-50 flex flex-col items-center justify-center text-center">
              <div className="bg-emerald-50 p-6 rounded-full mb-6">
                <Landmark size={40} className="text-emerald-600" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Sync with US Banks</h3>
              <p className="text-slate-400 font-bold max-w-sm mb-8">Securely link Chase, Wells Fargo, BofA, and more to auto-categorize transactions.</p>
              <button className="bg-emerald-600 text-white px-10 py-5 rounded-[2rem] font-black text-sm shadow-xl flex items-center gap-3">
                 <LinkIcon size={20}/> CONNECT VIA PLAID
              </button>
           </div>

           <div className="bg-slate-900 p-10 rounded-[3rem] text-white flex flex-col justify-between">
              <div>
                <UploadCloud size={30} className="text-emerald-400 mb-6" />
                <h4 className="text-xl font-black mb-2 leading-tight">Manual Import</h4>
                <p className="text-slate-400 text-sm font-bold">Upload bank statements (CSV/QBO) to import transactions manually.</p>
              </div>
              <button className="mt-10 border-2 border-slate-700 p-4 rounded-2xl font-black text-xs hover:bg-slate-800 transition">
                SELECT FILE
              </button>
           </div>
        </div>
      </div>
    </Layout>
  );
}