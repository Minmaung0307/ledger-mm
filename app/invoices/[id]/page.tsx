// app/invoices/[id]/page.tsx
"use client";
import { useEffect, useState, useRef } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { Download, ArrowLeft } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Link from 'next/link';

export default function InvoiceDetail() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

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

  const downloadPDF = async () => {
    if (!invoiceRef.current || isGenerating) return;
    
    setIsGenerating(true);
    console.log("Generating PDF...");

    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true, // ပုံတွေပါရင် ဒါမှအဆင်ပြေမှာပါ
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Invoice_${invoice.invoiceNumber}.pdf`);
      console.log("PDF Saved!");
    } catch (error) {
      console.error("PDF Error:", error);
      alert("Failed to generate PDF. Check console for details.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!invoice) return <Layout><p className="p-20 text-center font-black">LOADING INVOICE...</p></Layout>;

  return (
    <Layout>
      <div className="pt-6 pb-20 max-w-4xl mx-auto px-4">
        {/* Actions */}
        <div className="flex justify-between items-center mb-10">
          <Link href="/invoices" className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-900 transition">
            <ArrowLeft size={20} /> Back to List
          </Link>
          
          <button 
            onClick={downloadPDF} 
            disabled={isGenerating}
            className={`px-8 py-4 rounded-2xl font-black text-xs flex items-center gap-2 shadow-xl transition active:scale-95 ${
              isGenerating ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            <Download size={18} /> 
            {isGenerating ? "GENERATING PDF..." : "DOWNLOAD PDF"}
          </button>
        </div>

        {/* Invoice Area */}
        <div 
          ref={invoiceRef} 
          className="bg-white p-12 md:p-16 rounded-[2.5rem] shadow-2xl border border-slate-100 flex flex-col overflow-hidden"
          style={{ width: '210mm', minHeight: '297mm', margin: '0 auto' }} // A4 Size ချိန်ထားခြင်း
        >
          {/* Business Info */}
          <div className="flex justify-between items-start mb-16">
            <div>
              <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tighter mb-4">INVOICE</h1>
              <div className="bg-slate-900 text-white px-4 py-1 inline-block rounded-lg font-bold text-sm tracking-widest">
                #{invoice.invoiceNumber}
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-emerald-600 mb-2">{profile?.businessName || 'Your Business Name'}</p>
              <p className="text-sm font-bold text-slate-400 max-w-[250px] leading-relaxed whitespace-pre-wrap">
                {profile?.address || 'Set your business address in Settings'}
              </p>
            </div>
          </div>

          {/* Client Info */}
          <div className="grid grid-cols-2 gap-20 mb-20">
            <div className="p-8 bg-slate-50 rounded-[2rem]">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Bill To:</p>
              <p className="text-3xl font-black text-slate-900">{invoice.clientName}</p>
            </div>
            <div className="text-right pt-8">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Issue Date</p>
              <p className="text-xl font-bold text-slate-900">
                {invoice.createdAt?.toDate().toLocaleDateString() || 'Recently'}
              </p>
            </div>
          </div>

          {/* Table Header */}
          <div className="border-b-4 border-slate-900 pb-4 mb-4 flex justify-between font-black text-[10px] text-slate-900 uppercase tracking-[0.2em]">
            <span>Description of Services</span>
            <span>Total</span>
          </div>

          {/* Item Row */}
          <div className="py-10 flex justify-between items-center border-b border-slate-50">
            <div>
              <p className="text-xl font-black text-slate-900">Project / Service Delivery</p>
              <p className="text-sm font-bold text-slate-400 mt-1 italic">Consultation and project management</p>
            </div>
            <span className="text-3xl font-black text-slate-900">${Number(invoice.amount).toLocaleString()}</span>
          </div>

          {/* Totals Section */}
          <div className="mt-auto pt-20 flex flex-col items-end">
            <div className="w-80 space-y-4">
              <div className="flex justify-between text-slate-400 font-bold px-4">
                <span>Subtotal:</span>
                <span>${Number(invoice.amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center bg-emerald-50 p-6 rounded-3xl">
                <span className="font-black text-emerald-900 uppercase text-xs">Total Amount Due:</span>
                <span className="text-4xl font-black text-emerald-600">${Number(invoice.amount).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-20 text-center border-t-2 border-slate-50 pt-10">
            <p className="text-sm font-black text-slate-900">Thank you for choosing {profile?.businessName || 'our services'}!</p>
            <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-[0.3em]">www.simpleledger.app</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}