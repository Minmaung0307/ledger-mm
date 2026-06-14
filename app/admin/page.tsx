// app/admin/page.tsx
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { ShieldAlert, UserX, UserCheck, Mail, Activity } from 'lucide-react';

export default function AdminPanel() {
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // လူကြီးမင်း၏ Gmail အမှန်ကို ဒီမှာ သေချာစစ်ပြီး ထည့်ပါ
  const adminEmail = "minmaung0307@gmail.com"; 

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user && user.email === adminEmail) {
        const unsubscribeUsers = onSnapshot(collection(db, "users"), (snap) => {
          setAllUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setLoading(false);
        });
        return () => unsubscribeUsers();
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const toggleUserStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
    if (confirm(`Are you sure you want to ${newStatus.toUpperCase()} this user?`)) {
        await updateDoc(doc(db, "users", userId), { status: newStatus });
    }
  };

  if (loading) return <Layout><p className="p-20 text-center font-black animate-pulse">Checking Security...</p></Layout>;

  return (
    <Layout>
      <div className="pt-6 pb-40 px-4 max-w-5xl mx-auto">
        <header className="mb-12">
            <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">User Control Center</h2>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2 flex items-center gap-2">
                <Activity size={14} className="text-emerald-500" /> App Security & Access Management
            </p>
        </header>

        <div className="grid grid-cols-1 gap-6">
          {allUsers.map(u => {
            const isMe = u.email === adminEmail;
            return (
              <div key={u.id} className={`bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border-2 flex flex-col md:flex-row justify-between items-center gap-6 transition-all ${u.status === 'blocked' ? 'border-rose-200 grayscale opacity-60' : 'border-slate-50 shadow-xl'}`}>
                
                {/* User Info */}
                <div className="flex items-center gap-5 flex-1 overflow-hidden w-full">
                  <img src={u.photo} className="w-16 h-16 rounded-2xl border-2 border-slate-100 dark:border-slate-700 shadow-md object-cover" alt="p" />
                  <div className="overflow-hidden">
                      <p className="font-black text-slate-900 dark:text-white text-xl truncate">
                        {u.name} {isMe && <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded ml-2 uppercase italic">Admin</span>}
                      </p>
                      <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mt-1 truncate"><Mail size={12}/> {u.email}</p>
                  </div>
                </div>

                {/* Actions Section */}
                <div className="flex items-center gap-4 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-slate-50 dark:border-slate-700 justify-between md:justify-end">
                  <span className={`px-5 py-2 rounded-full font-black text-[10px] uppercase tracking-widest ${u.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                      {u.status}
                  </span>
                  
                  {/* ကိုယ့်ကိုယ်ကို Block လို့မရအောင် တားထားပြီး၊ တခြားသူဆိုရင် ခလုတ်ပြမယ် */}
                  {!isMe && (
                      <button 
                          onClick={() => toggleUserStatus(u.id, u.status)}
                          className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg ${u.status === 'active' ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                      >
                          {u.status === 'active' ? <><UserX size={18}/> Block</> : <><UserCheck size={18}/> Unblock</>}
                      </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}