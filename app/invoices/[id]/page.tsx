// app/invoices/[id]/page.tsx
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle, Trash2, Printer, ArrowLeft } from 'lucide-react';
import { 
  doc, getDoc, updateDoc, deleteDoc, 
  addDoc, collection, serverTimestamp 
} from 'firebase/firestore'; // လိုအပ်တာတွေ အကုန် import လုပ်လိုက်ပြီ
import Link from 'next/link';

export default function InvoiceDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);

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

  // Invoice Status ပြောင်းလဲခြင်းနှင့် Ledger ထဲ စာရင်းသွင်းခြင်း
  const toggleStatus = async () => {
    if (!invoice || !id || isUpdating) return;
    const newStatus = invoice.status === 'Paid' ? 'Unpaid' : 'Paid';
    
    setIsUpdating(true);
    try {
      const invRef = doc(db, "invoices", id as string);
      await updateDoc(invRef, { status: newStatus });
      
      // Paid ဖြစ်သွားရင် Ledger ထဲ ထည့်မလား မေးမယ်
      if (newStatus === 'Paid') {
        const confirmLedger = confirm("Invoice marked as Paid! Do you want to add this to your Ledger as Income?");
        if (confirmLedger) {
          await addDoc(collection(db, "transactions"), {
            description: `Payment from ${invoice.clientName} (Inv #${invoice.invoiceNumber})`,
            amount: invoice.amount,
            category: 'income',
            date: serverTimestamp(),
            uid: auth.currentUser?.uid,
          });
          alert("Successfully added to Ledger!");
        }
      }
      window.location.reload(); 
    } catch (error) {
      console.error(error);
      alert("Error updating status");
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this invoice?")) {
      await deleteDoc(doc(db, "invoices", id as string));
      router.push("/invoices");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!invoice) return <Layout><p className="p-20 text-center font-black animate-pulse">LOADING INVOICE...</p></Layout>;

  return (
    <Layout>
      <style jsx global>{`
        @media print {
          @page { margin: 10mm; }
          aside, nav, .no-print { display: none !important; }
          main { margin-left: 0 !important; padding: 0 !important; }
          body { background: white !important; }
          .invoice-card { box-shadow: none !important; border: none !important; width: 100% !important; margin: 0 !important; }
        }
      `}</style>

      <div className="pt-4 pb-10 max-w-4xl mx-auto px-4">
        {/* Actions - ဒီမှာ ခလုတ်တွေ အကုန် စုပေးထားပါတယ် */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 no-print">
          <Link href="/invoices" className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-900 transition">
            <ArrowLeft size={18} /> BACK
          </Link>
          
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={toggleStatus}
              disabled={isUpdating}
              className={`px-6 py-3 rounded-2xl font-black text-[10px] flex items-center gap-2 shadow-lg transition active:scale-95 ${
                invoice.status === 'Paid' ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
              }`}
            >
              <CheckCircle size={16} /> 
              {isUpdating ? "UPDATING..." : (invoice.status === 'Paid' ? 'MARK AS UNPAID' : 'MARK AS PAID')}
            </button>

            <button 
              onClick={handlePrint}
              className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] flex items-center gap-2 shadow-lg active:scale-95 transition"
            >
              <Printer size={16} /> PRINT INVOICE
            </button>

            <button 
              onClick={handleDelete}
              className="bg-rose-100 text-rose-600 p-3 rounded-2xl hover:bg-rose-600 hover:text-white transition active:scale-95 shadow-sm"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>

        {/* Invoice Area */}
        <div className="invoice-card bg-white p-10 md:p-12 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col overflow-hidden">
          
          {/* Header */}
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

          {/* Billing Info */}
          <div className="grid grid-cols-2 gap-6 mb-10">
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Bill To:</p>
              <p className="text-2xl font-black text-slate-900 leading-none">{invoice.clientName}</p>
            </div>
            <div className="text-right pt-6 pr-2">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Issue Date</p>
              <p className="text-md font-bold text-slate-900 uppercase">
                {invoice.createdAt?.toDate().toLocaleDateString() || 'Recently'}
              </p>
              <div className={`mt-2 inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                invoice.status === 'Paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
              }`}>
                {invoice.status || 'Unpaid'}
              </div>
            </div>
          </div>

          <div className="border-b-2 border-slate-900 pb-2 mb-2 flex justify-between font-black text-[9px] text-slate-900 uppercase tracking-[0.2em]">
            <span>Service Description</span>
            <span>Amount</span>
          </div>

          <div className="py-6 flex justify-between items-center border-b border-slate-50">
            <div>
              <p className="text-md font-black text-slate-900">Professional Services / Project Delivery</p>
              <p className="text-[11px] font-bold text-slate-400 mt-0.5 italic">Consultation and professional project execution.</p>
            </div>
            <span className="text-xl font-black text-slate-900">${Number(invoice.amount).toLocaleString()}</span>
          </div>

          <div className="mt-8 flex flex-col items-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between items-center bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
                <span className="font-black text-emerald-900 uppercase text-[10px] tracking-widest">Total Amount Due:</span>
                <span className="text-3xl font-black text-emerald-600">${Number(invoice.amount).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center border-t border-slate-100 pt-6">
            <p className="text-[11px] font-black text-slate-900 uppercase tracking-tighter">Thank you for your business!</p>
            <p className="text-[9px] font-bold text-slate-300 mt-1 uppercase tracking-[0.3em]">Generated by SimpleLedger Cloud</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}