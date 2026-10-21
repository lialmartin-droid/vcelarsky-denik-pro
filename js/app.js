const hives=[{name:'Úl č. 1',place:'U domu',tag:'Včelstvo'},{name:'Úl č. 2',place:'U domu',tag:'Včelstvo'},{name:'Úl č. 3',place:'Lučany',tag:'Včelstvo'},{name:'Úl č. 4',place:'Lučany',tag:'Včelstvo'}];
let page='home',chosenHive=0,recordType='Kontrola',status='V pořádku';
const events=[{type:'Kontrola',hive:'Úl č. 1',note:'Ukázková kontrola',date:'Ukázka'},{type:'Krmení',hive:'Úl č. 3',note:'Ukázkový záznam krmení',date:'Ukázka'}];
const KEY='vcelarsky_denik_5_3_finance',OLD_KEY='vcelarsky_denik_5_2_expenses';
let expenses=[],sales=[],storageOK=true;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const asMoney=n=>Math.round(Number(n)*100)/100;
const czk=n=>new Intl.NumberFormat('cs-CZ',{style:'currency',currency:'CZK',maximumFractionDigits:2}).format(n);
const validMoney=n=>Number.isFinite(n)&&n>0&&n<1000000000;
const validHive=h=>Number.isInteger(h)&&h>=-1&&h<hives.length;
const yyyy_mm_dd=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const validDate=date=>/^\d{4}-\d{2}-\d{2}$/.test(String(date));
const costTotal=()=>asMoney(expenses.reduce((sum,x)=>sum+x.amount,0));
const salesTotal=()=>asMoney(sales.reduce((sum,x)=>sum+x.count*x.price,0));
const balance=()=>asMoney(salesTotal()-costTotal());
const hiveTotal=i=>asMoney(expenses.filter(e=>e.hive===i).reduce((s,e)=>s+e.amount,0));
const costsText=i=>expenses.some(e=>e.hive===i)?czk(hiveTotal(i)):'nezadáno';
const uniqueId=()=>String(Date.now())+'-'+Math.random().toString(36).slice(2,10);
function normalizeCost(e){if(!e||!validMoney(Number(e.amount)))return null;const hive=Number(e.hive);return {id:String(e.id||uniqueId()),hive:validHive(hive)?hive:-1,category:String(e.category||'Ostatní'),amount:asMoney(e.amount),note:String(e.note||''),date:String(e.date||yyyy_mm_dd()),source:String(e.source||'manual')};}
function normalizeSale(s){if(!s||!validMoney(Number(s.price))||!Number.isInteger(Number(s.count))||Number(s.count)<1||Number(s.count)>1000000)return null;return {id:String(s.id||uniqueId()),count:Number(s.count),price:asMoney(s.price),note:String(s.note||''),date:String(s.date||yyyy_mm_dd()),source:String(s.source||'manual')};}
function readStored(){try{const data=JSON.parse(localStorage.getItem(KEY)||'null');if(data&&Array.isArray(data.expenses)&&Array.isArray(data.sales)){expenses=data.expenses.map(normalizeCost).filter(Boolean);sales=data.sales.map(normalizeSale).filter(Boolean);return}const old=JSON.parse(localStorage.getItem(OLD_KEY)||'null');if(Array.isArray(old)){expenses=old.map(e=>normalizeCost({...e,source:'manual'})).filter(Boolean);sales=[];saveStored()}}catch(error){storageOK=false;console.warn('Úložiště není dostupné',error)}}
function saveStored(){try{localStorage.setItem(KEY,JSON.stringify({version:3,expenses,sales}));storageOK=true;return true}catch(error){storageOK=false;console.warn('Ukládání není dostupné',error);return false}}
function renderHiveCards(){$('home-hives').innerHTML=hives.slice(0,2).map(hiveHTML).join('');$('all-hives').innerHTML=hives.map(hiveHTML).join('')}
function hiveHTML(h,i){return `<button class="hive" data-hive="${i}"><div class="hivepic ${i>1?'night':''}"><span class="flower">✣ &nbsp;· &nbsp;✿</span><svg class="art-icon" viewBox="0 0 150 130"><use href="#i-hive"/></svg></div><div class="hivecontent"><h3>${esc(h.name)}</h3><p>${esc(h.place)}</p><span class="tinylabel">✦ ${esc(h.tag)}</span><span class="hivecost">Náklady: ${costsText(i)}</span></div></button>`}
function costName(e){return e.hive===-1?'Společné výdaje':hives[e.hive]?.name||'Neznámý úl'}
function renderCosts(){
 const cost=costTotal(),received=salesTotal(),diff=balance();
 $('stats-cost-total').textContent=czk(cost);$('stats-sales-total').textContent=czk(received);$('stats-net-total').textContent=czk(diff);
 $('stats-net-total').parentElement.classList.toggle('negative',diff<0);
 $('home-cost-summary').textContent=`Výdaje ${czk(cost)} · Tržby za med ${czk(received)} · Rozdíl ${czk(diff)}`;
 $('cost-total').textContent=czk(cost);$('sales-total').textContent=czk(received);$('net-total').textContent=czk(diff);
 $('net-total').closest('.result-tile').classList.toggle('negative',diff<0);
 $('cost-count').textContent=`${expenses.length} zapsaných výdajů`;
 $('sales-count').textContent=`${sales.length} prodejů · ${sales.reduce((s,x)=>s+x.count,0)} sklenic`;
 $('cost-by-hive').innerHTML=hives.map((h,i)=>`<button class="cost-hive-item" type="button" data-cost-hive="${i}"><div class="cost-hive-icon">⬡</div><b>${esc(h.name)}</b><small>${esc(h.place)}</small><strong>${costsText(i)}</strong></button>`).join('')+`<button class="cost-hive-item" type="button" data-cost-hive="-1"><div class="cost-hive-icon">⬡</div><b>Společné výdaje</b><small>Medomet, sklenice a ostatní</small><strong>${czk(expenses.filter(e=>e.hive===-1).reduce((s,e)=>s+e.amount,0))}</strong></button>`;
 const orderedCosts=[...expenses].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
 $('cost-entries').innerHTML=orderedCosts.map(e=>`<div class="cost-entry"><div class="cost-entry-main"><b>${esc(costName(e))} · ${esc(e.category)}</b><small>${esc(e.date)}${e.note?' · '+esc(e.note):''}${e.source!=='manual'?' · ze zálohy':''}</small></div><div class="cost-entry-right"><strong>${czk(e.amount)}</strong><button class="cost-remove" type="button" data-remove-cost="${esc(e.id)}">Smazat</button></div></div>`).join('')||'<div class="cost-empty">Zatím nejsou zapsané žádné výdaje.</div>';
 $('sale-entries').innerHTML=[...sales].sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(s=>`<div class="cost-entry"><div class="cost-entry-main"><b>${s.count}× med · ${czk(s.price)}/ks</b><small>${esc(s.date)}${s.note?' · '+esc(s.note):''}${s.source!=='manual'?' · ze zálohy':''}</small></div><div class="cost-entry-right"><strong>${czk(asMoney(s.count*s.price))}</strong><button class="cost-remove" type="button" data-remove-sale="${esc(s.id)}">Smazat</button></div></div>`).join('')||'<div class="cost-empty">Zatím nejsou zapsané žádné prodeje medu.</div>';
 $('detail-cost-value').textContent=costsText(chosenHive);
 if(!storageOK)$('import-message').textContent='Ukládání v prohlížeči je blokované. Pro jistotu exportuj JSON zálohu.';
 renderHiveCards();
}
const icon=name=>`<svg viewBox="0 0 24 24" width="18" height="18"><use href="#i-${name}"/></svg>`;
function renderHistory(){const html=events.map(e=>`<div class="history-row"><div class="circle ${e.type==='Kontrola'?'green':''}">${icon(e.type==='Vytáčení'?'hex':e.type==='Krmení'?'drop':e.type==='Léčení'?'heart':'note')}</div><div><strong>${esc(e.type)} · ${esc(e.hive)}</strong><small>${esc(e.note||'Bez poznámky')}</small></div><span class="date">${esc(e.date)}</span></div>`).join('');$('mini-history').innerHTML=html;$('history-list').innerHTML=html}
function navigate(next){page=next;document.querySelectorAll('.page').forEach(el=>el.classList.toggle('active',el.id==='page-'+page));document.querySelectorAll('[data-page]').forEach(el=>el.classList.toggle('active',el.dataset.page===page));document.querySelectorAll('.bottomnav button').forEach(el=>el.classList.toggle('selected',el.dataset.page===page));window.scrollTo({top:0,behavior:'instant'})}
const types=['Kontrola','Krmení','Léčení','Vytáčení'];const typeIcons=['note','drop','heart','hex'];
function renderTypes(){$('types').innerHTML=types.map((t,i)=>`<button class="type ${recordType===t?'selected':''}" data-type="${t}">${icon(typeIcons[i])}${t}</button>`).join('');$('hiveselect').innerHTML=hives.map((h,i)=>`<button class="${chosenHive===i?'selected':''}" data-choose="${i}">${esc(h.name)}</button>`).join('');$('quantity-wrap').style.display=recordType==='Krmení'||recordType==='Vytáčení'?'block':'none';$('statusselect').style.display=recordType==='Kontrola'?'flex':'none';$('quantity-wrap').querySelector('label').textContent=recordType==='Vytáčení'?'Množství medu (kg)':'Množství krmiva (kg)'}
function updateSalePreview(){const count=Number($('sale-count').value),price=Number($('sale-price').value);$('sale-preview').textContent=Number.isInteger(count)&&count>0&&validMoney(price)?czk(asMoney(count*price)):'0 Kč'}
function exportBackup(){const blob=new Blob([JSON.stringify({type:'vcelarsky-denik-finance-v5-3',version:3,createdAt:new Date().toISOString(),expenses,sales},null,2)],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='vcelarsky-denik-finance-'+yyyy_mm_dd()+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
async function importBackup(file){const notice=$('import-message');try{
 const raw=JSON.parse((await file.text()).replace(/^\uFEFF/,''));if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Soubor neobsahuje objekt JSON.');
 let newExpenses=[],newSales=[],kind;
 if(raw.type==='vcelarsky-denik-finance-v5-3'){
   if(!Array.isArray(raw.expenses)||!Array.isArray(raw.sales))throw new Error('Neúplná finanční záloha.');
   newExpenses=raw.expenses.map(normalizeCost).filter(Boolean);newSales=raw.sales.map(normalizeSale).filter(Boolean);kind='full';
 }else if(raw.type==='vcelarsky-denik-naklady' && Array.isArray(raw.expenses)){
   newExpenses=raw.expenses.map(e=>normalizeCost({...e,source:'import-v52'})).filter(Boolean);kind='v52';
 }else if(Array.isArray(raw.expenses)&&Array.isArray(raw.jarSales)){
   kind='legacy';
   newExpenses=raw.expenses.map(e=>normalizeCost({id:'legacy-cost-'+e.id,hive:-1,category:e.category||'Ostatní',amount:e.cost,note:e.name?`${e.name}${e.note?' – '+e.note:''}`:e.note,date:e.date,source:'legacy'})).filter(Boolean);
   newSales=raw.jarSales.map(e=>normalizeSale({id:'legacy-sale-'+e.id,count:e.count,price:e.price,date:e.date,note:e.honeyType||'',source:'legacy'})).filter(Boolean);
 }else throw new Error('Soubor není rozpoznanou zálohou včelařského deníku.');
 if(newExpenses.length===0&&newSales.length===0)throw new Error('V záloze nejsou žádné finanční položky.');
 const message=kind==='full'?`Obnovit ${newExpenses.length} výdajů a ${newSales.length} prodejů? Aktuální finanční data se nahradí zálohou.`:`Načíst ${newExpenses.length} výdajů a ${newSales.length} prodejů? Dříve importované položky ze stejného typu zálohy se nahradí, ručně přidané zůstanou.`;
 if(!confirm(message))return;
 const prevExp=expenses,prevSales=sales;
 if(kind==='full'){expenses=newExpenses;sales=newSales}else{const src=kind==='legacy'?'legacy':'import-v52';expenses=[...expenses.filter(x=>x.source!==src),...newExpenses];if(kind==='legacy')sales=[...sales.filter(x=>x.source!=='legacy'),...newSales]}
 if(!saveStored()){expenses=prevExp;sales=prevSales;throw new Error('Prohlížeč nedovolil uložit data. Nic se nepřepsalo.');}
 renderCosts();notice.textContent=`Načtené výdaje: ${newExpenses.length}; prodeje: ${newSales.length}. Celkový rozdíl: ${czk(balance())}.`;
 }catch(err){notice.textContent='Import se nezdařil: '+err.message;}finally{$('import-finance').value=''}}
const costHiveSelect=$('cost-hive');
costHiveSelect.innerHTML='<option value="-1">Společný náklad (bez konkrétního úlu)</option>'+hives.map((h,i)=>`<option value="${i}">${esc(h.name)} – ${esc(h.place)}</option>`).join('');
$('cost-hive').value='-1';$('cost-date').value=yyyy_mm_dd();$('sale-date').value=yyyy_mm_dd();
document.addEventListener('click',event=>{
 const x=event.target.closest('button');if(!x)return;
 if(x.dataset.costHive!==undefined){chosenHive=Number(x.dataset.costHive);$('cost-hive').value=String(chosenHive);$('cost-amount').focus();return;}
 if(x.dataset.removeCost!==undefined){const key=x.dataset.removeCost,item=expenses.find(v=>v.id===key);if(!item||!confirm('Opravdu smazat tento výdaj?'))return;const old=expenses;expenses=expenses.filter(v=>v.id!==key);if(!saveStored()){expenses=old;alert('Zápis se nepodařilo uložit.');return}renderCosts();return;}
 if(x.dataset.removeSale!==undefined){const key=x.dataset.removeSale,item=sales.find(v=>v.id===key);if(!item||!confirm('Opravdu smazat tento prodej?'))return;const old=sales;sales=sales.filter(v=>v.id!==key);if(!saveStored()){sales=old;alert('Zápis se nepodařilo uložit.');return}renderCosts();return;}
 if(x.dataset.page){if(x.dataset.page==='costs'&&page==='detail')$('cost-hive').value=String(chosenHive);navigate(x.dataset.page);return;}
 if(x.dataset.action==='record'){navigate('record');return;}
 if(x.dataset.hive!==undefined){chosenHive=Number(x.dataset.hive);$('detail-name').textContent=hives[chosenHive].name;$('detail-place').textContent=hives[chosenHive].place;$('detail-cost-value').textContent=costsText(chosenHive);navigate('detail');renderTypes();return;}
 if(x.dataset.choose!==undefined){chosenHive=Number(x.dataset.choose);renderTypes();return;}
 if(x.dataset.type){recordType=x.dataset.type;navigate('record');renderTypes();return;}
 if(x.dataset.status){status=x.dataset.status;document.querySelectorAll('[data-status]').forEach(b=>b.classList.toggle('selected',b.dataset.status===status));return;}
 if(x.id==='save'){const note=$('recnote').value.trim(),q=$('quantity').value.trim();events.unshift({type:recordType,hive:hives[chosenHive].name,note:note||((recordType==='Krmení'||recordType==='Vytáčení')&&q?`${q} kg`:recordType==='Kontrola'?status:'Bez poznámky'),date:'Ukázka'});renderHistory();$('recnote').value='';$('quantity').value='';$('toast').textContent='Ukázkový zápis přidán do náhledu historie (neukládá se trvale).';$('toast').style.display='block';setTimeout(()=>$('toast').style.display='none',3200);}
});
$('cost-form').addEventListener('submit',ev=>{ev.preventDefault();const hive=Number($('cost-hive').value),amount=Number($('cost-amount').value),date=$('cost-date').value;if(!validHive(hive)||!validMoney(amount)||!validDate(date)){$('cost-message').textContent='Zadej správné údaje o výdaji.';return}const entry={id:uniqueId(),hive,category:$('cost-category').value,amount:asMoney(amount),note:$('cost-note').value.trim(),date,source:'manual'};expenses.unshift(entry);if(!saveStored()){expenses.shift();$('cost-message').textContent='Ukládání je blokované, výdaj se nezapsal.';return;}$('cost-amount').value='';$('cost-note').value='';$('cost-message').textContent='Uložen výdaj '+czk(entry.amount)+'.';renderCosts()});
$('sale-form').addEventListener('submit',ev=>{ev.preventDefault();const count=Number($('sale-count').value),price=Number($('sale-price').value),date=$('sale-date').value;if(!Number.isInteger(count)||count<1||count>1000000||!validMoney(price)||!validDate(date)){$('sale-message').textContent='Zadej počet sklenic, cenu za kus a datum.';return}const entry={id:uniqueId(),count,price:asMoney(price),note:$('sale-note').value.trim(),date,source:'manual'};sales.unshift(entry);if(!saveStored()){sales.shift();$('sale-message').textContent='Ukládání je blokované, prodej se nezapsal.';return;}$('sale-count').value='1';$('sale-note').value='';$('sale-message').textContent=`Zapsán prodej ${count} sklenic za ${czk(count*price)}.`;updateSalePreview();renderCosts()});
$('sale-count').addEventListener('input',updateSalePreview);$('sale-price').addEventListener('input',updateSalePreview);
$('export-finance').addEventListener('click',exportBackup);
$('import-finance').addEventListener('change',e=>{if(e.target.files?.[0])importBackup(e.target.files[0])});
readStored();renderHistory();renderTypes();renderCosts();updateSalePreview();
