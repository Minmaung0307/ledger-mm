// app/settings/page.tsx ကို အောက်ပါအတိုင်း အကုန်အစားထိုးလိုက်ပါ

"use client";
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Loader2, CheckCircle } from 'lucide-react';

export default function Settings() {
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [preparerName, setPreparerName] = useState('');
  const [ptin, setPtin] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accountantEmail, setAccountantEmail] = useState('');

  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, "profiles", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setBusinessName(data.businessName || '');
          setAddress(data.address || '');
          setPreparerName(data.preparerName || '');
          setPtin(data.ptin || '');
        }
        setLoading(false);
      }
    });
  }, []);

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, "profiles", auth.currentUser.uid), {
        businessName,
        address,
        preparerName,
        ptin,
        uid: auth.currentUser.uid,
        accountantEmail: accountantEmail.toLowerCase().trim()
      });
      alert("Settings successfully saved!");
    } catch (err) {
      alert("Error saving settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <Layout><p className="p-20 text-center font-black animate-pulse uppercase">Loading Profile...</p></Layout>;

  return (
    <Layout>
      <div className="pt-6 max-w-xl mx-auto px-4 pb-20">
        <h2 className="text-4xl font-black text-slate-900 mb-10 tracking-tighter">Business Profile</h2>
        
        <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl border-2 border-slate-50 space-y-8">
          {/* Business Name */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-2">Business Name</label>
            <input 
              type="text" 
              value={businessName} 
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-900 focus:border-emerald-500 focus:bg-white outline-none transition-all text-lg"
              placeholder="Your Business Name"
            />
            <input 
              type="email" value={accountantEmail} onChange={e => setAccountantEmail(e.target.value)}
              placeholder="accountant@email.com" 
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" 
            />
          </div>

          {/* Business Address */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-2">Business Address</label>
            <textarea 
              value={address} 
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 focus:border-emerald-500 focus:bg-white outline-none transition-all h-32 text-lg"
              placeholder="Street, City, State, Zip"
            />
          </div>

          {/* Preparer Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-2">Preparer Name</label>
              <input 
                type="text" 
                value={preparerName} 
                onChange={(e) => setPreparerName(e.target.value)}
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 focus:border-emerald-500 outline-none"
                placeholder="Full Name"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-2">PTIN / EIN</label>
              <input 
                type="text" 
                value={ptin} 
                onChange={(e) => setPtin(e.target.value)}
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 focus:border-emerald-500 outline-none"
                placeholder="Tax ID"
              />
            </div>
          </div>

          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="w-full bg-slate-900 text-white p-6 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-600 transition-all active:scale-95 shadow-xl disabled:bg-slate-200"
          >
            {isSaving ? <Loader2 className="animate-spin mx-auto" /> : "SAVE SETTINGS"}
          </button>
        </div>
      </div>
    </Layout>
  );
}