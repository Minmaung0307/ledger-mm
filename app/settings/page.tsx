// app/settings/page.tsx
"use client";
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function Settings() {
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [preparerName, setPreparerName] = useState('');
  const [ptin, setPtin] = useState(''); // Preparer ID ရှိရင်

  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, "profiles", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setBusinessName(docSnap.data().businessName || '');
          setAddress(docSnap.data().address || '');
        }
      }
    });
  }, []);

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setIsSaving(true);
    await setDoc(doc(db, "profiles", auth.currentUser.uid), {
      businessName,
      address,
      preparerName, // အသစ်
      ptin, // အသစ်
      uid: auth.currentUser.uid
    });
    setIsSaving(false);
    alert("Settings Saved!");
  };

  return (
    <Layout>
      <div className="pt-6 max-w-xl mx-auto">
        <h2 className="text-3xl font-black text-slate-900 mb-8">Business Profile</h2>
        <div className="bg-white p-8 rounded-[2rem] shadow-xl border-2 border-slate-50 space-y-6">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase mb-2">Business Name</label>
            <input 
              type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)}
              className="w-full p-4 border-2 border-slate-100 rounded-2xl focus:border-emerald-500 outline-none font-bold"
              placeholder="e.g. Min Mg Agency"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase mb-2">Business Address</label>
            <textarea 
              value={address} onChange={(e) => setAddress(e.target.value)}
              className="w-full p-4 border-2 border-slate-100 rounded-2xl focus:border-emerald-500 outline-none font-bold h-32"
              placeholder="Street, City, State, Zip"
            />
          </div>
          <button 
            onClick={handleSave} disabled={isSaving}
            className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black hover:bg-slate-800 transition active:scale-95 shadow-lg"
          >
            {isSaving ? "SAVING..." : "SAVE SETTINGS"}
          </button>
        </div>
      </div>
    </Layout>
  );
}