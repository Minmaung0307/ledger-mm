// app/invoices/[id]/page.tsx
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle, Trash2, Printer, ArrowLeft, Edit3, X } from 'lucide-react';
import { 
  doc, getDoc, updateDoc, deleteDoc, 
  addDoc, collection, serverTimestamp 
} from 'firebase/firestore';
import Link from 'next/link';

export default function InvoiceDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Edit Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editClientName, setEditClientName] = useState('');
  const [editAmount, setEditAmount] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user || !id) return;
      const invSnap = await getDoc(doc(db, "invoices", id as string));
      if (invSnap.exists()) {
        const data = invSnap.data();
        setInvoice(data);
        setEditClientName(data.clientName);
        setEditAmount(data.amount.toString());
      }
      const profSnap = await getDoc(doc(db, "profiles", user.uid));
      if (profSnap.exists()) setProfile(profSnap.data());
    };
    fetchData();
  }, [id]);

  const handleUpdateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const invRef = doc(db, "invoices", id as string);
      await updateDoc(invRef, {
        clientName: editClientName,
        amount: parseFloat(editAmount)
      });
      setShowEditModal(false);
      window.location.reload();
    } catch (error) {
      alert("Error updating invoice");
      setIsUpdating(false);
    }
  };

  const toggleStatus = async () => {
    if (!invoice || !id || isUpdating) return;
    const newStatus = invoice.status === 'Paid' ? 'Unpaid' : 'Paid';
    
    setIsUpdating(true); // Loading စတင်မယ်
    
    try {
      const invRef = doc(db, "invoices", id as string);
      
      // ၁။ Database မှာ အရင်သွားပြင်မယ်
      await updateDoc(invRef, { status: newStatus });
      
      // ၂။ Paid ဖြစ်သွားရင် Ledger ထဲ ထည့်မလား မေးမယ်
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
          alert("Success! Added to Ledger.");
        }
      }

      // ၃။ အရေးကြီးဆုံးအပိုင်း - Refresh လုပ်မယ့်အစား Local State ကို တိုက်ရိုက်ပြင်မယ်
      // ဒါဆိုရင် "Loading" တစ်မနေတော့ဘဲ UI က ချက်ချင်းပြောင်းသွားမှာပါ
      setInvoice({ ...invoice, status: newStatus });
      
    } catch (error) {
      console.error(error);
      alert("Error updating status");
    } finally {
      // ၄။ အလုပ်ပြီးရင် Loading ကို ပိတ်လိုက်မယ်
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (confirm("Delete this invoice?")) {
      await deleteDoc(doc(db, "invoices", id as string));
      router.push("/invoices");
    }
  };

  if (!invoice) return <Layout><p className="p-20 text-center font-black animate-pulse">LOADING...</p></Layout>;

  return (
    <Layout>
      <style jsx global>{`
        @media print {
          aside, nav, .no-print, button { display: none !important; }
          main { margin-left: 0 !important; padding: 0 !important; }
          .invoice-card { box-shadow: none !important; border: none !important; width: 100% !important; margin: 0 !important; }
        }
      `}</style>

      <div className="pt-4 pb-10 max-w-4xl mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 no-print">
          <Link href="/invoices" className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-900 transition">
            <ArrowLeft size={18} /> BACK
          </Link>
          
          <div className="flex flex-wrap gap-2">
            <button onClick={toggleStatus} disabled={isUpdating} className={`px-4 py-3 rounded-xl font-black text-[10px] flex items-center gap-2 shadow-md ${invoice.status === 'Paid' ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'}`}>
              <CheckCircle size={14} /> {invoice.status === 'Paid' ? 'MARK AS UNPAID' : 'MARK AS PAID'}
            </button>
            <button onClick={() => window.print()} className="bg-slate-900 text-white px-4 py-3 rounded-xl font-black text-[10px] flex items-center gap-2 shadow-md">
              <Printer size={14} /> PRINT
            </button>
            <button onClick={() => setShowEditModal(true)} className="bg-white border-2 border-slate-100 text-slate-600 px-4 py-3 rounded-xl font-black text-[10px] flex items-center gap-2 shadow-sm hover:bg-slate-50">
              <Edit3 size={14} /> EDIT
            </button>
            <button onClick={handleDelete} className="bg-rose-100 text-rose-600 p-3 rounded-xl hover:bg-rose-600 hover:text-white transition">
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {/* Invoice Area */}
        <div className="invoice-card bg-white p-10 md:p-12 rounded-[2rem] shadow-xl border border-slate-100 flex flex-col">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-black text-slate-900 uppercase">INVOICE</h1>
              <div className="mt-2 bg-slate-900 text-white px-3 py-0.5 inline-block rounded-md font-bold text-[10px]">#{invoice.invoiceNumber}</div>
            </div>
            <div className="text-right text-emerald-600 font-black uppercase text-xl">{profile?.businessName || 'Business Name'}</div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-10">
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Bill To:</p>
              <p className="text-2xl font-black text-slate-900">{invoice.clientName}</p>
            </div>
            <div className="text-right pt-6">
              <p className="text-md font-bold text-slate-900">{invoice.createdAt?.toDate().toLocaleDateString()}</p>
              <span className={`mt-2 inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase ${invoice.status === 'Paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                {invoice.status}
              </span>
            </div>
          </div>

          <div className="py-10 border-y-2 border-slate-900 flex justify-between items-center">
            <p className="text-xl font-black">Total Amount Due:</p>
            <p className="text-4xl font-black text-emerald-600">${Number(invoice.amount).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* --- Edit Modal --- */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm no-print">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 relative">
            <button onClick={() => setShowEditModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900"><X size={24} /></button>
            <h3 className="text-2xl font-black text-slate-900 mb-6 tracking-tight">Edit Invoice</h3>
            <form onSubmit={handleUpdateInvoice} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Client Name</label>
                <input type="text" value={editClientName} onChange={e => setEditClientName(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-emerald-500 focus:bg-white" required />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Amount ($)</label>
                <input type="number" step="0.01" value={editAmount} onChange={e => setEditAmount(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-xl outline-none focus:border-emerald-500 focus:bg-white" required />
              </div>
              <button type="submit" disabled={isUpdating} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black tracking-widest hover:bg-emerald-600 transition shadow-xl">
                {isUpdating ? "SAVING..." : "UPDATE INVOICE"}
              </button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}