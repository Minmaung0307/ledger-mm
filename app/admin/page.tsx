// app/admin/page.tsx
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { ShieldAlert, UserX, UserCheck, Mail } from 'lucide-react';

export default function AdminPanel() {
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const adminEmail = "minmaung0307@gmail.com"; // ဥပမာ - "minmaung0307@gmail.com"

  useEffect(() => {
    // Admin ဖြစ်မှသာ အသုံးပြုသူစာရင်းကို ပြမယ်
    if (auth.currentUser?.email !== adminEmail) return;

    const unsubscribe = onSnapshot(collection(db, "users"), (snap) => {
      setAllUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const toggleUserStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
    if (confirm(`Change user status to ${newStatus}?`)) {
        await updateDoc(doc(db, "users", userId), { status: newStatus });
    }
  };

  if (auth.currentUser?.email !== adminEmail) {
    return <Layout><p className="p-20 text-center font-black text-rose-500">ACCESS DENIED: ADMIN ONLY</p></Layout>;
  }

  return (
    <Layout>
      <div className="pt-6 pb-20 px-4 max-w-5xl mx-auto">
        <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tighter uppercase italic">User Control Center</h2>
        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-10">Manage App Access & Permissions</p>

        <div className="grid grid-cols-1 gap-4">
          {allUsers.map(u => (
            <div key={u.id} className={`bg-white p-6 rounded-[2.5rem] border-2 flex flex-col md:flex-row justify-between items-center gap-4 transition-all ${u.status === 'blocked' ? 'border-rose-200 opacity-60' : 'border-slate-50 shadow-lg'}`}>
              <div className="flex items-center gap-4">
                <img src={u.photo} className="w-14 h-14 rounded-2xl border-2 border-slate-100" alt="p" />
                <div>
                    <p className="font-black text-slate-900 text-lg">{u.name}</p>
                    <p className="text-xs font-bold text-slate-400 flex items-center gap-1"><Mail size={12}/> {u.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className={`px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest ${u.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    {u.status}
                </span>
                {u.email !== adminEmail && (
                    <button 
                        onClick={() => toggleUserStatus(u.id, u.status)}
                        className={`p-4 rounded-2xl transition-all active:scale-95 ${u.status === 'active' ? 'bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white' : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-500 hover:text-white'}`}
                    >
                        {u.status === 'active' ? <UserX size={20}/> : <UserCheck size={20}/>}
                    </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}