// app/invoices/[id]/page.tsx
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function InvoiceDetail() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user || !id) return;
      const invSnap = await getDoc(doc(db, "invoices", id as string));
      if (invSnap.exists()) setInvoice(invSnap.data());
      const profSnap = await getDoc(doc(db, "profiles", user.uid));
      if (profSnap.exists()) setProfile(profSnap.data());
    };
    fetchData();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (!invoice) return <Layout><p className="p-20 text-center font-black">LOADING...</p></Layout>;

  return (
    <Layout>
      <style jsx global>{`
        @media print {
          @page {
            margin: 10mm; /* Browser default headers/footers ဖျောက်ဖို့ margin ထည့်ခြင်း */
          }
          aside, nav, .no-print {
            display: none !important;
          }
          main {
            margin-left: 0 !important;
            padding: 0 !important;
          }
          body {
            background: white !important;
          }
          .invoice-card {
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>

      <div className="pt-4 pb-10 max-w-4xl mx-auto px-4">
        {/* Actions */}
        <div className="flex justify-between items-center mb-6 no-print">
          <Link href="/invoices" className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-900 transition">
            <ArrowLeft size={18} /> Back
          </Link>
          <button 
            onClick={handlePrint}
            className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg hover:bg-emerald-700 transition"
          >
            <Printer size={18} /> PRINT INVOICE
          </button>
        </div>

        {/* Invoice Area - ကျစ်ကျစ်လစ်လစ် ပြင်ထားသော ဒီဇိုင်း */}
        <div className="invoice-card bg-white p-10 md:p-12 rounded-[2rem] shadow-xl border border-slate-100 flex flex-col overflow-hidden">
          
          {/* Header Section */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">INVOICE</h1>
              <div className="mt-2 bg-slate-900 text-white px-3 py-0.5 inline-block rounded-md font-bold text-[10px] tracking-widest">
                #{invoice.invoiceNumber}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-emerald-600 uppercase">{profile?.businessName || 'Your Business Name'}</p>
              <p className="text-[10px] font-bold text-slate-400 max-w-[200px] leading-tight whitespace-pre-wrap ml-auto">
                {profile?.address || 'Set address in settings'}
              </p>
            </div>
          </div>

          {/* Billing Info Section - ပိုကပ်သွားအောင် mb-8 ထားလိုက်ပါတယ် */}
          <div className="grid grid-cols-2 gap-6 mb-10">
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Bill To:</p>
              <p className="text-2xl font-black text-slate-900 leading-none">{invoice.clientName}</p>
            </div>
            <div className="text-right pt-6 pr-2">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Issue Date</p>
              <p className="text-md font-bold text-slate-900">
                {invoice.createdAt?.toDate().toLocaleDateString() || 'Recently'}
              </p>
            </div>
          </div>

          {/* Table Header */}
          <div className="border-b-2 border-slate-900 pb-2 mb-2 flex justify-between font-black text-[9px] text-slate-900 uppercase tracking-[0.2em]">
            <span>Service Description</span>
            <span>Amount</span>
          </div>

          {/* Item Row - Padding လျှော့လိုက်ပါတယ် */}
          <div className="py-4 flex justify-between items-center border-b border-slate-50">
            <div>
              <p className="text-md font-black text-slate-900">Professional Services / Project Delivery</p>
              <p className="text-[11px] font-bold text-slate-400 mt-0.5 italic tracking-tight">Consultation and professional project execution.</p>
            </div>
            <span className="text-xl font-black text-slate-900">${Number(invoice.amount).toLocaleString()}</span>
          </div>

          {/* Totals Section - ပိုကျစ်အောင် ပြင်ထားပါတယ် */}
          <div className="mt-8 flex flex-col items-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-slate-400 font-bold text-xs px-2">
                <span>Subtotal:</span>
                <span>${Number(invoice.amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                <span className="font-black text-emerald-900 uppercase text-[10px] tracking-widest">Amount Due:</span>
                <span className="text-2xl font-black text-emerald-600">${Number(invoice.amount).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Simple Footer */}
          <div className="mt-12 text-center border-t border-slate-100 pt-6">
            <p className="text-[11px] font-black text-slate-900 uppercase">Thank you for your business!</p>
            <p className="text-[9px] font-bold text-slate-300 mt-1 uppercase tracking-[0.3em]">Generated by SimpleLedger Cloud</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}