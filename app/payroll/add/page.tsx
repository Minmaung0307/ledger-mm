// app/payroll/add/page.tsx
"use client";
import { useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useRouter } from 'next/navigation';
import { Camera, UserPlus, Loader2, Users, Briefcase } from 'lucide-react';

export default function AddPersonnel() {
  // --- New State: လူအမျိုးအစား ရွေးရန် ---
  const [personnelType, setPersonnelType] = useState<'contractors' | 'employees'>('contractors');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [taxId, setTaxId] = useState(''); 
  const [salary, setSalary] = useState(''); 
  const [position, setPosition] = useState(''); // ရာထူး
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [joinDate, setJoinDate] = useState(new Date().toISOString().split('T')[0]);
  const [internalNotes, setInternalNotes] = useState('');
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(f);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || isSaving) return;
    setIsSaving(true);

    try {
      let photoUrl = "";
      if (file) {
        const storageRef = ref(storage, `personnel/${auth.currentUser.uid}/${Date.now()}.jpg`);
        await uploadBytes(storageRef, file);
        photoUrl = await getDownloadURL(storageRef);
      }

      // စုစည်းထားသော Data အား personnelType (contractors သို့မဟုတ် employees) ဆီသို့ ပို့မည်
      await addDoc(collection(db, personnelType), {
        name, email, phone, address, taxId, position,
        salary: parseFloat(salary) || 0,
        photoUrl,
        uid: auth.currentUser.uid,
        status: 'active',
        createdAt: serverTimestamp(),
        joinDate: new Date(joinDate),
        internalNotes: internalNotes,
      });
      
      // အမျိုးအစားအလိုက် သက်ဆိုင်ရာ စာမျက်နှာသို့ ပြန်ပို့မည်
      router.push(personnelType === 'employees' ? '/payroll/employees' : '/payroll');
      router.refresh();
    } catch (err) {
      alert("Error saving personnel data");
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto pt-6 px-4 pb-40">
        <h2 className="text-3xl font-black mb-10 text-slate-900 dark:text-white tracking-tighter uppercase italic text-center md:text-left">
            Register New {personnelType === 'employees' ? 'Employee (W-2)' : 'Contractor (1099)'}
        </h2>
        
        {/* --- အမျိုးအစား ရွေးချယ်မှု (Toggle) --- */}
        <div className="grid grid-cols-2 gap-4 mb-10 no-print">
            <button 
                type="button"
                onClick={() => setPersonnelType('contractors')}
                className={`p-5 rounded-[2rem] border-2 flex items-center justify-center gap-3 font-black text-xs transition-all ${personnelType === 'contractors' ? 'bg-slate-900 text-white border-slate-900 shadow-xl scale-105' : 'bg-white text-slate-400 border-slate-100'}`}
            >
                <Briefcase size={18}/> 1099 CONTRACTOR
            </button>
            <button 
                type="button"
                onClick={() => setPersonnelType('employees')}
                className={`p-5 rounded-[2rem] border-2 flex items-center justify-center gap-3 font-black text-xs transition-all ${personnelType === 'employees' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xl scale-105' : 'bg-white text-slate-400 border-slate-100'}`}
            >
                <Users size={18}/> W-2 EMPLOYEE
            </button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
          {/* Photo Column */}
          <div className="lg:col-span-1 space-y-4">
            <label className="relative h-72 border-4 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] bg-white dark:bg-slate-900 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 transition-all overflow-hidden group shadow-sm">
                {preview ? <img src={preview} className="absolute inset-0 w-full h-full object-cover" alt="p" /> : (
                  <div className="text-center text-slate-300 font-black"><Camera className="mx-auto mb-2" size={40} /> <p className="text-[10px] tracking-widest uppercase">ID PHOTO / FACE</p></div>
                )}
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
            <p className="text-[10px] text-center font-bold text-slate-400 uppercase italic">Digital Documentation for IRS Audit</p>
          </div>

          {/* Form Fields Column */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-8 md:p-10 rounded-[3rem] shadow-2xl border-2 border-slate-50 dark:border-slate-700 space-y-6">
            <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-2">Full Legal Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-all" required />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-2">Email Address</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@address.com" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white outline-none" />
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-2">Phone Number</label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white outline-none" />
                </div>
            </div>

            <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-2">Home Address</label>
                <textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="Street, City, State, Zip" className="w-full h-24 p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white outline-none" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-2">Job Position</label>
                    <input type="text" value={position} onChange={e => setPosition(e.target.value)} placeholder="Manager" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white outline-none" />
                </div>
                <div className="md:col-span-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-2">SSN / EIN</label>
                    <input type="text" value={taxId} onChange={e => setTaxId(e.target.value)} placeholder="Tax ID" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black tracking-[0.2em] text-slate-900 dark:text-white outline-none" />
                </div>
                <div className="md:col-span-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-2">Starting Salary ($)</label>
                    <input type="number" value={salary} onChange={e => setSalary(e.target.value)} placeholder="0.00" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-slate-900 dark:text-white outline-none" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-2 italic">Joining Date (အလုပ်ဝင်ရက်)</label>
                    <input type="date" value={joinDate} onChange={e => setJoinDate(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-slate-900 dark:text-white" />
                </div>
            </div>

            <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-2">Internal Performance Notes (မှတ်ချက်များ)</label>
                <textarea 
                    value={internalNotes} 
                    onChange={e => setInternalNotes(e.target.value)} 
                    placeholder="ဥပမာ- အလုပ်ကြိုးစားတယ်၊ ယုံကြည်စိတ်ချရတယ် စသည်..." 
                    className="w-full h-28 p-5 bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-100 dark:border-amber-900/30 rounded-3xl font-medium text-slate-700 dark:text-slate-300 italic outline-none focus:border-amber-400 transition-all" 
                />
            </div>

            <button type="submit" disabled={isSaving} className="w-full bg-slate-900 text-white p-6 rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-emerald-600 transition-all active:scale-95 disabled:bg-slate-200">
                {isSaving ? <Loader2 className="animate-spin mx-auto" /> : "COMPLETE REGISTRATION"}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}