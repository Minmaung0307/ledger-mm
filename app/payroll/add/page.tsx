// app/payroll/add/page.tsx
"use client";
import { useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useRouter } from 'next/navigation';
import { Camera, UserPlus, Loader2 } from 'lucide-react';

export default function AddContractor() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [taxId, setTaxId] = useState(''); // SSN/EIN
  const [salary, setSalary] = useState(''); // Starting Salary
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
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

      await addDoc(collection(db, "contractors"), {
        name, email, phone, address, taxId, 
        salary: parseFloat(salary) || 0,
        photoUrl,
        uid: auth.currentUser.uid,
        status: 'active',
        createdAt: serverTimestamp()
      });
      
      router.push('/payroll');
      router.refresh();
    } catch (err) {
      alert("Error saving personnel data");
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto pt-6 px-4 pb-40">
        <h2 className="text-3xl font-black mb-8 text-slate-900 dark:text-white tracking-tighter uppercase italic">Add Personnel (Contractor)</h2>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Photo Upload */}
          <div className="lg:col-span-1">
            <label className="relative h-64 border-4 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] bg-white dark:bg-slate-900 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 transition-all overflow-hidden group shadow-sm">
                {preview ? <img src={preview} className="absolute inset-0 w-full h-full object-cover" alt="p" /> : (
                  <div className="text-center text-slate-400 font-black"><Camera className="mx-auto mb-2" size={40} /> <p className="text-[10px]">PHOTO / ID CARD</p></div>
                )}
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
          </div>

          {/* Form Fields */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-2xl border border-slate-50 dark:border-slate-700 space-y-6">
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full Legal Name" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-slate-900 dark:text-white outline-none focus:border-emerald-500" required />
            
            <div className="grid grid-cols-2 gap-4">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email Address" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white outline-none" />
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone Number" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white outline-none" />
            </div>

            <textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="Full Mailing Address" className="w-full h-24 p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white outline-none" />

            <div className="grid grid-cols-2 gap-4">
                <input type="text" value={taxId} onChange={e => setTaxId(e.target.value)} placeholder="SSN / EIN (Tax ID)" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black tracking-widest text-slate-900 dark:text-white outline-none" />
                <input type="number" value={salary} onChange={e => setSalary(e.target.value)} placeholder="Monthly Salary ($)" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-slate-900 dark:text-white outline-none" />
            </div>

            <button type="submit" disabled={isSaving} className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-600 transition shadow-xl active:scale-95 disabled:bg-slate-200">
                {isSaving ? <Loader2 className="animate-spin mx-auto" /> : "REGISTER & SAVE PROFILE"}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}