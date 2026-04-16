// app/links/page.tsx
"use client";
import Layout from '@/components/Layout';
import { ExternalLink, Landmark, ShieldCheck, Truck, Globe, Search } from 'lucide-react';

export default function QuickLinks() {
  const linkGroups = [
    {
      category: "Government & Tax (အစိုးရနှင့် အခွန်)",
      links: [
        { name: "IRS Free File", url: "https://www.irs.gov/filing/free-file-do-your-federal-taxes-for-free", desc: "အခမဲ့ အခွန်ဆောင်ရန် Software များ" },
        { name: "IRS Pay Online", url: "https://www.irs.gov/payments", desc: "အခွန်ငွေများကို အွန်လိုင်းမှ တိုက်ရိုက်ပေးဆောင်ရန်" },
        { name: "Secretary of State", url: "https://www.sos.ca.gov/", desc: "လုပ်ငန်းလိုင်စင် (LLC) သက်တမ်းတိုးရန် (State အလိုက် ပြောင်းလဲနိုင်သည်)" },
        { name: "SBA Business Guide", url: "https://www.sba.gov/business-guide", desc: "US အစိုးရ၏ လုပ်ငန်းရှင်များအတွက် လမ်းညွှန်" },
      ]
    },
    {
      category: "Banking & Finance (ဘဏ်နှင့် ငွေကြေး)",
      links: [
        { name: "Bank of America", url: "https://www.bankofamerica.com/", desc: "BofA Business Login" },
        { name: "Chase Business", url: "https://www.chase.com/business", desc: "Chase Business Online Banking" },
        { name: "Wells Fargo", url: "https://www.wellsfargo.com/biz/", desc: "Wells Fargo Business Login" },
        { name: "American Express", url: "https://www.americanexpress.com/", desc: "Business Credit Card စီမံရန်" },
      ]
    },
    {
      category: "Business Tools (လုပ်ငန်းသုံး ကိရိယာများ)",
      links: [
        { name: "USPS Click-N-Ship", url: "https://www.usps.com/ship/", desc: "ပစ္စည်းပို့ရန် Label ထုတ်ခြင်းနှင့် ဈေးနှုန်းစစ်ခြင်း" },
        { name: "Google Business Profile", url: "https://www.google.com/business/", desc: "Google Map ပေါ်တွင် သင့်ဆိုင်အချက်အလက် ပြင်ဆင်ရန်" },
        { name: "Yelp for Business", url: "https://biz.yelp.com/", desc: "Customer Review များ စီမံရန်" },
      ]
    }
  ];

  return (
    <Layout>
      <div className="pt-6 pb-40 px-4 max-w-5xl mx-auto">
        <div className="mb-12">
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Quick Links</h2>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Essential US Business Resources</p>
        </div>

        <div className="space-y-12">
          {linkGroups.map((group) => (
            <div key={group.category}>
              <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mb-6 px-4 italic border-l-4 border-emerald-500">{group.category}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.links.map((link) => (
                  <a 
                    key={link.name} 
                    href={link.url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="bg-white p-6 rounded-[2rem] border-2 border-slate-50 shadow-lg hover:border-emerald-500 hover:shadow-emerald-100 transition-all group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                            {group.category.includes("Gov") ? <ShieldCheck size={20}/> : group.category.includes("Bank") ? <Landmark size={20}/> : <Globe size={20}/>}
                        </div>
                        <div>
                            <p className="font-black text-slate-900 text-lg group-hover:text-emerald-600 transition-colors">{link.name}</p>
                            <p className="text-xs font-bold text-slate-400 mt-0.5">{link.desc}</p>
                        </div>
                    </div>
                    <ExternalLink size={18} className="text-slate-200 group-hover:text-emerald-500 transition-colors" />
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Custom Link Tip */}
        <div className="mt-20 p-10 bg-slate-900 rounded-[3rem] text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full -mr-10 -mt-10 blur-3xl"></div>
            <h4 className="text-xl font-black mb-2 uppercase tracking-tight italic">Pro Tip for US Owners</h4>
            <p className="text-slate-400 font-bold leading-relaxed text-sm">
                အခွန်ဆောင်တဲ့အခါဖြစ်ဖြစ်၊ လုပ်ငန်းလိုင်စင်ကိစ္စတွေမှာဖြစ်ဖြစ် အမြဲတမ်း <span className="text-emerald-400">.gov</span> နဲ့ ဆုံးတဲ့ website တွေကိုပဲ သုံးပါ။ တခြား website တွေက သင့်ဆီက ဝန်ဆောင်ခ ပိုတောင်းနိုင်လို့ သတိထားပါဗျာ။
            </p>
        </div>
      </div>
    </Layout>
  );
}