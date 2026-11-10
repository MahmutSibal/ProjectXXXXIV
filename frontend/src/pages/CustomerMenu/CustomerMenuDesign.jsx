import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { createDemoRefund, refundMethods } from '../../api/demoRefunds.js';

const itemNames = ['Trüflü Gurme Burger', 'Smoked Texas BBQ Burger', 'Avokado Cheddar Burger'];
const categoryNames = ['Burgerler', 'Başlangıçlar', 'Pizzalar', 'Tatlılar', 'İçecekler'];
const prices = [345, 380, 65];
const extraPrices = [35, 45, 20];
const tl = (amount) => amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });

export default function CustomerMenuDesign() {
  const { restaurantId, tableNo: table = '12' } = useParams();
  const [screen, setScreen] = useState('menu');
  const [notice, setNotice] = useState('');
  const [accountOpen, setAccountOpen] = useState(false);
  const [category, setCategory] = useState(0);
  const [query, setQuery] = useState('');
  const [lines, setLines] = useState([0, 0, 0]);
  const [unitPrices, setUnitPrices] = useState(prices);
  const [item, setItem] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [extra, setExtra] = useState(0);
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [order, setOrder] = useState(null);
  const [history, setHistory] = useState(false);
  const [member, setMember] = useState(null);
  const count = lines.reduce((sum, value) => sum + value, 0);
  const total = lines.reduce((sum, value, index) => sum + value * unitPrices[index], 0);
  const baseTotal = lines.reduce((sum, value, index) => sum + value * prices[index], 0);
  const matches = (index) => itemNames[index].toLocaleLowerCase('tr-TR').includes(query.trim().toLocaleLowerCase('tr-TR'));

  function go(next) {
    setNotice('');
    setAccountOpen(false);
    setScreen(next);
  }

  function click(event) {
    const control = event.target.closest('[data-action]');
    if (!control) return;
    event.preventDefault();
    const [action, index, delta] = control.dataset.action.split(':');
    const row = Number(index);
    const form = control.closest('form');
    if (action === 'account') {
      if (screen === 'menu') setAccountOpen(!accountOpen);
      else go('menu');
    } else if (action === 'category') setCategory(row);
    else if (action === 'star') { setRating(row); setNotice(row + '/5 yıldız seçildi.'); }
    else if (action === 'qty') setLines(lines.map((value, i) => i === row ? Math.max(0, value + Number(delta)) : value));
    else if (action === 'draft') setQuantity(Math.max(1, quantity + row));
    else if (action === 'product' || action === 'edit') {
      setItem(row);
      setQuantity(action === 'edit' ? lines[row] : 1);
      setExtra(0);
      setEditing(action === 'edit');
      go('product');
    } else if (action === 'back') go(editing ? 'cart' : 'menu');
    else if (action === 'add') {
      const panel = control.closest('[data-screen]');
      if (!panel.querySelector('input[type=radio]:checked')) {
        setNotice('Pişirme derecesini seçin.');
        return;
      }
      setLines(lines.map((value, i) => i === item ? (editing ? quantity : value + quantity) : value));
      setUnitPrices(unitPrices.map((value, i) => i === item ? prices[i] + extra : value));
      go(editing ? 'cart' : 'menu');
    } else if (action === 'clear') setLines([0, 0, 0]);
    else if (action === 'confirm') {
      if (!count) { setNotice('Sepetiniz boş.'); return; }
      setOrder({ lines, unitPrices, total });
      setLines([0, 0, 0]);
      go('tracking');
    } else if (action === 'active' || action === 'history') setHistory(action === 'history');
    else if (action === 'repeat') {
      if (order) { setLines(order.lines); setUnitPrices(order.unitPrices); go('cart'); }
    } else if (action === 'registerSubmit' || action === 'loginSubmit') {
      if (!form.reportValidity()) return;
      const inputs = form.querySelectorAll('input');
      if (action === 'registerSubmit') {
        setMember({ email: inputs[2].value, phone: inputs[1].value, password: inputs[5].value });
        go('login');
        setNotice('Demo hesap oluşturuldu.');
      } else if (member && [member.email, member.phone].includes(inputs[0].value) && member.password === inputs[1].value) {
        go('menu');
        setNotice('Demo oturumu açıldı.');
      } else setNotice('Demo hesap bilgileri eşleşmedi.');
    } else if (action === 'feedback') {
      if (!form.reportValidity() || !form.querySelector('textarea').value.trim()) {
        setNotice('Açıklama alanını doldurun.');
        return;
      }
      if (screen === 'review' && !rating) { setNotice('Bir yıldız puanı seçin.'); return; }
            if (screen === 'support') {
        const fields = new FormData(form);

        if (fields.get('requestType') === 'refund') {
          const method = fields.get('refund');

          if (!method) {
            setNotice('Lütfen Nakit, Kart veya IBAN seçeneklerinden birini seçin.');
            return;
          }

          try {
            createDemoRefund({
              restaurantId,
              tableNo: table,
              content: form.querySelector('textarea').value,
              method,
            });
          } catch {
            setNotice('İade talebi kaydedilemedi. Lütfen tekrar deneyin.');
            return;
          }

          form.reset();
          setNotice('İade talebiniz demo mutfak ekranına iletildi.');
          return;
        }
      }

      form.reset();
      setRating(0);
      setNotice('Demo formu tamamlandı.');
    } else if (action === 'call') setNotice('Garson çağrısı demo olarak gösterildi.');
    else go(action);
  }

  function change(event) {
    const input = event.target;
    if (input.hasAttribute('data-search')) setQuery(input.value);
    if (input.hasAttribute('data-extra')) {
      const price = extraPrices[Number(input.dataset.extra)];
      setExtra(extra + (input.checked ? price : -price));
    }
  }

const views = {
menu: () => (<div className={"h-full min-h-0 w-full bg-[#F8F9FA] overflow-hidden relative flex flex-col "}><div className={"bg-[#1A1A1A] text-white px-4 py-3 shrink-0 border-b border-neutral-800 z-10 shadow-md"}><div className={"flex items-center justify-between"}><div className={"flex items-center gap-2.5"}><div className={"w-10 h-10 rounded-xl bg-[#002819] border border-[#D4AF37]/60 p-0.5 overflow-hidden shadow"}><img
  alt="Restoran Logo"
  className="w-full h-full object-cover rounded-lg"
  src="/sukranapp.png"
/></div><div><div className={"flex items-center gap-1.5"}><h2 className={"font-['Montserrat',sans-serif] font-bold text-sm tracking-tight text-white leading-tight"}>{"Şükran Restaurant"}</h2><span className={"inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-[#06402B] text-emerald-300 border border-emerald-600/30"}><span className={"w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse"}></span>{"Açık "}</span></div><div className={"flex items-center gap-2 text-xs text-neutral-400 mt-0.5"}><span className={"font-semibold text-[#FED65B] flex items-center gap-0.5"}><span className={"material-symbols-outlined text-xs text-[#D4AF37]"}>{"table_restaurant"}</span>{" Masa " + table + " "}</span><span>{"•"}</span><span>{"Dijital Menü"}</span></div></div></div><div className={"relative group"}><button className={"relative w-10 h-10 rounded-xl bg-neutral-900 border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37] active:scale-95 transition-transform"} data-action={"account"} type={"button"}><span className={"material-symbols-outlined text-xl"}>{"account_circle"}</span><span className={"absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-black ring-1 ring-emerald-400 animate-pulse"}></span></button></div></div></div><div className={"flex-1 overflow-y-auto hide-scrollbar pb-24"}><div className={"p-3 bg-white border-b border-[#DFE4E0]/60"}><div className={"relative"}><span className={"material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#59635D] text-lg"}>{"search"}</span><input className={"w-full pl-9 pr-4 py-2 bg-[#F8F9FA] text-xs rounded-xl border border-[#DFE4E0] text-[#191C1D] placeholder:text-[#59635D]/70 focus:outline-none focus:border-[#D4AF37]"} placeholder={"Menüde lezzet ara (Burger, İçecek, vb.)..."} type={"text"} data-search={""} /></div></div><div className={"py-3 px-3 bg-white border-b border-[#DFE4E0]/40"}><div className={"flex items-center justify-between mb-2"}><span className={"text-[11px] font-bold uppercase tracking-wider text-[#59635D] font-['Montserrat',sans-serif]"}>{"Kategoriler"}</span><span className={"text-[11px] text-[#D4AF37] font-medium"}>{"9 Kategori"}</span></div><div className={"flex gap-2.5 overflow-x-auto hide-scrollbar pb-1"}><div className={"shrink-0 flex flex-col items-center w-[74px] cursor-pointer group"} data-action={"category:0"} role={"button"} tabIndex={"0"}><div className={"w-14 h-14 rounded-2xl p-0.5 border-2 border-[#D4AF37] bg-[#1A1A1A] shadow-sm flex items-center justify-center overflow-hidden relative"}><img alt={"Burgerler"} className={"w-full h-full object-cover rounded-xl"} src={"https://lh3.googleusercontent.com/aida-public/AB6AXuDrsL2hCVJXy1nk4thdI102qB4i6YYQ_x5OyjPWfa80DMygB9xk01q3c2C8aIlI915CZo2pHML_l32l0iQ-bN--ylTzdgJSJN7fo_gJiER3KOjxFOSIYKnvuGmEs76CO0ozFg-f9M8Dv1XrKvcQaV-Q2k0eFaJpi4h4TDmC45MQlg9ww3ZVV92zQXBcWtKasHC4QI0GbF2mUVxs-pJWHgZW8D3gNrYPYtmL07adBZQ"} /><div className={"absolute inset-0 bg-[#D4AF37]/10"}></div></div><span className={"text-[11px] font-bold text-[#1A1A1A] mt-1 text-center font-['Montserrat',sans-serif] leading-tight"}>{"Burgerler"}</span><span className={"w-4 h-0.5 bg-[#D4AF37] rounded-full mt-0.5"}></span></div><div className={"shrink-0 flex flex-col items-center w-[74px] cursor-pointer opacity-70 hover:opacity-100 transition-opacity"} data-action={"category:1"} role={"button"} tabIndex={"0"}><div className={"w-14 h-14 rounded-2xl border border-[#DFE4E0] bg-white shadow-sm flex items-center justify-center overflow-hidden"}><img alt={"Başlangıçlar"} className={"w-full h-full object-cover rounded-xl"} src={"https://lh3.googleusercontent.com/aida-public/AB6AXuACbcfowz_yshIHe1UTpp-Z0a1GUbQi1ddaUvzNwEo9bPZ2UGL4F6r67U52JsciLjhkQxXSZTeM0V8adPw5AzWNs2Fx-Q7k1APzHR69is5JmgAzD-hFXmJbEcuy3k5Rg7fAMwvj7Tw3St8MJyylb_3b1JMPSykEu0-9UqZTc6gPc-5gfv9C817HxUjw6pYkg5L468c0pWi0Ej1fpYbj3ssEDNQlLyrjO4NfpIZT5f4"} /></div><span className={"text-[11px] font-medium text-[#59635D] mt-1 text-center leading-tight"}>{"Başlangıç"}</span></div><div className={"shrink-0 flex flex-col items-center w-[74px] cursor-pointer opacity-70 hover:opacity-100 transition-opacity"} data-action={"category:2"} role={"button"} tabIndex={"0"}><div className={"w-14 h-14 rounded-2xl border border-[#DFE4E0] bg-white shadow-sm flex items-center justify-center overflow-hidden"}><img alt={"Pizzalar"} className={"w-full h-full object-cover rounded-xl"} src={"https://lh3.googleusercontent.com/aida-public/AB6AXuArNwhhz3akk2nicVxXwJIUMC0I0_ntGUbWbLFOXYiJliurVdgntM7n6nbGMIiKdaCHuyNtYPKD6rcXUvEPBL501hJrDJkuQtcUtYSgvbpEn6KNLg61rfXzlhHZwM2WZV4b_y5YYX5-pTd4AF2-a1-xR4PR4Dm6QHKXa84o6ADO_xTlRINl_wvf_QDqqcnDApOu1ASU0mHrraV1QZbGhsSJpRjl_vP36n69o9NVfJk"} /></div><span className={"text-[11px] font-medium text-[#59635D] mt-1 text-center leading-tight"}>{"Pizzalar"}</span></div><div className={"shrink-0 flex flex-col items-center w-[74px] cursor-pointer opacity-70 hover:opacity-100 transition-opacity"} data-action={"category:3"} role={"button"} tabIndex={"0"}><div className={"w-14 h-14 rounded-2xl border border-[#DFE4E0] bg-white shadow-sm flex items-center justify-center overflow-hidden"}><img alt={"Tatlılar"} className={"w-full h-full object-cover rounded-xl"} src={"https://lh3.googleusercontent.com/aida-public/AB6AXuB0R0SwM4Qv_Ff3e8LhZIZy40w6GLOQYjqWOPRxMDSzl4wI4QjLqdjM-tOYfGY0VWE9Lev7IT8EBDqTrtcq8UMhTlR0jbjugTR_j0hBUt4LCKh0ZlQiHA9A7aCjTLL4oEbJ63xwhGLf-9cLKDwtMIzBgLXtMZaMWWuDsyUybUYgzb_acgaDReQF-NKLZ95BvTDg8r0glAg0mtZUHxGos5Z3PViJnz6OrUydtoAukk4"} /></div><span className={"text-[11px] font-medium text-[#59635D] mt-1 text-center leading-tight"}>{"Tatlılar"}</span></div><div className={"shrink-0 flex flex-col items-center w-[74px] cursor-pointer opacity-70 hover:opacity-100 transition-opacity"} data-action={"category:4"} role={"button"} tabIndex={"0"}><div className={"w-14 h-14 rounded-2xl border border-[#DFE4E0] bg-white shadow-sm flex items-center justify-center overflow-hidden"}><img alt={"İçecekler"} className={"w-full h-full object-cover rounded-xl"} src={"https://lh3.googleusercontent.com/aida-public/AB6AXuBNsvcr8sEfKNLCruTp1qxsaiNRTU1l9VVbDJ8gnvb3LD0qeZ9TyYPXCefbvx6niazU_Eu9c74KG-8FP_7g7lu7bS7kal8KesCr-CJzZchwnNOoCyYv0k-gdknP7-nonfViX5dNluisCG_WWhI2D46OUF1GM1G_G0nL9QQOBQIVQJoByuEDajdZIf2bnySoU2ilvP7KyilG0Jvdjpptgic6ad_7OHOuGzhIn2fc83c"} /></div><span className={"text-[11px] font-medium text-[#59635D] mt-1 text-center leading-tight"}>{"İçecekler"}</span></div></div></div><div className={"px-4 py-3 flex items-center justify-between"}><div><h3 className={"font-['Montserrat',sans-serif] font-bold text-base text-[#191C1D] flex items-center gap-1.5"}>{category === 0 ? 'Gurme Burgerler' : categoryNames[category]}</h3><p className={"text-[11px] text-[#59635D] leading-snug"}>{"%100 yerli besi dana eti ve el yapımı brioche ekmekleri ile."}</p>{category !== 0 && <p className="p-3 text-xs text-[#59635D]">Bu kategoride örnek ürün bulunmuyor.</p>}</div></div><div className={"px-3 space-y-3"}>{category === 0 && matches(0) && (<div className={"bg-white rounded-2xl p-3 border border-[#DFE4E0] shadow-sm flex gap-3 relative overflow-hidden"}><div className={"w-24 h-24 rounded-xl shrink-0 overflow-hidden relative bg-neutral-100"}><img alt={"Trüflü Gurme Burger"} className={"w-full h-full object-cover"} src={"https://lh3.googleusercontent.com/aida-public/AB6AXuC-1cHMWysRk1IGCv5tTLnyYhSQkgV2wu3lqgYxtArlVVxwDMkQgT2k_7vyWAd4aJIrYdRd3ApQ6ssM6KJANvgdY3GC7VBB8wEaWWzOPRzgTtUwWbWR-zXoDJilcQY4pA4yyv5bvbo6ghS8rD7Dg0QL8c0wklXy8TCZZ72Jokf4p9Sc1HP5eZjtlA9WeU8gVgZD3uXoIDHYilcxDOyCwXlvzjCTZ3GE0npXjzurSj4"} /><span className={"absolute bottom-1 left-1 bg-black/70 backdrop-blur-xs text-white text-[9px] px-1.5 py-0.5 rounded font-medium"}>{"780 kcal"}</span></div><div className={"flex-1 flex flex-col justify-between min-w-0"}><div><div className={"flex flex-wrap gap-1 mb-1"}><span className={"inline-flex items-center gap-0.5 bg-[#1A1A1A] text-[#FED65B] text-[9px] font-bold px-1.5 py-0.5 rounded"}><span className={"material-symbols-outlined text-[10px]"}>{"cooking"}</span>{" Şefin Tavsiyesi "}</span><span className={"inline-flex items-center gap-0.5 bg-[#002819] text-emerald-300 text-[9px] font-bold px-1.5 py-0.5 rounded"}><span className={"material-symbols-outlined text-[10px]"}>{"trending_up"}</span>{" En Çok Satan "}</span></div><h4 className={"font-['Montserrat',sans-serif] font-bold text-xs text-[#191C1D] truncate"}>{"Trüflü Gurme Burger"}</h4><p className={"text-[10px] text-[#59635D] line-clamp-2 mt-0.5 leading-relaxed"}>{"Dana burger köftesi, karamelize soğan, trüf mayonez, cheddar peyniri ve özel tereyağlı ekmek."}</p></div><div className={"flex items-center justify-between mt-2 pt-1 border-t border-[#DFE4E0]/40"}><div><span className={"font-['Montserrat',sans-serif] font-extrabold text-sm text-[#191C1D]"}>{"₺345,00"}</span><span className={"text-[10px] text-emerald-700 ml-1.5 font-medium flex items-center inline-flex"}><span className={"w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1"}></span>{"Stokta "}</span></div><button className={"h-7 px-3 rounded-lg bg-[#D4AF37] text-[#1A1A1A] text-[11px] font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-all"} data-action={"product:0"} type={"button"}><span>{"Ekle"}</span><span className={"material-symbols-outlined text-xs"}>{"add"}</span></button></div></div></div>)}{category === 0 && matches(1) && (<div className={"bg-white rounded-2xl p-3 border-2 border-[#D4AF37]/40 shadow-sm flex gap-3 relative overflow-hidden"}><div className={"w-24 h-24 rounded-xl shrink-0 overflow-hidden relative bg-neutral-100"}><img alt={"Smoked Texas BBQ Burger"} className={"w-full h-full object-cover"} src={"https://lh3.googleusercontent.com/aida-public/AB6AXuAKKDVXw_zvLjzH7z8Z_4ZDeiZTVaOSIgtW2xN4r3eDMO8eTJUxrdvjt_QFFBlDvXrmXwJ84bqJ9KuQpVhIJDH-g-xnxR9D9TtIFGB4zPBMXTcXWMgTbh8ixNOtkcYZ52l-H3K04xPhmYKhdQTsjx5gbDDEgj4jPxqjO4QRtAGg0xBMkIUDnToyGehmctkFn6qFZv4xlUOR0_OsZOmIwZckxAr34mTbT8hXQJcklUI"} /><span className={"absolute bottom-1 left-1 bg-black/70 backdrop-blur-xs text-white text-[9px] px-1.5 py-0.5 rounded font-medium"}>{"850 kcal"}</span></div><div className={"flex-1 flex flex-col justify-between min-w-0"}><div><div className={"flex flex-wrap gap-1 mb-1"}><span className={"inline-flex items-center gap-0.5 bg-[#D4AF37] text-[#1A1A1A] text-[9px] font-bold px-1.5 py-0.5 rounded"}><span className={"material-symbols-outlined text-[10px]"}>{"star"}</span>{" Haftanın Ürünü "}</span></div><h4 className={"font-['Montserrat',sans-serif] font-bold text-xs text-[#191C1D] truncate"} data-action={"product:1"} role={"button"} tabIndex={"0"}>{"Smoked Texas BBQ Burger"}</h4><p className={"text-[10px] text-[#59635D] line-clamp-2 mt-0.5 leading-relaxed"}>{"Çıtır soğan halkası, dana bacon, füme barbekü sosu ve çift kat cheddar."}</p></div><div className={"flex items-center justify-between mt-2 pt-1 border-t border-[#DFE4E0]/40"}><div><span className={"font-['Montserrat',sans-serif] font-extrabold text-sm text-[#191C1D]"}>{"₺380,00"}</span></div><div className={"flex items-center border border-[#DFE4E0] rounded-lg bg-neutral-50 overflow-hidden h-7"}><button className={"w-6 h-full flex items-center justify-center text-[#1A1A1A] hover:bg-neutral-200 text-xs font-bold"} data-action={"qty:1:-1"} type={"button"}>{"-"}</button><span className={"w-6 text-center text-xs font-extrabold text-[#191C1D] font-['Montserrat',sans-serif]"}>{lines[1]}</span><button className={"w-6 h-full flex items-center justify-center text-[#D4AF37] bg-[#1A1A1A] hover:bg-black text-xs font-bold"} data-action={"qty:1:1"} type={"button"}>{"+"}</button></div></div></div></div>)}{category === 0 && matches(2) && (<div className={"bg-white/75 rounded-2xl p-3 border border-[#DFE4E0] shadow-sm flex gap-3 relative overflow-hidden opacity-65"}><div className={"w-24 h-24 rounded-xl shrink-0 overflow-hidden relative bg-neutral-200"}><img alt={"Avokado Cheddar Burger"} className={"w-full h-full object-cover grayscale"} src={"https://lh3.googleusercontent.com/aida-public/AB6AXuC1mQ_E9q1cZr86sm_1Lqaak7wgfPysuoVJkFmgO3bYUrdKv-6C80IEJemnEpuLB_lTwEZrPtRhXk243RHgvedQMujZ_ir6XzW7jx66XBHWmBf3lyhBzFwqsTGXR7_qa5r_Gm12QKCX7b01GxOJ-PUbEZ3QTDslrm60qKiMxQDhhWUvSehzGl8WVfAlyBm1-RbUSNEEbK1jJAG6DULlrnk1Wnk_ZbbkgZqir4zWV6s"} /><div className={"absolute inset-0 bg-black/60 flex items-center justify-center"}><span className={"text-[10px] font-bold text-white uppercase tracking-wider bg-red-800/90 px-2 py-0.5 rounded"}>{"Tükendi"}</span></div></div><div className={"flex-1 flex flex-col justify-between min-w-0"}><div><div className={"flex flex-wrap gap-1 mb-1"}><span className={"inline-flex items-center gap-0.5 bg-neutral-200 text-neutral-600 text-[9px] font-bold px-1.5 py-0.5 rounded"}>{" Organik "}</span></div><h4 className={"font-['Montserrat',sans-serif] font-bold text-xs text-neutral-500 line-through truncate"}>{"Avokado Cheddar Burger"}</h4><p className={"text-[10px] text-neutral-400 line-clamp-2 mt-0.5 leading-relaxed"}>{"Taze ezilmiş avokado püresi, domates salsa, çift kat peynir."}</p></div><div className={"flex items-center justify-between mt-2 pt-1 border-t border-[#DFE4E0]/40"}><span className={"font-['Montserrat',sans-serif] font-extrabold text-xs text-neutral-400"}>{"₺310,00"}</span><button className={"h-7 px-2.5 rounded-lg bg-neutral-200 text-neutral-400 text-[10px] font-semibold cursor-not-allowed"} disabled type={"button"}>{" Şu Anda Tükendi "}</button></div></div></div>)}</div><div className={"mx-3 mt-4 p-3 bg-[#002819]/10 rounded-xl border border-[#002819]/20 text-[11px] text-[#06402B] flex items-start gap-2"}><span className={"material-symbols-outlined text-base shrink-0 text-[#06402B]"}>{"info"}</span><p>{"Siparişleriniz mutfak ekranımıza anlık olarak iletilir. Alerjen içeriği için ürün detaylarını inceleyebilirsiniz."}</p></div><footer className={"mt-8 mb-4 px-4 text-center"}><div className={"flex items-center justify-center gap-1.5 text-xs text-neutral-500 font-medium"}><span>{"Powered by"}</span><span className={"font-bold text-[#06402B] font-['Montserrat',sans-serif] flex items-center gap-1"}><img
  alt="Şükran App"
  className="w-3.5 h-3.5 rounded-xs inline"
  src="/sukranapp.png"
/>{" Şükran App "}</span></div><nav
  aria-label="QR menü hukuki bağlantıları"
  className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] text-[#59635D]"
>
  {[
    ['/kvkk', 'KVKK Aydınlatma Metni'],
    ['/gizlilik-politikasi', 'Gizlilik Politikası'],
    ['/kullanim-kosullari', 'Kullanım Koşulları'],
    ['/mesafeli-satis-sozlesmesi', 'Mesafeli Satış Sözleşmesi'],
    ['/iptal-ve-iade-politikasi', 'İptal ve İade Politikası'],
    ['/kampanya-bildirimleri', 'Kampanya Bildirimleri'],
  ].map(([href, label]) => (
    <a
      key={href}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="py-1 hover:underline"
    >
      {label}
    </a>
  ))}
</nav></footer></div><button className={"absolute bottom-3 inset-x-3 bg-[#1A1A1A] text-white rounded-2xl p-3 border border-[#D4AF37] shadow-2xl flex items-center justify-between z-30"} data-action={"cart"} type={"button"}><div className={"flex items-center gap-2.5"}><div className={"w-8 h-8 rounded-xl bg-[#D4AF37] text-[#1A1A1A] flex items-center justify-center font-bold font-['Montserrat',sans-serif] text-xs"}>{count}</div><div><p className={"text-xs font-bold text-white flex items-center gap-1"}>{" Sepeti Gör "}<span className={"material-symbols-outlined text-xs text-[#D4AF37]"}>{"arrow_forward"}</span></p><p className={"text-[10px] text-[#FED65B]"}>{"Masa " + table + " için hazırlandı"}</p></div></div><div className={"text-right"}><span className={"text-[10px] text-neutral-400 uppercase tracking-wider block"}>{"Toplam Tutar"}</span><span className={"font-['Montserrat',sans-serif] font-extrabold text-sm text-white"}>{tl(total)}</span></div></button></div>),
product: () => (<div className={"h-full min-h-0 w-full bg-neutral-900 overflow-hidden relative flex flex-col "}><div className={"absolute inset-0 bg-black/60 z-10 backdrop-blur-[2px]"}></div><div className={"absolute inset-0 p-4 opacity-20 pointer-events-none"}><div className={"w-full h-8 bg-white/20 rounded-lg mb-3"}></div><div className={"w-full h-24 bg-white/10 rounded-xl mb-3"}></div><div className={"w-full h-24 bg-white/10 rounded-xl"}></div></div><div className={"absolute bottom-0 inset-x-0 bg-white rounded-t-[32px] max-h-[92%] flex flex-col z-20 shadow-2xl border-t border-[#D4AF37]/30 overflow-hidden"}><div className={"py-2 flex justify-center shrink-0"}><div className={"w-12 h-1.5 bg-neutral-300 rounded-full"}></div></div><div className={"px-4 pb-2 flex items-center justify-between border-b border-[#DFE4E0]/40 shrink-0"}><span className={"text-[11px] font-bold text-[#D4AF37] uppercase tracking-wider font-['Montserrat',sans-serif]"}>{"Ürün Detayı"}</span><button className={"w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 hover:text-black"} data-action={"back"} type={"button"}><span className={"material-symbols-outlined text-sm"}>{"close"}</span></button></div><div className={"flex-1 overflow-y-auto hide-scrollbar p-4 space-y-4 pb-24"}><div className={"w-full h-44 rounded-2xl overflow-hidden relative bg-neutral-100"}><img alt={"Trüflü Burger"} className={"w-full h-full object-cover"} src={"https://lh3.googleusercontent.com/aida-public/AB6AXuD9GQ-Wi7-MOrMkk75AGEZaS-L4C2sCOhaHbOZs6IfAVy3q6I2dHMn3B2p8A9HtL4Nlzn35kqRNQ_oTq8m3mdZAJwOPdFXVBUN2NbxLc9kMxOQpOBcOSdCMW4Ntzz_4KjzGWkrZyZ6wMwhQYUq531y8T1bxygiIrUUfJLInu8FmdBgMFzZV44TdpD4LCaTQeBmzupb-RHRBylqo1IvZ_TWlRPAL0oPRvSPuV0QgT_w"} /><div className={"absolute top-2 left-2 flex gap-1"}><span className={"bg-[#1A1A1A] text-[#FED65B] text-[10px] font-bold px-2 py-0.5 rounded shadow"}>{" Şefin Tavsiyesi "}</span><span className={"bg-[#002819] text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded shadow"}>{" 780 kcal "}</span></div></div><div><div className={"flex items-baseline justify-between"}><h3 className={"font-['Montserrat',sans-serif] font-extrabold text-base text-[#191C1D]"}>{itemNames[item]}</h3><span className={"font-['Montserrat',sans-serif] font-extrabold text-lg text-[#06402B]"}>{tl(prices[item])}</span></div><p className={"text-xs text-[#59635D] mt-1 leading-relaxed"}>{" 180 gr. dinlendirilmiş dana antrikot köftesi, karamelize mor soğan, siyah trüf mantarı mayonezi, eritilmiş İngiliz cheddar ve patatesli brioche ekmeği. "}</p></div><div className={"bg-[#F8F9FA] p-3 rounded-2xl border border-[#DFE4E0]"}><div className={"flex items-center justify-between mb-2"}><span className={"font-['Montserrat',sans-serif] font-bold text-xs text-[#191C1D]"}>{"Pişirme Derecesi"}</span><span className={"text-[10px] bg-[#D4AF37]/20 text-[#1A1A1A] px-1.5 py-0.2 rounded font-bold uppercase"}>{"1 Seçim Zorunlu"}</span></div><div className={"space-y-1.5 text-xs"}><label className={"flex items-center justify-between p-2 rounded-xl bg-white border border-[#DFE4E0] cursor-pointer"}><div className={"flex items-center gap-2"}><input defaultChecked className={"accent-[#06402B]"} name={"cook"} type={"radio"} required /><span>{"Orta Pişmiş (Medium)"}</span></div><span className={"text-neutral-400 text-[11px]"}>{"Ücretsiz"}</span></label><label className={"flex items-center justify-between p-2 rounded-xl bg-white border border-[#DFE4E0] cursor-pointer"}><div className={"flex items-center gap-2"}><input className={"accent-[#06402B]"} name={"cook"} type={"radio"} /><span>{"Çok Pişmiş (Well Done)"}</span></div><span className={"text-neutral-400 text-[11px]"}>{"Ücretsiz"}</span></label></div></div><div className={"bg-[#F8F9FA] p-3 rounded-2xl border border-[#DFE4E0]"}><div className={"flex items-center justify-between mb-2"}><span className={"font-['Montserrat',sans-serif] font-bold text-xs text-[#191C1D]"}>{"Ekstra Malzemeler"}</span><span className={"text-[10px] text-[#59635D] font-medium"}>{"İsteğe Bağlı"}</span></div><div className={"space-y-1.5 text-xs"}><label className={"flex items-center justify-between p-2 rounded-xl bg-white border-2 border-[#D4AF37]/50 cursor-pointer"}><div className={"flex items-center gap-2"}><input defaultChecked className={"accent-[#D4AF37] w-4 h-4 rounded"} type={"checkbox"} data-extra={"0"} /><span className={"font-semibold text-[#191C1D]"}>{"Ekstra Cheddar Peyniri"}</span></div><span className={"font-bold text-[#1A1A1A]"}>{"+₺35,00"}</span></label><label className={"flex items-center justify-between p-2 rounded-xl bg-white border border-[#DFE4E0] cursor-pointer"}><div className={"flex items-center gap-2"}><input className={"accent-[#D4AF37] w-4 h-4 rounded"} type={"checkbox"} data-extra={"1"} /><span>{"Ekstra Trüf Sosu"}</span></div><span className={"text-neutral-600 font-medium"}>{"+₺45,00"}</span></label><label className={"flex items-center justify-between p-2 rounded-xl bg-white border-2 border-[#D4AF37]/50 cursor-pointer"}><div className={"flex items-center gap-2"}><input defaultChecked className={"accent-[#D4AF37] w-4 h-4 rounded"} type={"checkbox"} data-extra={"2"} /><span className={"font-semibold text-[#191C1D]"}>{"Karamelize Soğan"}</span></div><span className={"font-bold text-[#1A1A1A]"}>{"+₺20,00"}</span></label></div></div><div><label className={"block text-xs font-bold text-[#191C1D] font-['Montserrat',sans-serif] mb-1"}>{"Ürün Notu"}</label><textarea className={"w-full text-xs p-2.5 rounded-xl border border-[#DFE4E0] bg-[#F8F9FA] focus:outline-none focus:border-[#D4AF37]"} placeholder={"Örn: Yeşillik ve domates olmasın lütfen..."} rows={"2"} defaultValue={""}></textarea></div></div><div className={"absolute bottom-0 inset-x-0 bg-white border-t border-[#DFE4E0] p-3 flex items-center gap-3 z-30 shadow-lg"}><div className={"flex items-center border border-[#DFE4E0] rounded-xl bg-neutral-50 h-11 px-1"}><button className={"w-8 h-full flex items-center justify-center text-sm font-bold text-neutral-600"} data-action={"draft:-1"} type={"button"}>{"-"}</button><span className={"w-7 text-center font-['Montserrat',sans-serif] font-extrabold text-xs"}>{quantity}</span><button className={"w-8 h-full flex items-center justify-center text-sm font-bold text-[#06402B]"} data-action={"draft:1"} type={"button"}>{"+"}</button></div><button className={"flex-1 h-11 rounded-xl bg-[#D4AF37] text-[#1A1A1A] font-['Montserrat',sans-serif] font-extrabold text-xs flex items-center justify-between px-4 shadow-md active:scale-98 transition-transform"} data-action={"add"} type={"button"}>{'Sepete Ekle · ' + tl((prices[item] + extra) * quantity)}</button></div></div></div>),
cart: () => (<div className={"h-full min-h-0 w-full bg-[#F8F9FA] overflow-hidden relative flex flex-col "}><div className={"bg-[#1A1A1A] text-white px-4 py-3 shrink-0 flex items-center justify-between border-b border-neutral-800"}><div className={"flex items-center gap-2"}><button className={"w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-300"} data-action={"menu"} type={"button"}><span className={"material-symbols-outlined text-base"}>{"arrow_back"}</span></button><div><h3 className={"font-['Montserrat',sans-serif] font-bold text-sm text-white"}>{"Sipariş Sepetiniz"}</h3><p className={"text-[10px] text-[#D4AF37]"}>{'Masa ' + table + ' • ' + count + ' Ürün Seçili'}</p></div></div><button className={"text-[11px] text-red-400 hover:underline"} data-action={"clear"} type={"button"}>{"Sepeti Temizle"}</button></div><div className={"flex-1 overflow-y-auto hide-scrollbar p-3 space-y-3 pb-32"}>{lines[0] > 0 && (<div className={"bg-white rounded-2xl p-3 border border-[#DFE4E0] shadow-sm"}><div className={"flex items-start justify-between gap-2"}><div><h4 className={"font-['Montserrat',sans-serif] font-bold text-xs text-[#191C1D]"}>{"Trüflü Gurme Burger"}</h4><p className={"text-[10px] text-[#59635D] mt-0.5"}>{"• Pişirme: Orta Pişmiş"}</p><p className={"text-[10px] text-[#06402B] font-medium"}>{"+ Ekstra Cheddar (+₺35), Karamelize Soğan (+₺20)"}</p><p className={"text-[10px] text-neutral-400 italic mt-0.5"}>{"Not: \"Yeşilliksiz lütfen\""}</p></div><span className={"font-['Montserrat',sans-serif] font-extrabold text-xs text-[#191C1D] shrink-0"}>{tl(lines[0] * unitPrices[0])}</span></div><div className={"flex items-center justify-between mt-2 pt-2 border-t border-[#DFE4E0]/40"}><button className={"text-[10px] text-[#D4AF37] font-bold flex items-center gap-0.5 hover:underline"} data-action={"edit:0"} type={"button"}><span className={"material-symbols-outlined text-xs"}>{"edit"}</span>{" Düzenle "}</button><div className={"flex items-center border border-[#DFE4E0] rounded-lg bg-neutral-50 h-6 px-1"}><button className={"w-5 text-center text-xs font-bold text-neutral-500"} data-action={"qty:0:-1"} type={"button"}>{"-"}</button><span className={"w-5 text-center text-xs font-bold text-[#191C1D]"}>{lines[0]}</span><button className={"w-5 text-center text-xs font-bold text-[#06402B]"} data-action={"qty:0:1"} type={"button"}>{"+"}</button></div></div></div>)}{lines[1] > 0 && (<div className={"bg-white rounded-2xl p-3 border border-[#DFE4E0] shadow-sm"}><div className={"flex items-start justify-between gap-2"}><div><h4 className={"font-['Montserrat',sans-serif] font-bold text-xs text-[#191C1D]"}>{"Smoked Texas BBQ Burger"}</h4><p className={"text-[10px] text-[#59635D] mt-0.5"}>{"• Pişirme: İyi Pişmiş"}</p><p className={"text-[10px] text-neutral-400 text-xs mt-0.5"}>{"Adet Fiyatı: ₺380,00"}</p></div><span className={"font-['Montserrat',sans-serif] font-extrabold text-xs text-[#191C1D] shrink-0"}>{tl(lines[1] * unitPrices[1])}</span></div><div className={"flex items-center justify-between mt-2 pt-2 border-t border-[#DFE4E0]/40"}><button className={"text-[10px] text-[#D4AF37] font-bold flex items-center gap-0.5 hover:underline"} data-action={"edit:1"} type={"button"}><span className={"material-symbols-outlined text-xs"}>{"edit"}</span>{" Düzenle "}</button><div className={"flex items-center border border-[#DFE4E0] rounded-lg bg-neutral-50 h-6 px-1"}><button className={"w-5 text-center text-xs font-bold text-neutral-500"} data-action={"qty:1:-1"} type={"button"}>{"-"}</button><span className={"w-5 text-center text-xs font-bold text-[#191C1D]"}>{lines[1]}</span><button className={"w-5 text-center text-xs font-bold text-[#06402B]"} data-action={"qty:1:1"} type={"button"}>{"+"}</button></div></div></div>)}{lines[2] > 0 && (<div className={"bg-white rounded-2xl p-3 border border-[#DFE4E0] shadow-sm"}><div className={"flex items-start justify-between gap-2"}><div><h4 className={"font-['Montserrat',sans-serif] font-bold text-xs text-[#191C1D]"}>{"Ev Yapımı Taze Limonata"}</h4><p className={"text-[10px] text-[#59635D] mt-0.5"}>{"• Nane & Zencefil İlavesi"}</p></div><span className={"font-['Montserrat',sans-serif] font-extrabold text-xs text-[#191C1D] shrink-0"}>{tl(lines[2] * unitPrices[2])}</span></div><div className={"flex items-center justify-between mt-2 pt-2 border-t border-[#DFE4E0]/40"}><span className={"text-[10px] text-neutral-400"}>{"Standart Boy"}</span><div className={"flex items-center border border-[#DFE4E0] rounded-lg bg-neutral-50 h-6 px-1"}><button className={"w-5 text-center text-xs font-bold text-neutral-500"} data-action={"qty:2:-1"} type={"button"}>{"-"}</button><span className={"w-5 text-center text-xs font-bold text-[#191C1D]"}>{lines[2]}</span><button className={"w-5 text-center text-xs font-bold text-[#06402B]"} data-action={"qty:2:1"} type={"button"}>{"+"}</button></div></div></div>)}<div className={"bg-white p-3 rounded-2xl border border-[#DFE4E0] space-y-2"}><div className={"flex items-center justify-between"}><label className={"text-xs font-bold text-[#191C1D] font-['Montserrat',sans-serif] flex items-center gap-1"}><span className={"material-symbols-outlined text-sm text-[#D4AF37]"}>{"edit_note"}</span>{" Sipariş Notu "}</label><span className={"text-[10px] text-neutral-400"}>{"32/300"}</span></div><textarea className={"w-full text-xs p-2 rounded-xl border border-[#DFE4E0] bg-[#F8F9FA] focus:outline-none focus:border-[#D4AF37]"} placeholder={"Siparişinizle ilgili özel bir isteğiniz varsa buraya yazabilirsiniz..."} rows={"2"} defaultValue={"Soslar lütfen patateslerin yanına gelsin."}></textarea><div className={"p-2 bg-amber-50 rounded-lg border border-amber-200 text-[10px] text-amber-800 flex items-start gap-1.5"}><span className={"material-symbols-outlined text-xs shrink-0 text-amber-600"}>{"warning"}</span><p>{"Alerjiniz veya özel bir sağlık durumunuz varsa sipariş vermeden önce lütfen işletme personeline bildiriniz."}</p></div></div><div className={"bg-white p-3 rounded-2xl border border-[#DFE4E0] space-y-1.5 text-xs"}><div className={"flex justify-between text-[#59635D] text-[11px]"}><span>{"Ara Toplam (Ürünler)"}</span><span>{tl(baseTotal)}</span></div><div className={"flex justify-between text-[#59635D] text-[11px]"}><span>{"Ekstra Seçenekler"}</span><span>{tl(total-baseTotal)}</span></div><div className={"flex justify-between text-[#59635D] text-[11px]"}><span>{"Hizmet / Servis Bedeli"}</span><span>{tl(0)}</span></div><div className={"border-t border-[#DFE4E0] pt-2 flex justify-between font-['Montserrat',sans-serif] font-extrabold text-sm text-[#191C1D]"}><span>{"Genel Toplam"}</span><span className={"text-[#06402B] text-base"}>{tl(total)}</span></div></div></div><div className={"absolute bottom-0 inset-x-0 bg-white border-t border-[#DFE4E0] p-3 z-30 shadow-2xl"}><div className={"flex items-center justify-between mb-2 px-1"}><span className={"text-xs text-neutral-500 font-medium"}>{"Hedef: "}<strong className={"text-[#191C1D]"}>{"Masa " + table + ""}</strong></span><span className={"text-xs font-bold text-[#06402B] font-['Montserrat',sans-serif]"}>{'Ödenecek: ' + tl(total)}</span></div><button className={"w-full h-12 rounded-xl bg-[#D4AF37] text-[#1A1A1A] font-['Montserrat',sans-serif] font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-transform"} data-action={"confirm"} type={"button"}><span className={"material-symbols-outlined text-lg"}>{"check_circle"}</span><span>{"Siparişi Onayla ve Gönder"}</span></button></div></div>),
register: () => (<form className={"h-full min-h-0 w-full bg-[#F8F9FA] overflow-hidden relative flex flex-col "}><div className={"bg-[#1A1A1A] text-white px-4 py-3 shrink-0 flex items-center justify-between border-b border-neutral-800"}><div className={"flex items-center gap-2"}><button className={"w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-300"} data-action={"account"} type={"button"}><span className={"material-symbols-outlined text-base"}>{"arrow_back"}</span></button><h3 className={"font-['Montserrat',sans-serif] font-bold text-sm text-white"}>{"Hesap Oluştur"}</h3></div><span className={"text-[10px] text-[#FED65B] font-semibold"}>{"Masa " + table + ""}</span></div><div className={"flex-1 overflow-y-auto hide-scrollbar p-4 space-y-3.5 pb-8"}><div className={"text-center pt-1 pb-1"}><span className={"text-[10px] uppercase font-bold tracking-widest text-[#D4AF37] font-['Montserrat',sans-serif]"}>{"Ayrıcalıklı Deneyime Katılın"}</span><h4 className={"font-['Montserrat',sans-serif] font-extrabold text-lg text-[#191C1D] mt-0.5"}>{"Şükran Club Üyeliği"}</h4><p className={"text-[11px] text-[#59635D] mt-0.5"}>{"Masada hızlı ödeme, puan kazanımı ve özel ikramlar için kaydolun."}</p></div><div className={"space-y-2.5 text-xs"}><label className={"block font-semibold text-[#191C1D]"}>{"İsim Soyisim"}<input className={"mt-1 w-full px-3 py-2 bg-white text-xs rounded-xl border border-[#DFE4E0] text-[#191C1D] focus:outline-none focus:border-[#D4AF37]"} placeholder={"Örn: Ahmet Yılmaz"} type={"text"} defaultValue={"Ahmet Yılmaz"} required /></label><label className={"block font-semibold text-[#191C1D]"}>{"Telefon Numarası"}<input className={"mt-1 w-full px-3 py-2 bg-white text-xs rounded-xl border border-[#DFE4E0] text-[#191C1D] focus:outline-none focus:border-[#D4AF37]"} placeholder={"+90 (5XX) XXX XX XX"} type={"tel"} defaultValue={"+90 532 890 12 34"} required /></label><label className={"block font-semibold text-[#191C1D]"}>{"E-posta Adresi"}<input className={"mt-1 w-full px-3 py-2 bg-white text-xs rounded-xl border border-[#DFE4E0] text-[#191C1D] focus:outline-none focus:border-[#D4AF37]"} placeholder={"ornek@email.com"} type={"email"} defaultValue={"ahmet.yilmaz@sukran.com"} required /></label><div className={"grid grid-cols-2 gap-2"}><label className={"block font-semibold text-[#191C1D]"}>{"İl"}<input className={"mt-1 w-full px-3 py-2 bg-white text-xs rounded-xl border border-[#DFE4E0] text-[#191C1D] focus:outline-none focus:border-[#D4AF37]"} type={"text"} defaultValue={"İstanbul"} required /></label><label className={"block font-semibold text-[#191C1D]"}>{"İlçe"}<input className={"mt-1 w-full px-3 py-2 bg-white text-xs rounded-xl border border-[#DFE4E0] text-[#191C1D] focus:outline-none focus:border-[#D4AF37]"} type={"text"} defaultValue={"Beşiktaş"} required /></label></div><label className={"block font-semibold text-[#191C1D]"}>{"Açık Adres (Teslimat & Fatura)"}<textarea className={"mt-1 w-full p-2.5 bg-white text-xs rounded-xl border border-[#DFE4E0] text-[#191C1D] focus:outline-none focus:border-[#D4AF37]"} placeholder={"Cadde, mahalle, kapı no..."} rows={"2"} defaultValue={"Levent Mah. Nispetiye Cad. No: 14/B"}></textarea></label><label className={"block font-semibold text-[#191C1D]"}>{"Şifre Belirleyin"}<input className={"mt-1 w-full px-3 py-2 bg-white text-xs rounded-xl border border-[#DFE4E0] text-[#191C1D] focus:outline-none focus:border-[#D4AF37]"} type={"password"} required /></label></div><div className="space-y-3 border-t border-[#DFE4E0]/60 pt-2 text-[11px] text-[#59635D]">
  <div className="flex items-start gap-2">
    <input
      id="qr-privacy"
      name="privacyRead"
      type="checkbox"
      required
      className="mt-0.5 accent-[#D4AF37]"
    />
    <div>
      <a
        href="/kvkk"
        target="_blank"
        rel="noopener noreferrer"
        className="font-bold text-[#06402B] underline"
      >
        KVKK Aydınlatma Metni
      </a>
      <label htmlFor="qr-privacy" className="cursor-pointer">
        ’ni okudum.
      </label>
    </div>
  </div>

  <div className="flex items-start gap-2">
    <input
      id="qr-terms"
      name="terms"
      type="checkbox"
      required
      className="mt-0.5 accent-[#D4AF37]"
    />
    <div>
      <a
        href="/kullanim-kosullari"
        target="_blank"
        rel="noopener noreferrer"
        className="font-bold text-[#06402B] underline"
      >
        Kullanıcı Sözleşmesi
      </a>
      <label htmlFor="qr-terms" className="cursor-pointer">
        ’ni okudum ve kabul ediyorum.
      </label>
    </div>
  </div>

  <div className="flex items-start gap-2">
    <input
      id="qr-marketing"
      name="marketing"
      type="checkbox"
      className="mt-0.5 accent-[#D4AF37]"
    />
    <div>
      <label htmlFor="qr-marketing" className="cursor-pointer">
        Kampanya ve özel fırsatlardan e-posta veya SMS ile haberdar olmak
        istiyorum. (İsteğe bağlı)
      </label>
      <a
        href="/kampanya-bildirimleri"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 block font-bold text-[#06402B] underline"
      >
        Kampanya Bildirimleri Bilgilendirmesini Oku
      </a>
    </div>
  </div>
</div><p className={"text-center text-[11px] text-neutral-500 pt-1"}>{"Zaten hesabınız var mı? "}<a className={"font-bold text-[#06402B] hover:underline"} href={"#auth-login"} data-action={"login"}>{"Giriş Yap"}</a></p></div></form>),
login: () => (<form className={"h-full min-h-0 w-full bg-[#F8F9FA] overflow-hidden relative flex flex-col "}><div className={"bg-[#1A1A1A] text-white px-4 py-3 shrink-0 flex items-center justify-between border-b border-neutral-800"}><div className={"flex items-center gap-2"}><button className={"w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-300"} data-action={"account"} type={"button"}><span className={"material-symbols-outlined text-base"}>{"arrow_back"}</span></button><h3 className={"font-['Montserrat',sans-serif] font-bold text-sm text-white"}>{"Giriş Yap"}</h3></div><span className={"text-[10px] text-[#FED65B] font-semibold"}>{"Masa " + table + ""}</span></div><div className={"flex-1 overflow-y-auto hide-scrollbar p-4 flex flex-col justify-between"}><div className={"space-y-4 pt-4"}><div className={"text-center"}><div className={"w-14 h-14 rounded-2xl bg-[#002819] border border-[#D4AF37] mx-auto flex items-center justify-center text-[#D4AF37] shadow-md mb-2"}><span className={"material-symbols-outlined text-2xl"}>{"lock"}</span></div><h4 className={"font-['Montserrat',sans-serif] font-bold text-lg text-[#191C1D]"}>{"Tekrar Hoş Geldiniz"}</h4><p className={"text-xs text-[#59635D] mt-1"}>{"Masa siparişlerinizi ve puanlarınızı yönetmek için giriş yapın."}</p></div><div className={"space-y-3 text-xs"}><label className={"block font-semibold text-[#191C1D]"}>{"E-posta veya Telefon Numarası"}<div className={"relative mt-1"}><span className={"material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm"}>{"mail"}</span><input className={"w-full pl-9 pr-3 py-2.5 bg-white text-xs rounded-xl border border-[#DFE4E0] text-[#191C1D] focus:outline-none focus:border-[#D4AF37]"} placeholder={"ornek@email.com veya 05XX..."} type={"text"} defaultValue={"ahmet.yilmaz@sukran.com"} required /></div></label><label className={"block font-semibold text-[#191C1D]"}>{"Şifre"}<div className={"relative mt-1"}><span className={"material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm"}>{"key"}</span><input className={"w-full pl-9 pr-3 py-2.5 bg-white text-xs rounded-xl border border-[#DFE4E0] text-[#191C1D] focus:outline-none focus:border-[#D4AF37]"} placeholder={"Şifreniz"} type={"password"} required /></div></label><div className={"flex items-center justify-between text-[11px] pt-1"}><label className={"flex items-center gap-1.5 cursor-pointer text-[#59635D]"}><input defaultChecked className={"accent-[#D4AF37] rounded"} type={"checkbox"} />{"Beni Hatırla"}</label><a className={"text-[#06402B] font-bold hover:underline"} href={"#"} data-action={"recovery"}>{"Şifremi Unuttum"}</a></div></div><button className={"w-full h-11 rounded-xl bg-[#D4AF37] text-[#1A1A1A] font-['Montserrat',sans-serif] font-extrabold text-xs flex items-center justify-center gap-2 shadow-md active:scale-98 transition-transform mt-3"} data-action={"loginSubmit"} type={"button"}><span className={"material-symbols-outlined text-sm"}>{"login"}</span>{"Giriş Yap"}</button><div className={"relative flex py-2 items-center"}><div className={"flex-grow border-t border-[#DFE4E0]"}></div><span className={"flex-shrink mx-2 text-[10px] text-neutral-400 uppercase font-medium"}>{"veya"}</span><div className={"flex-grow border-t border-[#DFE4E0]"}></div></div><button className={"w-full h-10 rounded-xl bg-white border border-[#DFE4E0] text-[#191C1D] text-xs font-semibold flex items-center justify-center gap-2 hover:bg-neutral-50 shadow-sm"} data-action={"menu"} type={"button"}><span className={"material-symbols-outlined text-sm text-[#D4AF37]"}>{"qr_code_scanner"}</span>{"Masaya Misafir Olarak Devam Et"}</button></div><div className={"text-center pb-4"}><p className={"text-xs text-neutral-500"}>{"Hesabınız yok mu? "}<a className={"font-bold text-[#06402B] hover:underline"} href={"#auth-register"} data-action={"register"}>{"Hemen Üye Ol"}</a></p></div></div></form>),
orders: () => (<div className={"h-full min-h-0 w-full bg-[#F8F9FA] overflow-hidden relative flex flex-col "}><div className={"bg-[#1A1A1A] text-white px-4 py-3 shrink-0 flex items-center justify-between border-b border-neutral-800"}><div className={"flex items-center gap-2"}><button className={"w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-300"} data-action={"account"} type={"button"}><span className={"material-symbols-outlined text-base"}>{"arrow_back"}</span></button><h3 className={"font-['Montserrat',sans-serif] font-bold text-sm text-white"}>{"Sipariş Geçmişim"}</h3></div><span className={"text-[10px] bg-[#D4AF37] text-[#1A1A1A] px-2 py-0.5 rounded-full font-bold"}>{"3 Sipariş"}</span></div><div className={"flex-1 overflow-y-auto hide-scrollbar p-3 space-y-3 pb-8"}><div className={"flex gap-2 p-1 bg-neutral-200 rounded-xl"}><button className={"flex-1 py-1.5 rounded-lg bg-[#1A1A1A] text-[#FED65B] text-xs font-bold font-['Montserrat',sans-serif] shadow-sm"} data-action={"active"} type={"button"}>{"Aktif Sipariş (1)"}</button><button className={"flex-1 py-1.5 rounded-lg text-neutral-600 text-xs font-medium hover:text-black"} data-action={"history"} type={"button"}>{"Geçmiş (2)"}</button></div><div className={"bg-white rounded-2xl p-3 border-2 border-[#D4AF37]/60 shadow-sm"}><div className={"flex items-center justify-between pb-2 border-b border-[#DFE4E0]/40"}><div className={"flex items-center gap-1.5"}><span className={"px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300"}>{"Hazırlanıyor"}</span><span className={"text-[10px] text-[#59635D]"}>{"#SKR-8942"}</span></div><span className={"text-xs font-bold text-[#D4AF37] font-['Montserrat',sans-serif]"}>{"Masa " + table + ""}</span></div><div className={"py-2.5 space-y-1.5"}><div className={"flex justify-between text-xs font-medium text-[#191C1D]"}><span>{"2x Trüflü Gurme Burger"}</span><span className={"font-bold"}>{"₺690,00"}</span></div><div className={"flex justify-between text-xs text-[#59635D]"}><span>{"1x Ev Yapımı Limonata"}</span><span>{"₺65,00"}</span></div><div className={"flex justify-between text-xs text-[#59635D]"}><span>{"1x Ekstra Cheddar & Karamelize"}</span><span>{"₺55,00"}</span></div></div><div className={"pt-2 border-t border-[#DFE4E0]/40 flex items-center justify-between"}><span className={"text-xs font-bold text-[#191C1D] font-['Montserrat',sans-serif]"}>{"Toplam: "}<strong className={"text-[#06402B]"}>{"₺810,00"}</strong></span><div className={"flex gap-1.5"}><button className={"px-2.5 py-1 text-[11px] font-bold text-[#1A1A1A] bg-[#D4AF37] rounded-lg shadow-sm"} data-action={"tracking"} type={"button"}>{"Canlı Takip"}</button></div></div></div><div className={"bg-white rounded-2xl p-3 border border-[#DFE4E0] shadow-sm opacity-90"}><div className={"flex items-center justify-between pb-2 border-b border-[#DFE4E0]/40"}><div className={"flex items-center gap-1.5"}><span className={"px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800"}>{"Tamamlandı"}</span><span className={"text-[10px] text-neutral-400"}>{"Dün, 20:15"}</span></div><span className={"text-xs font-semibold text-neutral-500"}>{"Masa 04"}</span></div><div className={"py-2 text-xs text-[#59635D]"}><p>{"1x Smoked Texas BBQ Burger, 1x Patates Sepeti"}</p><span className={"font-['Montserrat',sans-serif] font-extrabold text-xs text-[#191C1D] block mt-1"}>{"Toplam: ₺480,00"}</span></div><div className={"pt-2 border-t border-[#DFE4E0]/40 flex gap-2"}><button className={"flex-1 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-[#1A1A1A] text-[11px] font-bold rounded-lg"} data-action={"tracking"} type={"button"}>{"Sipariş Detayı"}</button><button className={"flex-1 py-1.5 bg-[#002819] text-emerald-300 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1"} data-action={"repeat"} type={"button"}><span className={"material-symbols-outlined text-xs"}>{"repeat"}</span>{"Tekrar Ver"}</button></div></div><div className={"p-3 bg-[#002819]/10 rounded-2xl border border-[#002819]/20 flex items-center gap-2"}><span className={"material-symbols-outlined text-[#06402B] text-lg"}>{"loyalty"}</span><div><p className={"text-xs font-bold text-[#06402B] font-['Montserrat',sans-serif]"}>{"Kazanılan Sadakat Puanı: 85 Puan"}</p><p className={"text-[10px] text-neutral-600"}>{"Sonraki siparişinizde %10 indirim kazanın."}</p></div></div></div></div>),
review: () => (<form className={"h-full min-h-0 w-full bg-[#F8F9FA] overflow-hidden relative flex flex-col "}><div className={"bg-[#1A1A1A] text-white px-4 py-3 shrink-0 flex items-center justify-between border-b border-neutral-800"}><div className={"flex items-center gap-2"}><button className={"w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-300"} data-action={"account"} type={"button"}><span className={"material-symbols-outlined text-base"}>{"arrow_back"}</span></button><h3 className={"font-['Montserrat',sans-serif] font-bold text-sm text-white"}>{"Deneyimi Puanla"}</h3></div><span className={"text-[10px] text-[#D4AF37]"}>{"Masa " + table + ""}</span></div><div className={"flex-1 overflow-y-auto hide-scrollbar p-4 space-y-3.5 pb-8"}><div className={"bg-white p-3.5 rounded-2xl border border-[#DFE4E0] text-center shadow-sm"}><p className={"text-xs font-bold text-[#191C1D] font-['Montserrat',sans-serif]"}>{"Lezzet ve Servis Puanınız"}</p><div className={"flex justify-center gap-2 my-2"}><span className={"material-symbols-outlined text-2xl text-[#D4AF37] cursor-pointer"} data-action={"star:1"} role={"button"} tabIndex={"0"}>{"star"}</span><span className={"material-symbols-outlined text-2xl text-[#D4AF37] cursor-pointer"} data-action={"star:2"} role={"button"} tabIndex={"0"}>{"star"}</span><span className={"material-symbols-outlined text-2xl text-[#D4AF37] cursor-pointer"} data-action={"star:3"} role={"button"} tabIndex={"0"}>{"star"}</span><span className={"material-symbols-outlined text-2xl text-[#D4AF37] cursor-pointer"} data-action={"star:4"} role={"button"} tabIndex={"0"}>{"star"}</span><span className={"material-symbols-outlined text-2xl text-[#D4AF37] cursor-pointer"} data-action={"star:5"} role={"button"} tabIndex={"0"}>{"star"}</span></div><span className={"text-[11px] font-extrabold text-[#06402B]"}>{"5.0 / 5.0 • Mükemmel!"}</span></div><div className={"space-y-2 text-xs"}><label className={"block font-semibold text-[#191C1D]"}>{"Değerlendirilen Ürün / Deneyim"}<select className={"mt-1 w-full px-3 py-2 bg-white rounded-xl border border-[#DFE4E0] text-[#191C1D]"}><option>{"Trüflü Gurme Burger & Masa Servisi"}</option><option>{"Smoked Texas BBQ Burger"}</option><option>{"Genel Restoran Atmosferi"}</option></select></label><label className={"block font-semibold text-[#191C1D]"}>{"Fotoğraf / Sunum Ekle (Opsiyonel)"}<div className={"mt-1 border-2 border-dashed border-[#DFE4E0] rounded-xl p-3 text-center bg-white cursor-pointer hover:border-[#D4AF37]"}><span className={"material-symbols-outlined text-[#D4AF37] text-xl"}>{"add_photo_alternate"}</span><p className={"text-[10px] text-neutral-500 mt-0.5"}>{"Burger veya sunum fotoğrafını buraya yükleyin"}</p></div></label><label className={"block font-semibold text-[#191C1D]"}>{"Detaylı Görüşünüz"}<textarea className={"mt-1 w-full p-2.5 bg-white text-xs rounded-xl border border-[#DFE4E0] text-[#191C1D] focus:outline-none focus:border-[#D4AF37]"} placeholder={"Burgerin pişme derecesi, ekmek tazeliği ve garson ilgisi hakkında deneyiminiz..."} rows={"3"} defaultValue={"Eti sulu ve orta pişmiş tam kıvamındaydı, trüf mayonez dengesi harikaydı!"}></textarea></label></div><div className={"p-2.5 bg-emerald-950 text-emerald-300 rounded-xl text-[10px] border border-emerald-700/50 flex items-center gap-1.5"}><span className={"material-symbols-outlined text-xs"}>{"verified"}</span>{"Yorumunuz onaylandıktan sonra Şükran App vitrininde yayınlanacaktır."}</div><button className={"w-full h-11 rounded-xl bg-[#D4AF37] text-[#1A1A1A] font-['Montserrat',sans-serif] font-extrabold text-xs flex items-center justify-center gap-2 shadow-md active:scale-98 transition-transform"} data-action={"feedback"} type={"button"}><span className={"material-symbols-outlined text-sm"}>{"send"}</span>{"Yorumu Yayınla"}</button></div></form>),
support: () => (<form className={"h-full min-h-0 w-full bg-[#F8F9FA] overflow-hidden relative flex flex-col "}><div className={"bg-[#1A1A1A] text-white px-4 py-3 shrink-0 flex items-center justify-between border-b border-neutral-800"}><div className={"flex items-center gap-2"}><button className={"w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-300"} data-action={"account"} type={"button"}><span className={"material-symbols-outlined text-base"}>{"arrow_back"}</span></button><h3 className={"font-['Montserrat',sans-serif] font-bold text-sm text-white"}>{"Müşteri Destek & İade"}</h3></div><span className={"text-[10px] text-amber-400 font-semibold"}>{"Canlı Çözüm"}</span></div><div className={"flex-1 overflow-y-auto hide-scrollbar p-4 space-y-3 pb-8"}><div className={"p-3 bg-[#002819]/10 rounded-2xl border border-[#002819]/20 flex items-start gap-2.5"}><span className={"material-symbols-outlined text-[#06402B] text-lg shrink-0"}>{"headset_mic"}</span><div><h5 className={"text-xs font-bold text-[#06402B] font-['Montserrat',sans-serif]"}>{"Şef / Kasa Canlı İletişim"}</h5><p className={"text-[10px] text-neutral-600 mt-0.5"}>{"Masa " + table + "'ye ait siparişlerinizde herhangi bir gecikme veya memnuniyetsizlikte anında müdahale ediyoruz."}</p></div></div><div className={"space-y-2 text-xs"}><label className={"block font-semibold text-[#191C1D]"}>{"İlgili Sipariş"}<select className={"mt-1 w-full px-3 py-2 bg-white rounded-xl border border-[#DFE4E0] text-[#191C1D]"}><option>{"Sipariş #SKR-8942 (Trüflü Gurme Burger - ₺810,00)"}</option><option>{"Geçmiş Sipariş #SKR-8710 (₺480,00)"}</option></select></label><label className={"block font-semibold text-[#191C1D]"}>{"Talep / Şikâyet Tipi"}<select
  name="requestType"
  aria-label="Talep türü"
  className="mt-1 w-full rounded-xl border border-[#DFE4E0] bg-white px-3 py-2 text-[#191C1D]"
>
  <option value="missing">Hatalı / Eksik Malzeme Geldi</option>
  <option value="refund">Sipariş İptali &amp; İade Talebi</option>
  <option value="payment">Ödeme ve Hesap Tutarsızlığı</option>
  <option value="service">Masa Servis &amp; Personel Talebi</option>
</select></label><label className={"block font-semibold text-[#191C1D]"}>{"Açıklama & Not"}<textarea className={"mt-1 w-full p-2.5 bg-white text-xs rounded-xl border border-[#DFE4E0] text-[#191C1D] focus:outline-none focus:border-[#D4AF37]"} placeholder={"Lütfen durumu kısaca açıklayınız..."} rows={"2"} defaultValue={"Karamelize soğan eklenmemiş, değişim veya iade rica ediyorum."}></textarea></label><label className={"block font-semibold text-[#191C1D]"}>{"İade Yöntemi Tercihi"}<div className={"grid grid-cols-2 gap-2 mt-1"}>{Object.entries(refundMethods).map(([value, label]) => (
  <label
    key={value}
    className="flex items-center gap-1.5 rounded-xl border border-[#DFE4E0] bg-white p-2 text-[11px]"
  >
    <input
      className="accent-[#D4AF37]"
      name="refund"
      type="radio"
      value={value}
    />
    {label}
  </label>
))}</div></label></div><div className={"pt-2 space-y-2"}><button className={"w-full h-11 rounded-xl bg-[#D4AF37] text-[#1A1A1A] font-['Montserrat',sans-serif] font-extrabold text-xs flex items-center justify-center gap-2 shadow-md active:scale-98 transition-transform"} data-action={"feedback"} type={"button"}><span className={"material-symbols-outlined text-sm"}>{"assignment_turned_in"}</span>{"Destek / İade Talebi Oluştur"}</button><button className={"w-full h-10 rounded-xl bg-neutral-900 border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-black"} data-action={"call"} type={"button"}><span className={"material-symbols-outlined text-sm"}>{"room_service"}</span>{"Müdürü / Garsonu Masaya Çağır"}</button></div></div></form>),
tracking: () => (<div className={"bg-neutral-900 rounded-3xl p-5 border border-[#DFE4E0]/20 text-white flex flex-col justify-between"}><div><div className={"flex items-center justify-between mb-3"}><span className={"px-2 py-0.5 bg-emerald-900/60 text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-500/30"}>{"Sipariş Alındı #8942"}</span><span className={"text-xs text-[#D4AF37] font-semibold"}>{"Masa " + table + ""}</span></div><h4 className={"font-['Montserrat',sans-serif] font-bold text-base text-white"}>{"Tahmini Süre: 15-20 Dk."}</h4><p className={"text-xs text-neutral-400 mt-1"}>{"Siparişiniz mutfak ekibimiz tarafından hazırlandı ve onaylandı."}</p><div className={"my-4 space-y-2 text-xs"}><div className={"flex items-center gap-2"}><span className={"w-5 h-5 rounded-full bg-[#D4AF37] text-black font-extrabold flex items-center justify-center text-[10px]"}>{"✓"}</span><span className={"font-semibold text-white"}>{"Sipariş Alındı"}</span></div><div className={"w-0.5 h-3 bg-[#D4AF37] ml-2.5"}></div><div className={"flex items-center gap-2"}><span className={"w-5 h-5 rounded-full bg-[#D4AF37] text-black font-extrabold flex items-center justify-center text-[10px] animate-pulse"}>{"2"}</span><span className={"font-semibold text-[#FED65B]"}>{"Mutfağımızda Hazırlanıyor"}</span></div><div className={"w-0.5 h-3 bg-neutral-700 ml-2.5"}></div><div className={"flex items-center gap-2 opacity-50"}><span className={"w-5 h-5 rounded-full bg-neutral-800 text-neutral-400 font-bold flex items-center justify-center text-[10px]"}>{"3"}</span><span>{"Servise Hazır / Masaya Teslim"}</span></div></div></div><button className={"w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-200 rounded-xl"} data-action={"menu"} type={"button"}>{" Menüye Geri Dön "}</button></div>)
};
return (
  <main
    className="mx-auto h-dvh w-full max-w-[480px] overflow-auto bg-[#0f1412] font-['Inter',sans-serif]"
    data-screen={screen}
    onClick={click}
    onChange={change}
    onSubmit={(event) => event.preventDefault()}
    onKeyDown={(event) => {
      if (event.target.getAttribute('role') === 'button' && ['Enter', ' '].includes(event.key)) {
        event.preventDefault();
        event.target.click();
      }
    }}
  >
    <style>{'.hide-scrollbar{scrollbar-width:none}.hide-scrollbar::-webkit-scrollbar{display:none}'}</style>
    {accountOpen && screen === 'menu' && (
      <nav className="absolute right-3 top-16 z-50 grid gap-2 rounded-xl border border-[#d4af37] bg-neutral-900 p-3 text-sm text-white">
        {[['login', 'Giriş Yap'], ['register', 'Üye Ol'], ['orders', 'Siparişlerim'], ['review', 'Yorum Yap'], ['support', 'Destek Talebi']].map(([id, title]) => (
          <button type="button" key={id} className="px-2 py-1 text-left" onClick={() => go(id)}>{title}</button>
        ))}
      </nav>
    )}
    {notice && <p role="status" className="absolute inset-x-3 top-2 z-[60] mx-auto max-w-[450px] rounded-xl bg-[#fed65b] px-4 py-2 text-sm text-black">{notice}</p>}
    {screen === 'orders' ? (
      <section className="grid gap-3 p-4 text-white">
        <button type="button" data-action="account" className="text-left text-[#fed65b]">← Menü</button>
        <h1 className="text-lg font-bold">Sipariş Geçmişim</h1>
        <nav className="flex gap-3 text-[#fed65b]">
          <button type="button" data-action="active" aria-pressed={!history}>Aktif Sipariş</button>
          <button type="button" data-action="history" aria-pressed={history}>Geçmiş</button>
        </nav>
        {history || !order ? <p>Sipariş bulunmuyor.</p> : (
          <article className="grid gap-2 rounded-2xl border border-neutral-700 bg-neutral-900 p-4">
            <strong>Sipariş Alındı #8942</strong>
            <p>Masa {table} · {tl(order.total)}</p>
            <button type="button" data-action="tracking" className="rounded-xl bg-[#d4af37] p-2 text-black">Canlı Takip</button>
            <button type="button" data-action="repeat" className="rounded-xl bg-neutral-800 p-2">Tekrar Ver</button>
          </article>
        )}
      </section>
        ) : screen === 'recovery' ? (
      <section className="min-h-full bg-[#F8F9FA] text-[#191C1D]">
        <header className="flex items-center gap-2 bg-[#1A1A1A] px-4 py-3 text-white">
          <button
            type="button"
            data-action="login"
            aria-label="Giriş ekranına dön"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-neutral-800"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-sm">
              arrow_back
            </span>
          </button>
          <h1 className="min-w-0 flex-1 text-sm font-bold">Şifremi Unuttum</h1>
          <span className="shrink-0 text-xs font-bold text-[#FED65B]">
            Masa {table}
          </span>
        </header>

        <div className="px-4 py-5">
          <form
            className="space-y-4 rounded-2xl border border-[#DFE4E0] bg-white p-4"
            onSubmit={(event) => {
              event.preventDefault();
              setNotice('Demo modunda şifre sıfırlama e-postası gönderilemiyor.');
            }}
          >
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#002819] text-[#FED65B]">
              <span aria-hidden="true" className="material-symbols-outlined">
                lock_reset
              </span>
            </div>

            <div>
              <h2 className="text-base font-bold">Şifrenizi Sıfırlayın</h2>
              <p className="mt-1 text-sm text-[#59635D]">
                Hesabınıza kayıtlı e-posta adresini girin.
              </p>
            </div>

            <label className="block text-xs font-bold" htmlFor="recovery-email">
              E-posta Adresi
            </label>
            <input
              id="recovery-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="ornek@eposta.com"
              required
              className="min-h-11 w-full rounded-xl border border-[#DFE4E0] bg-[#F8F9FA] px-3 text-base outline-none focus:border-[#D4AF37]"
            />

            <button
              type="submit"
              className="min-h-11 w-full rounded-xl bg-[#D4AF37] px-4 py-2 text-sm font-bold text-[#1A1A1A]"
            >
              Sıfırlama Bağlantısı İste
            </button>

            <button
              type="button"
              data-action="login"
              className="min-h-10 w-full text-sm font-bold text-[#06402B]"
            >
              Giriş Ekranına Dön
            </button>
          </form>
        </div>
      </section>
    ) : screen === 'system' ? (
      <section className="p-4 text-white">
        <p>Bu ekranda canlı servis bağlantısı bulunmuyor.</p>
        <button type="button" data-action="menu" className="mt-3 rounded-xl bg-[#d4af37] p-2 text-black">Menüye Dön</button>
      </section>
    ) : <div key={screen} data-screen={screen} className="relative h-full">{views[screen]?.()}</div>}
  </main>
);
}
