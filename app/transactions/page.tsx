// app/transactions/page.tsx
"use client";
// @ts-ignore
import { saveAs } from 'file-saver';
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth, storage } from '@/lib/firebase'; // storage ထည့်ထားပါတယ်
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, where, updateDoc, getDocs, writeBatch, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; // storage function များ
import { Trash2, Download, Image as ImageIcon, Search, Filter, Edit3, X, CheckCircle2, AlertTriangle, Camera, Calendar as CalendarIcon, Landmark, CheckSquare, Square, FileArchive } from 'lucide-react';
import { TAX_CATEGORIES } from '@/lib/constants';
import JSZip from 'jszip';


export default function TransactionsList() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showOnlyReceipts, setShowOnlyReceipts] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [isRecurring, setIsRecurring] = useState(false); // Edit modal အတွက် recurring state
  const [isSaving, setIsSaving] = useState(false); // <--- ဒီစာကြောင်းလေး ရှိဖို့ လိုပါတယ်

  // --- Bulk Operation States ---
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const q = query(
          collection(db, "transactions"), 
          where("uid", "==", user.uid), 
          orderBy("date", "desc")
        );

        // --- ဒီအပိုင်းကို အခုလို အသေအချာ ပြန်လဲပေးပါ ---
        const unsubscribeData = onSnapshot(q, (snapshot) => {
          if (!snapshot) return;

          // hasPendingWrites check ကို ဖယ်လိုက်ပါမယ် (ဒါမှ ချက်ချင်းပြောင်းမှာပါ)
          const items = snapshot.docs.map(doc => {
            const data = doc.data();
            // serverTimestamp မကျလာသေးတဲ့အချိန် (Pending ဖြစ်နေချိန်) မှာ error မတက်အောင် Guard လုပ်မယ်
            const safeDate = data.transactionDate?.toDate?.() || data.date?.toDate?.() || new Date();
            
            return { 
              id: doc.id, 
              ...data,
              verified: data.verified || false, // verified field ကို သေချာဖတ်မယ်
              displayDate: safeDate
            };
          });

          setTransactions(items);
          setLoading(false);
        }, (error) => {
          console.error("Firestore error:", error);
          setLoading(false);
        });

        // Chart of Accounts ဆွဲယူခြင်း
        try {
          const qAcc = query(collection(db, "chart_of_accounts"), where("uid", "==", user.uid));
          const accSnap = await getDocs(qAcc);
          if (accSnap) {
            setAccounts(accSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
          }
        } catch (err) { 
          console.error("Accounts fetch error:", err); 
        }

        return () => unsubscribeData();
      } else {
        setTransactions([]);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // --- Bulk Logic ---
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filtered.length) setSelectedIds([]);
    else setSelectedIds(filtered.map(t => t.id));
  };

  const handleBulkVerify = async () => {
    if (selectedIds.length === 0) return;

    // ၁။ မျက်နှာပြင်ပေါ်က စာရင်းတွေကို ချက်ချင်း အစိမ်းရောင် အမှန်ခြစ် ပြောင်းခိုင်းမယ်
    // ဒါမှ လူကြီးမင်း နှိပ်လိုက်တာနဲ့ UI က ချက်ချင်း တုံ့ပြန်မှာပါ
    setTransactions(prev => prev.map(item => 
      selectedIds.includes(item.id) ? { ...item, verified: true } : item
    ));

    const batch = writeBatch(db);
      selectedIds.forEach(id => {
        batch.update(doc(db, "transactions", id), { verified: true });
      });

      try {
        // ၂။ ဒေတာဘေ့စ်မှာ တကယ်သွားပြင်မယ်
        await batch.commit();
        const count = selectedIds.length;
        setSelectedIds([]); // Selection တွေကို ပြန်ဖြုတ်မယ်
        alert(`Verified ${count} records successfully!`);
      } catch (error) {
        // အကယ်၍ အမှားတက်ခဲ့ရင် အမှန်အတိုင်း ပြန်ဖြစ်သွားအောင် စာမျက်နှာကို refresh လုပ်မယ်
        console.error("Bulk Verify Error:", error);
        window.location.reload();
        alert("Error: Some records could not be verified.");
      }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0 || !confirm(`Delete ${selectedIds.length} records permanently?`)) return;
    const batch = writeBatch(db);
    selectedIds.forEach(id => {
      batch.delete(doc(db, "transactions", id));
    });
    await batch.commit();
    setSelectedIds([]);
    alert("Deleted successfully!");
  };

  const exportToCSV = () => {
      if (filtered.length === 0) return alert("No data to export");
      const headers = "Date,Description,Category,Amount,Verified,Account\n";
      const rows = filtered.map(t => {
          const date = t.transactionDate?.toDate?.().toLocaleDateString() || t.date?.toDate?.().toLocaleDateString() || "N/A";
          return `${date},${t.description},${t.category},${t.amount},${t.verified ? 'YES' : 'NO'},${t.bankAccount || 'Other'}`;
      }).join("\n");
      const blob = new Blob([headers + rows], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ledger_export_${new Date().getFullYear()}.csv`;
      a.click();
  };

  const downloadAuditZip = async () => {
      const zip = new JSZip();
      const csvContent = "Date,Description,Category,Amount\n" + 
          filtered.map(t => `${t.date?.toDate().toLocaleDateString()},${t.description},${t.category},${t.amount}`).join("\n");
      
      // ၁။ CSV ဖိုင်ကို Zip ထဲထည့်မယ်
      zip.file("business_ledger.csv", csvContent);
      
      // ၂။ ပုံ (Receipts) တွေကို Folder လိုက် စုထည့်မယ်
      alert("Starting to bundle your receipts... please wait.");
      
      const imgFolder = zip.folder("receipt_images");
      for (const item of filtered) {
          if (item.receiptUrl) {
              try {
                  const response = await fetch(item.receiptUrl);
                  const blob = await response.blob();
                  imgFolder?.file(`${item.description}_${item.id}.jpg`, blob);
              } catch (err) { console.error("Skip image:", err); }
          }
      }

      // ၃။ Zip ဖိုင်ကို ထုတ်ပေးမယ်
      const content = await zip.generateAsync({ type: "blob" });
      // const url = window.URL.createObjectURL(content);
      // const a = document.createElement('a');
      // a.href = url;
      // a.download = `Business_Audit_Package_${new Date().getFullYear()}.zip`;
      // a.click();
      // window.URL.revokeObjectURL(url);
      saveAs(content, `Business_Audit_Package_${new Date().getFullYear()}.zip`);
  };

  const isPotentialDuplicate = (item: any) => {
    // Dismiss လုပ်ထားတဲ့စာရင်းထဲမှာ ပါနေရင် warning မပြတော့ဘူး
    if (dismissedAlerts.includes(item.id)) return false; 

    const itemDate = item.transactionDate?.toDate().toLocaleDateString() || item.date?.toDate().toLocaleDateString();
    return transactions.some(other => 
      other.id !== item.id && 
      other.description === item.description && 
      other.amount === item.amount &&
      (other.transactionDate?.toDate().toLocaleDateString() || other.date?.toDate().toLocaleDateString()) === itemDate
    );
  };

  const toggleVerify = async (id: string, currentStatus: boolean) => {
    // ၁။ မျက်နှာပြင်ပေါ်က စာရင်း (Local State) ကို အရင်ဆုံး ချက်ချင်း ပြောင်းလိုက်မယ်
    // ဒါမှ လူကြီးမင်း နှိပ်လိုက်တာနဲ့ အစိမ်းရောင်လေး ချက်ချင်း ပေါ်လာမှာပါ
    setTransactions(prev => prev.map(item => 
      item.id === id ? { ...item, verified: !currentStatus } : item
    ));

    try {
      // ၂။ ပြီးမှ Database (Firebase) မှာ သွားပြီး အတည်ပြုမယ်
      const docRef = doc(db, "transactions", id);
      await updateDoc(docRef, { verified: !currentStatus });
    } catch (error) {
    // တကယ်လို့ အင်တာနက်မကောင်းလို့ Database မှာ ပြင်မရခဲ့ရင် 
    // အမှန်ခြစ်ကို မူလအတိုင်း ပြန်ဖြုတ်လိုက်မယ် (Rollback)
    setTransactions(prev => prev.map(item => 
      item.id === id ? { ...item, verified: currentStatus } : item
    ));
    alert("Error: Could not sync with bank record."); }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this record?")) {
      try { await deleteDoc(doc(db, "transactions", id)); } catch (error) { alert("Error deleting"); }
    }
  };

  const handleUpdateTransaction = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editItem?.id || isSaving) return;
      setIsSaving(true);

      try {
        let finalUrl = editItem.receiptUrl || "";
        if (editItem.newFile) {
          const sRef = ref(storage, `receipts/${auth.currentUser?.uid}/${Date.now()}.jpg`);
          await uploadBytes(sRef, editItem.newFile);
          finalUrl = await getDownloadURL(sRef);
        }

        // ၁။ လက်ရှိ ပြင်နေတဲ့ စာရင်းအတွက် အချက်အလက်များကို ပြင်ဆင်မယ်
        const baseData = {
          description: editItem.description,
          amount: Number(editItem.amount),
          category: editItem.category,
          bankAccount: editItem.bankAccount || "Other",
          transactionDate: new Date(editItem.tempDate),
          receiptUrl: finalUrl,
          uid: auth.currentUser?.uid,
        };

        // ၂။ Firestore မှာ လက်ရှိစာရင်းကို အရင် Update လုပ်မယ်
        const docRef = doc(db, "transactions", editItem.id);
        await updateDoc(docRef, baseData);

        // ၃။ အကယ်၍ "Monthly Repeat" ကို အမှန်ခြစ်ထားရင် ကျန်တဲ့လတွေအတွက်ပါ ထည့်မယ်
        if (isRecurring) {
          const startDate = new Date(editItem.tempDate);
          const currentYear = startDate.getFullYear();
          const startMonth = startDate.getMonth(); // ၀ ကနေ ၁၁ အထိ
          const dayOfMonth = startDate.getDate();
          
          const promises = [];

          // လက်ရှိပြင်နေတဲ့လရဲ့ "နောက်လ" ကနေ စပြီး ဒီဇင်ဘာ (Month 11) အထိ loop ပတ်မယ်
          for (let m = startMonth + 1; m <= 11; m++) {
              const nextDate = new Date(currentYear, m, dayOfMonth);
              
              // စာရင်းအသစ်တွေအဖြစ် တစ်ခုချင်းစီ ထည့်မယ်
              promises.push(addDoc(collection(db, "transactions"), {
                  ...baseData,
                  transactionDate: nextDate,
                  // နာမည်ကို သိသာအောင် (Month) လေး တွဲပေးလိုက်မယ်
                  description: `${editItem.description} (${nextDate.toLocaleString('default', { month: 'short' })})`,
                  date: serverTimestamp(), 
                  verified: false 
              }));
          }

          // စာရင်းတွေအကုန်လုံး သိမ်းပြီးတဲ့အထိ စောင့်မယ်
          if (promises.length > 0) {
              await Promise.all(promises);
          }
          alert("Record updated and future monthly entries created!");
        } else {
          alert("Updated successfully!");
        }

        // ၄။ အကုန်လုံးပြီးမှ Modal ပိတ်ပြီး UI refresh လုပ်မယ်
        setEditItem(null);
        alert("Updated successfully!");
        setIsRecurring(false);
        window.location.reload(); 
        
      } catch (error: any) {
        console.error("Update error:", error);
        alert("Error: " + error.message);
      } finally {
        setIsSaving(false);
      }
  };

  //   const filtered = transactions.filter(t => { // filteredTransactions အစား filtered လို့ ပြောင်းပါ
  //     const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || t.category.toLowerCase().includes(searchTerm.toLowerCase());
  //     const matchesReceiptToggle = showOnlyReceipts ? (t.receiptUrl && t.receiptUrl !== "") : true;
  //     return matchesSearch && matchesReceiptToggle;
  // });

    const filtered = transactions.filter(t => {
      const searchLower = searchTerm.toLowerCase();
      const d = t.displayDate;
      
      // ၁။ ဆိုင်နာမည် သို့မဟုတ် အမျိုးအစားနဲ့ ရှာမယ်
      const matchesText = t.description.toLowerCase().includes(searchLower) || 
                          t.category.toLowerCase().includes(searchLower);
      
      // ၂။ ငွေပမာဏ (Amount) နဲ့ ရှာမယ် (ဂဏန်းကို စာသားပြောင်းပြီး ရှာခိုင်းတာပါ)
      const matchesAmount = t.amount.toString().includes(searchTerm);

      // ၃။ အမျိုးအစား (Income/Expense) စစ်ထုတ်ခြင်း
      const isInc = t.category === 'income' || t.category === 'w2_income';
      const matchesType = filterType === 'all' ? true : (filterType === 'income' ? isInc : !isInc);

      // ၄။ ရက်စွဲအလိုက် စစ်ထုတ်ခြင်း
      let matchesDate = true;
      if (startDate) matchesDate = matchesDate && d >= new Date(startDate);
      if (endDate) {
          const e = new Date(endDate);
          e.setHours(23,59,59);
          matchesDate = matchesDate && d <= e;
      }

      // အားလုံးကို ပေါင်းစပ်စစ်ထုတ်မယ်
      const matchesSearch = matchesText || matchesAmount;
      const matchesReceipt = showOnlyReceipts ? (t.receiptUrl && t.receiptUrl !== "") : true;

      return matchesSearch && matchesReceipt && matchesType && matchesDate;
  });

  return (
    <Layout>
      <div className="pt-6 pb-40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Ledger Records</h2>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Audit & Multi-Management</p>
          </div>
          
          <div className="flex flex-wrap gap-3">
             <button onClick={handleSelectAll} className="bg-slate-100 text-slate-600 px-4 py-3 rounded-xl font-black text-[10px] flex items-center gap-2 hover:bg-slate-200 transition">
                {selectedIds.length === filtered.length ? <CheckSquare size={16}/> : <Square size={16}/>}
                {selectedIds.length === filtered.length ? "DESELECT ALL" : "SELECT ALL"}
             </button>
             
             <button onClick={() => setShowOnlyReceipts(!showOnlyReceipts)} className={`px-5 py-3 rounded-2xl font-black text-[10px] flex items-center gap-2 transition shadow-md ${
                showOnlyReceipts 
                  ? 'bg-emerald-600 text-white shadow-emerald-500/20' 
                  : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-2 border-slate-100 dark:border-slate-700'
              }`}>
                <Filter size={14} /> {showOnlyReceipts ? "RECEIPTS ONLY" : "ALL RECORDS"}
             </button>
             
             {/* --- Download Buttons Group --- */}
             <div className="flex gap-2">
                <button onClick={exportToCSV} className="bg-slate-900 text-white px-5 py-3 rounded-2xl font-black text-[10px] shadow-xl flex items-center gap-2 active:scale-95 transition-all">
                    <Download size={14} /> CSV
                </button>
                <button onClick={downloadAuditZip} className="bg-emerald-600 text-white px-5 py-3 rounded-2xl font-black text-[10px] shadow-xl flex items-center gap-2 active:scale-95 transition-all">
                    <FileArchive size={14} /> DOWNLOAD AUDIT ZIP
                </button>
             </div>
          </div>
        </div>

        <div className="relative mb-8 group px-2 md:px-0">
          <div className="absolute inset-y-0 left-6 flex items-center text-slate-300"><Search size={22} /></div>
          <input type="text" placeholder="Search records..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-16 pr-6 py-5 border-2 border-slate-100 rounded-[1.8rem] focus:border-emerald-500 outline-none font-bold text-slate-900 bg-white shadow-sm transition-all text-lg"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 no-print">
            <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase">From:</span>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="flex-1 p-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-bold text-sm" />
            </div>
            <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase">To:</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="flex-1 p-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-bold text-sm" />
            </div>
        </div>
        </div>

        {/* --- Bulk Action Floating Bar --- */}
        {selectedIds.length > 0 && (
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] bg-slate-900 text-white px-8 py-4 rounded-[2.5rem] shadow-2xl flex items-center gap-8 animate-in slide-in-from-bottom-10">
                <p className="text-xs font-black uppercase tracking-widest"><span className="text-emerald-400">{selectedIds.length}</span> Items Selected</p>
                <div className="h-6 w-0.5 bg-slate-700"></div>
                <div className="flex gap-4">
                    <button onClick={handleBulkVerify} className="flex items-center gap-2 text-emerald-400 font-black text-[10px] uppercase hover:bg-white/10 p-2 rounded-lg transition"><CheckCircle2 size={16}/> Verify</button>
                    <button onClick={handleBulkDelete} className="flex items-center gap-2 text-rose-400 font-black text-[10px] uppercase hover:bg-white/10 p-2 rounded-lg transition"><Trash2 size={16}/> Delete</button>
                    <button onClick={() => setSelectedIds([])} className="text-slate-400 font-black text-[10px] p-2"><X size={16}/></button>
                </div>
            </div>
        )}
        
        <div className="bg-white rounded-[2.5rem] shadow-2xl border-2 border-slate-50 overflow-hidden divide-y-2 divide-slate-50">
          {loading ? (
            <p className="p-24 text-center font-black animate-pulse text-slate-200">SYNCING...</p>
          ) : (
            filtered.map((item) => {
                const hasDuplicate = isPotentialDuplicate(item);
                const isInc = item.category === 'income';
                const isSelected = selectedIds.includes(item.id);

                return (
                  <div key={item.id} className={`p-4 md:px-8 md:py-3 flex justify-between items-center transition relative 
                    group bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b last:border-0 border-slate-50 dark:border-slate-700
                    ${isSelected ? 'bg-emerald-50 dark:bg-emerald-900/30' : 
                      hasDuplicate ? 'bg-amber-50/20 dark:bg-amber-900/10' : ''}`}>
                    
                    {hasDuplicate && (
                      <div className="absolute top-0.5 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-900 border border-amber-200 text-amber-600 px-3 py-0.5 rounded-full font-black text-[7px] flex items-center gap-1 z-10 animate-pulse shadow-sm">
                        <AlertTriangle size={8} /> DUPLICATE FOUND <button onClick={() => setDismissedAlerts([...dismissedAlerts, item.id])} className="ml-1 border-l pl-1 font-bold hover:text-slate-900">DISMISS</button>
                      </div>
                    )}

                    <div className="flex-1 flex items-center gap-4">
                      <button onClick={() => toggleSelect(item.id)} className={`transition-colors ${isSelected ? 'text-emerald-500' : 'text-slate-200 dark:text-slate-600'}`}>
                        {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                      </button>
                      <button onClick={() => toggleVerify(item.id, item.verified)} className={`p-2 rounded-xl transition-all ${item.verified ? 'bg-emerald-100 text-emerald-600 shadow-inner' : 'bg-slate-50 dark:bg-slate-900 text-slate-200 dark:text-slate-700'}`}><CheckCircle2 size={20} /></button>
                      <div>
                        <p className="font-black text-lg text-slate-900 dark:text-white tracking-tight leading-tight">{item.description}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${isInc ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>{item.category.replace('_', ' ')}</span>
                          <span className="text-[8px] font-black px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full uppercase italic">{item.bankAccount || 'Other'}</span>
                          <span className="text-[9px] font-bold text-slate-300">{(item.transactionDate?.toDate?.() || item.date?.toDate?.() || new Date()).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {item.receiptUrl && <a href={item.receiptUrl} target="_blank" className="text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-xl hover:bg-emerald-500 hover:text-white transition shadow-sm"><ImageIcon size={16} /></a>}
                    </div>

                    <div className="flex items-center gap-4">
                      <p className={`text-lg md:text-xl font-extrabold tracking-tighter ${isInc ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {isInc ? '+' : '-'}${Number(item.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </p>
                      
                      {/* --- ခလုတ်တွေကို အမြဲတမ်း ပေါ်နေအောင် opacity-0 ကို ဖြုတ်လိုက်ပါပြီ --- */}
                      <div className="flex items-center gap-1 transition-all">
                        <button 
                            onClick={() => { 
                                const d = item.transactionDate?.toDate?.() || item.date?.toDate?.() || new Date(); 
                                setEditItem({...item, tempDate: d.toISOString().split('T')[0]}); 
                            }} 
                            className="text-slate-300 dark:text-slate-600 hover:text-emerald-500 p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition"
                            title="Edit"
                        >
                            <Edit3 size={18} />
                        </button>
                        <button 
                            onClick={() => handleDelete(item.id)} 
                            className="text-slate-300 dark:text-slate-600 hover:text-rose-600 p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition"
                            title="Delete"
                        >
                            <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
            })
          )}
        </div>

        {/* --- Edit Modal (Layout အထဲမှာ သေချာ ပြန်ထည့်ထားပါတယ်) --- */}
        {editItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white p-8 lg:p-10 rounded-[3rem] w-full max-w-2xl shadow-2xl relative animate-in zoom-in duration-200 overflow-y-auto max-h-[95vh] border-t-8 border-emerald-500">
              <button onClick={() => setEditItem(null)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900 transition-colors p-2 bg-slate-50 rounded-full"><X size={24} /></button>
              <h3 className="text-3xl font-black text-slate-900 mb-8 tracking-tighter uppercase italic">Update Entry</h3>
              
              <form onSubmit={handleUpdateTransaction} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2 flex items-center gap-2"><Camera size={14} className="text-emerald-500"/> Receipt Evidence</label>
                  <div className="relative h-44 w-full bg-slate-50 rounded-[2.5rem] overflow-hidden border-2 border-dashed border-slate-200 flex items-center justify-center group shadow-inner">
                      {editItem.receiptUrl ? (
                          <>
                              <img src={editItem.receiptUrl} className="absolute inset-0 w-full h-full object-cover opacity-80" alt="r" />
                              <div className="relative z-10 bg-slate-900/50 p-4 rounded-2xl text-white opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100"><Camera size={28} /></div>
                          </>
                      ) : (
                          <div className="text-center text-slate-300 font-black"><Camera size={36} className="mx-auto mb-2 opacity-20" /><p className="text-[10px] tracking-widest">TAP TO CHANGE PHOTO</p></div>
                      )}
                      <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                              const reader = new FileReader();
                              reader.readAsDataURL(file);
                              reader.onload = (ev) => setEditItem({ ...editItem, receiptUrl: ev.target?.result as string, newFile: file });
                          }
                      }} />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Description / Shop Name</label>
                  <input type="text" value={editItem.description} onChange={e => setEditItem({...editItem, description: e.target.value})} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-900 focus:border-emerald-500 outline-none transition-all text-lg" required />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Amount ($)</label>
                    <input type="number" step="0.01" value={editItem.amount} onChange={e => setEditItem({...editItem, amount: e.target.value})} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-2xl text-slate-900 focus:border-emerald-500 outline-none" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2 flex items-center gap-2"><CalendarIcon size={14} className="text-emerald-500" /> Date of Record</label>
                    <input type="date" value={editItem.tempDate} onChange={e => setEditItem({...editItem, tempDate: e.target.value})} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 focus:border-emerald-500 outline-none" required />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Category</label>
                    <select value={editItem.category} onChange={e => setEditItem({...editItem, category: e.target.value})} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 focus:border-emerald-500 outline-none appearance-none transition-all">
                        {TAX_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    {editItem.category && (
                      <div className="mt-4 p-5 bg-emerald-50 border-l-8 border-emerald-400 rounded-2xl">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest italic mb-2">Tax Prep: {TAX_CATEGORIES.find(c => c.value === editItem.category)?.line}</p>
                        <p className="text-xs font-bold text-slate-600 leading-relaxed">{TAX_CATEGORIES.find(c => c.value === editItem.category)?.info}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2 flex items-center gap-2"><Landmark size={14} className="text-emerald-500" /> Paid From (Account)</label>
                    <select value={editItem.bankAccount || "Cash/Other"} onChange={e => setEditItem({...editItem, bankAccount: e.target.value})} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 focus:border-emerald-500 outline-none appearance-none transition-all">
                        {accounts.map(acc => <option key={acc.id} value={acc.name}>{acc.name}</option>)}
                        <option value="Cash/Other">Cash / Other</option>
                    </select>
                  </div>
                </div>

                {/* --- Recurring Option (Repeat Monthly) --- */}
                <div className="flex items-center gap-4 p-5 bg-emerald-50 dark:bg-emerald-950/20 rounded-3xl border-2 border-emerald-100 dark:border-emerald-900/50 transition-all hover:border-emerald-300">
                    <input 
                        type="checkbox" 
                        id="edit-recurring" 
                        checked={isRecurring} 
                        onChange={e => setIsRecurring(e.target.checked)} 
                        className="w-6 h-6 accent-emerald-600 cursor-pointer shadow-md" 
                    />
                    <label htmlFor="edit-recurring" className="text-xs font-black text-emerald-800 dark:text-emerald-400 cursor-pointer uppercase tracking-tighter italic leading-tight">
                        Repeat this entry monthly until Dec {new Date(editItem.tempDate).getFullYear()}?
                    </label>
                </div>

                <button 
                type="submit" 
                disabled={isSaving} // သိမ်းနေတုန်းမှာ ခလုတ်ကို နှိပ်လို့မရအောင် ပိတ်ထားမယ်
                className="w-full bg-slate-900 text-white p-6 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-600 transition-all active:scale-95">
                  {isSaving ? "SAVING..." : "APPLY CHANGES & SAVE"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}