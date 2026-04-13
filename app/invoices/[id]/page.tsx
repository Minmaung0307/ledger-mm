// app/invoices/[id]/page.tsx
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { Printer, ArrowLeft, Download } from 'lucide-react';
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

  // အကောင်းဆုံးနည်းလမ်းဖြစ်တဲ့ Native Print ကို သုံးပါမယ်
  const handlePrint = () => {
    window.print();
  };

  if (!invoice) return <Layout><p className="p-20 text-center font-black">LOADING INVOICE...</p></Layout>;

  return (
    <Layout>
      {/* 
        အောက်က Style က Print ထုတ်တဲ့အခါ Sidebar နဲ့ ခလုတ်တွေကို ဖျောက်ပေးပြီး 
        Invoice ကိုပဲ A4 အပြည့် ပေါ်စေမှာပါ 
      */}
      <style jsx global>{`
        @media print {
          aside, nav, .no-print, button {
            display: none !important;
          }
          main {
            margin-left: 0 !important;
            padding: 0 !important;
          }
          .invoice-box {
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
            padding: 0 !important;
          }
          body {
            background: white !important;
          }
        }
      `}</style>

      <div className="pt-6 pb-20 max-w-4xl mx-auto px-4">
        {/* Actions - No Print Section */}
        <div className="flex justify-between items-center mb-10 no-print">
          <Link href="/invoices" className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-900 transition">
            <ArrowLeft size={20} /> Back to List
          </Link>
          
          <button 
            onClick={handlePrint}
            className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-xs flex items-center gap-3 shadow-xl hover:bg-emerald-700 transition active:scale-95"
          >
            <Printer size={18} /> 
            PRINT / SAVE AS PDF
          </button>
        </div>

        {/* Invoice Design Area */}
        <div className="invoice-box bg-white p-12 md:p-16 rounded-[2.5rem] shadow-2xl border border-slate-100 flex flex-col min-h-[1000px]">
          
          {/* Header */}
          <div className="flex justify-between items-start mb-16">
            <div>
              <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tighter mb-4">INVOICE</h1>
              <div className="bg-slate-900 text-white px-4 py-1 inline-block rounded-lg font-bold text-sm">
                #{invoice.invoiceNumber}
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-emerald-600 mb-2">{profile?.businessName || 'Business Name'}</p>
              <p className="text-sm font-bold text-slate-400 max-w-[250px] leading-relaxed whitespace-pre-wrap">
                {profile?.address || 'Your Address'}
              </p>
            </div>
          </div>

          {/* Billing Info */}
          <div className="grid grid-cols-2 gap-10 mb-20">
            <div className="p-8 bg-slate-50 rounded-[2rem]">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Bill To:</p>
              <p className="text-3xl font-black text-slate-900">{invoice.clientName}</p>
            </div>
            <div className="text-right pt-8 px-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Issue Date</p>
              <p className="text-xl font-bold text-slate-900">
                {invoice.createdAt?.toDate().toLocaleDateString() || 'N/A'}
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="border-b-4 border-slate-900 pb-4 mb-4 flex justify-between font-black text-[10px] text-slate-900 uppercase tracking-[0.2em]">
            <span>Description</span>
            <span>Total</span>
          </div>

          <div className="py-10 flex justify-between items-center border-b border-slate-50">
            <div>
              <p className="text-xl font-black text-slate-900 uppercase">Professional Services</p>
              <p className="text-sm font-bold text-slate-400 mt-1 italic tracking-tight">Project delivery and consultation fee</p>
            </div>
            <span className="text-3xl font-black text-slate-900">${Number(invoice.amount).toLocaleString()}</span>
          </div>

          {/* Summary */}
          <div className="mt-auto pt-20 flex flex-col items-end">
            <div className="w-80 space-y-4">
              <div className="flex justify-between items-center bg-emerald-50 p-6 rounded-3xl">
                <span className="font-black text-emerald-900 uppercase text-xs">Total Amount Due:</span>
                <span className="text-4xl font-black text-emerald-600">${Number(invoice.amount).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-20 text-center border-t-2 border-slate-50 pt-10">
            <p className="text-sm font-black text-slate-900 uppercase">Thank you for your business!</p>
            <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-[0.3em]">System Generated Invoice</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}