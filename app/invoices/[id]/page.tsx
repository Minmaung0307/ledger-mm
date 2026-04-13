// app/invoices/[id]/page.tsx
"use client";
import { useEffect, useState, useRef } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { Download, Share2, ArrowLeft } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Link from 'next/link';

export default function InvoiceDetail() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user || !id) return;

      // Invoice Data ဆွဲမယ်
      const invSnap = await getDoc(doc(db, "invoices", id as string));
      if (invSnap.exists()) setInvoice(invSnap.data());

      // Settings ထဲက Business Profile ဆွဲမယ်
      const profSnap = await getDoc(doc(db, "profiles", user.uid));
      if (profSnap.exists()) setProfile(profSnap.data());
    };
    fetchData();
  }, [id]);

  const downloadPDF = async () => {
    if (!invoiceRef.current) return;
    const canvas = await html2canvas(invoiceRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, width, height);
    pdf.save(`Invoice_${invoice.invoiceNumber}.pdf`);
  };

  if (!invoice) return <Layout><p className="p-20 text-center font-black">LOADING INVOICE...</p></Layout>;

  return (
    <Layout>
      <div className="pt-6 pb-20 max-w-4xl mx-auto">
        {/* Action Buttons */}
        <div className="flex justify-between items-center mb-10 no-print">
          <Link href="/invoices" className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-900 transition">
            <ArrowLeft size={20} /> Back to List
          </Link>
          <div className="flex gap-4">
            <button onClick={downloadPDF} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 shadow-xl active:scale-95 transition">
              <Download size={18} /> DOWNLOAD PDF
            </button>
          </div>
        </div>

        {/* Invoice Design (PDF ထွက်လာမယ့် အပိုင်း) */}
        <div ref={invoiceRef} className="bg-white p-12 rounded-[2.5rem] shadow-2xl border border-slate-100 min-h-[800px] flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-start mb-16">
            <div>
              <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-4">INVOICE</h1>
              <p className="text-sm font-black text-slate-400">#{invoice.invoiceNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-emerald-600">{profile?.businessName || 'Your Business Name'}</p>
              <p className="text-xs font-bold text-slate-400 mt-1 max-w-[200px] leading-relaxed">
                {profile?.address || 'Set your address in Settings'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-20 mb-16">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Bill To:</p>
              <p className="text-2xl font-black text-slate-900">{invoice.clientName}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Date Issued:</p>
              <p className="text-lg font-bold text-slate-900">{invoice.createdAt?.toDate().toLocaleDateString() || 'Recently'}</p>
            </div>
          </div>

          {/* Table Header */}
          <div className="border-y-2 border-slate-50 py-4 flex justify-between font-black text-[10px] text-slate-400 uppercase tracking-[0.2em]">
            <span>Description</span>
            <span>Total Amount</span>
          </div>

          {/* Item Row */}
          <div className="py-8 flex justify-between items-center border-b border-slate-50">
            <span className="text-lg font-black text-slate-900">Services Provided / Project Fee</span>
            <span className="text-2xl font-black text-slate-900">${Number(invoice.amount).toLocaleString()}</span>
          </div>

          {/* Totals Section */}
          <div className="mt-auto pt-16 flex flex-col items-end">
            <div className="w-64 space-y-4">
              <div className="flex justify-between text-slate-400 font-bold">
                <span>Subtotal:</span>
                <span>${Number(invoice.amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400 font-bold">
                <span>Tax (0%):</span>
                <span>$0.00</span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t-2 border-slate-100">
                <span className="font-black text-slate-900 uppercase text-xs">Total Due:</span>
                <span className="text-3xl font-black text-slate-900">${Number(invoice.amount).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-20 border-t border-slate-50 pt-8 text-center">
            <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Thank you for your business!</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}