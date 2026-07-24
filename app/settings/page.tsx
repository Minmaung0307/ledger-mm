"use client";
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Loader2, Moon, Sun, Type, ShieldCheck } from 'lucide-react';
import { useAppSettings } from '@/lib/SettingsContext';

export default function Settings() {
  const { setTheme: updateTheme, setFontSize: updateFontSize } = useAppSettings();
  
  // Business Info States (Manual Save)
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [preparerName, setPreparerName] = useState('');
  const [ptin, setPtin] = useState('');
  const [accountantEmail, setAccountantEmail] = useState('');

  // Appearance States (Auto-mapped to Context)
  const [theme, setTheme] = useState('light');
  const [fontSize, setFontSize] = useState('medium');

  const [isSavingBusiness, setIsSavingBusiness] = useState(false);
  const [loading, setLoading] = useState(true);

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
          setAccountantEmail(data.accountantEmail || '');
          setTheme(data.theme || 'light');
          setFontSize(data.fontSize || 'medium');
        }
        setLoading(false);
      }
    });
  }, []);

  // --- ၁။ Appearance အတွက် Auto-Save Logic ---
  const handleAppearanceChange = async (key: 'theme' | 'fontSize', value: string) => {
    if (!auth.currentUser) return;
    
    // UI Local State ကို အရင်ချိန်းမယ်
    if (key === 'theme') {
        setTheme(value);
        updateTheme(value); // Context ကို update လုပ်မယ် (UI အရောင် ချက်ချင်းပြောင်းရန်)
    } else {
        setFontSize(value);
        updateFontSize(value); // Context ကို update လုပ်မယ် (စာလုံးဆိုဒ် ချက်ချင်းပြောင်းရန်)
    }

    try {
      // Database မှာ သွားသိမ်းမယ်
      const docRef = doc(db, "profiles", auth.currentUser.uid);
      await updateDoc(docRef, { [key]: value });
    } catch (err) {
      console.error("Auto-save failed", err);
    }
  };

  // --- ၂။ Business Info အတွက် Manual Save Logic ---
  const handleSaveBusinessInfo = async () => {
    if (!auth.currentUser) return;
    setIsSavingBusiness(true);
    try {
      await setDoc(doc(db, "profiles", auth.currentUser.uid), {
        businessName,
        address,
        preparerName,
        ptin,
        accountantEmail: accountantEmail.toLowerCase().trim(),
        uid: auth.currentUser.uid
      }, { merge: true });
      alert("Business settings saved successfully!");
    } catch (err) {
      alert("Error saving information");
    } finally {
      setIsSavingBusiness(false);
    }
  };

  if (loading) return <Layout><p className="p-20 text-center font-black animate-pulse uppercase">Loading Profile...</p></Layout>;

  return (
    <Layout>
      <div className="pt-6 max-w-2xl mx-auto px-4 pb-40 text-scale-medium">
        <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-10 tracking-tighter uppercase italic">System Settings</h2>

        <div className="space-y-8">
          {/* ၁။ Appearance (Auto-save) */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-700">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2 italic">
              <Sun size={14}/> 1. Appearance (Auto-save)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => handleAppearanceChange('theme', 'light')} 
                className={`p-6 rounded-3xl border-2 flex flex-col items-center gap-3 transition-all active:scale-95 ${theme === 'light' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' : 'border-slate-50 dark:border-slate-700 text-slate-400 opacity-60'}`}
              >
                <Sun size={32} /> <span className="font-black text-[10px] uppercase">Light Mode</span>
              </button>
              <button 
                onClick={() => handleAppearanceChange('theme', 'dark')} 
                className={`p-6 rounded-3xl border-2 flex flex-col items-center gap-3 transition-all active:scale-95 ${theme === 'dark' ? 'border-emerald-500 bg-slate-900 text-white' : 'border-slate-50 dark:border-slate-700 text-slate-400 opacity-60'}`}
              >
                <Moon size={32} /> <span className="font-black text-[10px] uppercase">Dark Mode</span>
              </button>
            </div>
          </div>

          {/* ၂။ Font Scaling (Auto-save) */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-700">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2 italic">
              <Type size={14}/> 2. Font Scaling (Auto-save)
            </h3>
            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-2 rounded-2xl border border-slate-100 dark:border-slate-700">
              {['small', 'medium', 'large'].map((size) => (
                <button 
                    key={size} 
                    onClick={() => handleAppearanceChange('fontSize', size)} 
                    className={`flex-1 py-4 rounded-xl font-black text-[10px] uppercase transition-all active:scale-95 ${fontSize === size ? 'bg-white dark:bg-slate-700 shadow-md text-emerald-600 scale-105' : 'text-slate-400'}`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        
          {/* ၃။ Business Information (Manual Save) */}
          <div className="bg-white dark:bg-slate-800 p-8 md:p-10 rounded-[3rem] shadow-2xl border border-slate-50 dark:border-slate-700 space-y-8">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2 italic">3. Business Information</h3>
            
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-2">Company Name</label>
              <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="w-full p-5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-3xl font-black text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-all text-lg" placeholder="Your Business Name" />
            </div>

            <div>
              <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-3 ml-2 flex items-center gap-2">
                <ShieldCheck size={14}/> Accountant Email (Read-Only)
              </label>
              <input type="email" value={accountantEmail} onChange={e => setAccountantEmail(e.target.value)} className="w-full p-5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-3xl font-black text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-all text-lg" placeholder="accountant@email.com" />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-2">Business Address</label>
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} className="w-full p-5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-3xl font-bold text-slate-900 dark:text-white focus:border-emerald-500 outline-none h-32 text-lg" placeholder="Street, City, State, Zip" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-700">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-2">Tax Preparer Name</label>
                <input type="text" value={preparerName} onChange={(e) => setPreparerName(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white focus:border-emerald-500 outline-none" placeholder="Full Name" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-2">PTIN / EIN</label>
                <input type="text" value={ptin} onChange={(e) => setPtin(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white focus:border-emerald-500 outline-none" placeholder="Tax ID" />
              </div>
            </div>

            <button 
              onClick={handleSaveBusinessInfo} 
              disabled={isSavingBusiness} 
              className="w-full bg-slate-900 dark:bg-emerald-600 text-white p-6 rounded-[2rem] font-black uppercase tracking-widest shadow-xl hover:bg-emerald-600 dark:hover:bg-slate-900 transition-all active:scale-95 disabled:bg-slate-200"
            >
              {isSavingBusiness ? <Loader2 className="animate-spin mx-auto" /> : "Save Business Information"}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}