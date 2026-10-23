/* Včelařský deník 5.3.3 – správa úlů s neměnným ID, evidence a zálohy. */
const DEFAULT_HIVES=[
 {id:'legacy-0',name:'Úl č. 1',place:'U domu',tag:'Včelstvo',archived:false},
 {id:'legacy-1',name:'Úl č. 2',place:'U domu',tag:'Včelstvo',archived:false},
 {id:'legacy-2',name:'Úl č. 3',place:'Lučany',tag:'Včelstvo',archived:false},
 {id:'legacy-3',name:'Úl č. 4',place:'Lučany',tag:'Včelstvo',archived:false}
];
const KEY='vcelarsky_denik_5_3_finance', OLD_KEY='vcelarsky_denik_5_2_expenses';
let hives=DEFAULT_HIVES.map(h=>({...h})), expenses=[],sales=[],events=[];
let chosenHive='legacy-0',recordType='Kontrola',status='V pořádku',page='home',storageOK=true,editHiveId=null;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const asMoney=n=>Math.round(Number(n)*100)/100;
const czk=n=>new Intl.NumberFormat('cs-CZ',{style:'currency',currency:'CZK',maximumFractionDigits:2}).format(n);
const validMoney=n=>Number.isFinite(n)&&n>0&&n<1000000000;
const yyyy_mm_dd=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const validDate=date=>/^\d{4}-\d{2}-\d{2}$/.test(String(date));
const uniqueId=()=>String(Date.now())+'-'+Math.random().toString(36).slice(2,10);
const activeHives=()=>hives.filter(h=>!h.archived);
const getHive=id=>hives.find(h=>h.id===id);
const costTotal=()=>asMoney(expenses.reduce((sum,x)=>sum+x.amount,0));
const salesTotal=()=>asMoney(sales.reduce((sum,x)=>sum+x.count*x.price,0));
const balance=()=>asMoney(salesTotal()-costTotal());
const hiveTotal=id=>asMoney(expenses.filter(e=>e.hive===id).reduce((s,e)=>s+e.amount,0));
const costsText=id=>expenses.some(e=>e.hive===id)?czk(hiveTotal(id)):'nezadáno';
function normalizeHive(h){
 if(!h||typeof h!=='object'||!String(h.id||'').trim()||!String(h.name||'').trim())return null;
 return {id:String(h.id).slice(0,90),name:String(h.name).trim().slice(0,70),place:String(h.place||'Bez stanoviště').trim().slice(0,70),tag:'Včelstvo',archived:!!h.archived};
}
function hiveRef(raw){
 if(raw===-1||raw==='-1'||raw==null)return '-1';
 if(typeof raw==='number'||/^\d+$/.test(String(raw))){const idx=Number(raw);return idx>=0?'legacy-'+idx:'-1'}
 return String(raw);
}
function normalizeCost(e){if(!e||!validMoney(Number(e.amount)))return null;const hive=hiveRef(e.hive);return {id:String(e.id||uniqueId()),hive:getHive(hive)?hive:'-1',category:String(e.category||'Ostatní'),amount:asMoney(e.amount),note:String(e.note||''),date:validDate(e.date)?String(e.date):yyyy_mm_dd(),source:String(e.source||'manual')};}
function normalizeSale(s){if(!s||!validMoney(Number(s.price))||!Number.isInteger(Number(s.count))||Number(s.count)<1||Number(s.count)>1000000)return null;return {id:String(s.id||uniqueId()),count:Number(s.count),price:asMoney(s.price),note:String(s.note||''),date:validDate(s.date)?String(s.date):yyyy_mm_dd(),source:String(s.source||'manual')};}
function normalizeEvent(e){if(!e||typeof e!=='object')return null;const type=String(e.type||'Poznámka').slice(0,60),hive=hiveRef(e.hiveId??e.hive);
 return {id:String(e.id||uniqueId()),hiveId:getHive(hive)?hive:null,oldHiveName:String(e.oldHiveName||e.hive||'').slice(0,80),type,note:String(e.note||'').slice(0,1000),date:validDate(e.date)?String(e.date):yyyy_mm_dd()};}
function readStored(){try{
 const data=JSON.parse(localStorage.getItem(KEY)||'null');
 if(data&&Array.isArray(data.expenses)&&Array.isArray(data.sales)){
  if(Array.isArray(data.hives)){const normalized=data.hives.map(normalizeHive).filter(Boolean);if(normalized.length&&new Set(normalized.map(x=>x.id)).size===normalized.length)hives=normalized;}
  expenses=data.expenses.map(normalizeCost).filter(Boolean);sales=data.sales.map(normalizeSale).filter(Boolean);
  events=Array.isArray(data.events)?data.events.map(normalizeEvent).filter(Boolean):[];
  chosenHive=activeHives()[0]?.id||null;
  return;
 }
 const old=JSON.parse(localStorage.getItem(OLD_KEY)||'null');
 if(Array.isArray(old)){expenses=old.map(e=>normalizeCost({...e,source:'manual'})).filter(Boolean);saveStored();}
 }catch(error){storageOK=false;console.warn('Úložiště není dostupné',error)}
}
function saveStored(){try{localStorage.setItem(KEY,JSON.stringify({version:4,hives,expenses,sales,events}));storageOK=true;return true}catch(error){storageOK=false;console.warn('Ukládání není dostupné',error);return false}}
function commitChange(rollback){if(saveStored())return true;rollback();alert('Prohlížeč nepovolil uložit změnu. Změna se neprovedla.');return false}
function getChosen(){return getHive(chosenHive)||activeHives()[0]||null}
function syncSelection(){if(!getHive(chosenHive)||getHive(chosenHive).archived)chosenHive=activeHives()[0]?.id||null}
function hiveHTML(h){return `<div class="hive-wrap"><button class="hive" data-hive="${esc(h.id)}" type="button"><div class="hivepic"><span class="flower">✣ &nbsp;· &nbsp;✿</span><svg class="art-icon" viewBox="0 0 150 130"><use href="#i-hive"/></svg></div><div class="hivecontent"><h3>${esc(h.name)}</h3><p>${esc(h.place)}</p><span class="tinylabel">✦ Včelstvo</span><span class="hivecost">Náklady: ${costsText(h.id)}</span></div></button><div class="hive-card-actions"><button type="button" data-edit-hive="${esc(h.id)}">Upravit</button><button type="button" class="subdued-danger" data-archive-hive="${esc(h.id)}">Odebrat</button></div></div>`}
function renderHiveCards(){
 const active=activeHives();
 $('home-hives').innerHTML=active.slice(0,2).map(hiveHTML).join('')||'<p class="cost-empty">Zatím nemáš žádné aktivní úly. Přidej první v záložce Úly.</p>';
 $('all-hives').innerHTML=active.map(hiveHTML).join('')||'<p class="cost-empty">Žádné aktivní úly.</p>';
 $('archived-hives').innerHTML=hives.filter(h=>h.archived).map(h=>`<div class="archive-item"><span><b>${esc(h.name)}</b><small>${esc(h.place)} · Náklady: ${costsText(h.id)}</small></span><button type="button" data-restore-hive="${esc(h.id)}">Obnovit úl</button></div>`).join('')||'<p class="muted-archives">Žádné odebrané úly.</p>';
 $('hive-count-stat').textContent=String(active.length);
 $('hives-heading-summary').textContent=active.length+' aktivních úlů · '+new Set(active.map(x=>x.place)).size+' stanovišť';
}
function costName(e){return e.hive==='-1'?'Společné výdaje':getHive(e.hive)?.name||'Neznámý úl'}
function renderCosts(){
 const cost=costTotal(),received=salesTotal(),diff=balance();
 $('stats-cost-total').textContent=czk(cost);$('stats-sales-total').textContent=czk(received);$('stats-net-total').textContent=czk(diff);
 $('stats-net-total').parentElement.classList.toggle('negative',diff<0);
 $('home-cost-summary').textContent=`Výdaje ${czk(cost)} · Tržby za med ${czk(received)} · Rozdíl ${czk(diff)}`;
 $('cost-total').textContent=czk(cost);$('sales-total').textContent=czk(received);$('net-total').textContent=czk(diff);
 $('net-total').closest('.result-tile').classList.toggle('negative',diff<0);
 $('cost-count').textContent=`${expenses.length} zapsaných výdajů`;
 $('sales-count').textContent=`${sales.length} prodejů · ${sales.reduce((s,x)=>s+x.count,0)} sklenic`;
 $('cost-by-hive').innerHTML=hives.map(h=>`<button class="cost-hive-item" type="button" data-cost-hive="${esc(h.id)}"><div class="cost-hive-icon">⬡</div><b>${esc(h.name)}${h.archived?' (odebraný)':''}</b><small>${esc(h.place)}</small><strong>${costsText(h.id)}</strong></button>`).join('')+`<button class="cost-hive-item" type="button" data-cost-hive="-1"><div class="cost-hive-icon">⬡</div><b>Společné výdaje</b><small>Medomet, sklenice a ostatní</small><strong>${czk(expenses.filter(e=>e.hive==='-1').reduce((s,e)=>s+e.amount,0))}</strong></button>`;
 $('cost-entries').innerHTML=[...expenses].sort((a,b)=>b.date.localeCompare(a.date)).map(e=>`<div class="cost-entry"><div class="cost-entry-main"><b>${esc(costName(e))} · ${esc(e.category)}</b><small>${esc(e.date)}${e.note?' · '+esc(e.note):''}${e.source!=='manual'?' · ze zálohy':''}</small></div><div class="cost-entry-right"><strong>${czk(e.amount)}</strong><button class="cost-remove" type="button" data-remove-cost="${esc(e.id)}">Smazat</button></div></div>`).join('')||'<div class="cost-empty">Zatím nejsou zapsané žádné výdaje.</div>';
 $('sale-entries').innerHTML=[...sales].sort((a,b)=>b.date.localeCompare(a.date)).map(s=>`<div class="cost-entry"><div class="cost-entry-main"><b>${s.count}× med · ${czk(s.price)}/ks</b><small>${esc(s.date)}${s.note?' · '+esc(s.note):''}${s.source!=='manual'?' · ze zálohy':''}</small></div><div class="cost-entry-right"><strong>${czk(asMoney(s.count*s.price))}</strong><button class="cost-remove" type="button" data-remove-sale="${esc(s.id)}">Smazat</button></div></div>`).join('')||'<div class="cost-empty">Zatím nejsou zapsané žádné prodeje medu.</div>';
 const existing=$('cost-hive').value;
 $('cost-hive').innerHTML='<option value="-1">Společný náklad (bez konkrétního úlu)</option>'+hives.map(h=>`<option value="${esc(h.id)}">${esc(h.name)}${h.archived?' (odebraný)':''} – ${esc(h.place)}</option>`).join('');
 $('cost-hive').value=existing&&([...hives.map(h=>h.id),'-1'].includes(existing))?existing:'-1';
 $('detail-cost-value').textContent=getChosen()?costsText(chosenHive):'—';
 if(!storageOK)$('import-message').textContent='Ukládání v prohlížeči je blokované. Pro jistotu exportuj JSON zálohu.';
 renderHiveCards();
}
const icon=name=>`<svg viewBox="0 0 24 24" width="18" height="18"><use href="#i-${name}"/></svg>`;
function renderHistory(){
 const html=events.map(e=>{const h=e.hiveId?getHive(e.hiveId):null;return `<div class="history-row"><div class="circle ${e.type==='Kontrola'?'green':''}">${icon(e.type==='Vytáčení'?'hex':e.type==='Krmení'?'drop':e.type==='Léčení'?'heart':'note')}</div><div><strong>${esc(e.type)} · ${esc(h?.name||e.oldHiveName||'Úl nezadán')}</strong><small>${esc(e.note||'Bez poznámky')}</small></div><span class="date">${esc(e.date)}</span></div>`}).join('')||'<p class="cost-empty">Zatím žádné uložené zápisy.</p>';
 $('mini-history').innerHTML=html;$('history-list').innerHTML=html;
}
function navigate(next){page=next;document.querySelectorAll('.page').forEach(el=>el.classList.toggle('active',el.id==='page-'+page));document.querySelectorAll('[data-page]').forEach(el=>el.classList.toggle('active',el.dataset.page===page));document.querySelectorAll('.bottomnav button').forEach(el=>el.classList.toggle('selected',el.dataset.page===page));window.scrollTo({top:0,behavior:'instant'});}
const types=['Kontrola','Krmení','Léčení','Vytáčení'],typeIcons=['note','drop','heart','hex'];
function renderTypes(){
 syncSelection();
 $('types').innerHTML=types.map((t,i)=>`<button class="type ${recordType===t?'selected':''}" data-type="${t}">${icon(typeIcons[i])}${t}</button>`).join('');
 $('hiveselect').innerHTML=activeHives().map(h=>`<button class="${chosenHive===h.id?'selected':''}" data-choose="${esc(h.id)}">${esc(h.name)}</button>`).join('')||'<p class="cost-empty">Nejdříve přidej úl v záložce Úly.</p>';
 $('save').disabled=!getChosen();
 $('quantity-wrap').style.display=recordType==='Krmení'||recordType==='Vytáčení'?'block':'none';$('statusselect').style.display=recordType==='Kontrola'?'flex':'none';
 $('quantity-wrap').querySelector('label').textContent=recordType==='Vytáčení'?'Množství medu (kg)':'Množství krmiva (kg)';
}
function renderDetail(){const h=getChosen();if(!h){navigate('hives');return;}chosenHive=h.id;$('detail-name').textContent=h.name;$('detail-place').textContent=h.place;$('detail-cost-value').textContent=costsText(h.id);}
function openHiveEditor(id=null){editHiveId=id;const h=id?getHive(id):null;if(id&&!h)return;
 $('hive-form-title').textContent=h?'Upravit úl':'Nový úl';$('hive-name').value=h?.name||'';$('hive-place').value=h?.place||'';$('hive-form-message').textContent='';$('hive-editor').hidden=false;navigate('hives');$('hive-name').focus();}
function closeHiveEditor(){editHiveId=null;$('hive-editor').hidden=true;$('hive-form-message').textContent='';$('hive-form').reset()}
function archiveHive(id){const h=getHive(id);if(!h||h.archived)return;if(!confirm(`Odebrat úl „${h.name}“ ze seznamu aktivních? Historie a náklady zůstanou zachované a úl lze později obnovit.`))return;h.archived=true;if(!commitChange(()=>h.archived=false))return;syncSelection();closeHiveEditor();renderAll();navigate('hives');}
function restoreHive(id){const h=getHive(id);if(!h||!h.archived)return;h.archived=false;if(!commitChange(()=>h.archived=true))return;chosenHive=h.id;renderAll();navigate('hives');}
function renderAll(){renderCosts();renderHistory();renderTypes();}
function updateSalePreview(){const count=Number($('sale-count').value),price=Number($('sale-price').value);$('sale-preview').textContent=Number.isInteger(count)&&count>0&&validMoney(price)?czk(asMoney(count*price)):'0 Kč'}
function exportBackup(){
 const blob=new Blob([JSON.stringify({type:'vcelarsky-denik-v5-3-3',version:4,createdAt:new Date().toISOString(),hives,expenses,sales,events},null,2)],{type:'application/json;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='vcelarsky-denik-zaloha-'+yyyy_mm_dd()+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
async function importBackup(file){const notice=$('import-message');notice.textContent='Načítám zálohu…';try{
 const raw=JSON.parse((await file.text()).replace(/^\uFEFF/,''));if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Soubor neobsahuje objekt JSON.');
 let newExpenses=[],newSales=[],newHives=null,newEvents=null,kind;
 if(raw.type==='vcelarsky-denik-v5-3-3'){
  if(!Array.isArray(raw.expenses)||!Array.isArray(raw.sales)||!Array.isArray(raw.hives)||!Array.isArray(raw.events))throw new Error('Neúplná záloha aplikace.');
  newHives=raw.hives.map(normalizeHive).filter(Boolean);
  if(newHives.length!==raw.hives.length||new Set(newHives.map(h=>h.id)).size!==newHives.length)throw new Error('V záloze jsou neplatné nebo duplicitní úly.');
  const oldHives=hives;hives=newHives;
  newExpenses=raw.expenses.map(normalizeCost).filter(Boolean);newSales=raw.sales.map(normalizeSale).filter(Boolean);newEvents=raw.events.map(normalizeEvent).filter(Boolean);
  hives=oldHives;kind='full';
 }else if(raw.type==='vcelarsky-denik-finance-v5-3'){
   if(!Array.isArray(raw.expenses)||!Array.isArray(raw.sales))throw new Error('Neúplná finanční záloha.');
   newExpenses=raw.expenses.map(normalizeCost).filter(Boolean);newSales=raw.sales.map(normalizeSale).filter(Boolean);kind='finance';
 }else if(raw.type==='vcelarsky-denik-naklady' && Array.isArray(raw.expenses)){
   newExpenses=raw.expenses.map(e=>normalizeCost({...e,source:'import-v52'})).filter(Boolean);kind='v52';
 }else if(Array.isArray(raw.expenses)&&Array.isArray(raw.jarSales)){
   kind='legacy';
   newExpenses=raw.expenses.map(e=>normalizeCost({id:'legacy-cost-'+e.id,hive:'-1',category:e.category||'Ostatní',amount:e.cost,note:e.name?`${e.name}${e.note?' – '+e.note:''}`:e.note,date:e.date,source:'legacy'})).filter(Boolean);
   newSales=raw.jarSales.map(e=>normalizeSale({id:'legacy-sale-'+e.id,count:e.count,price:e.price,date:e.date,note:e.honeyType||'',source:'legacy'})).filter(Boolean);
 }else throw new Error('Soubor není rozpoznanou zálohou včelařského deníku.');
 if(kind!=='full'&&newExpenses.length===0&&newSales.length===0)throw new Error('V záloze nejsou žádné finanční položky. Ostatní údaje ze starého deníku nelze importovat.');
 const message=kind==='full'?`Obnovit celou zálohu? ${newHives.length} úlů, ${newEvents.length} zápisů, ${newExpenses.length} výdajů a ${newSales.length} prodejů. Současná data aplikace se nahradí.`:kind==='finance'?`Obnovit ${newExpenses.length} výdajů a ${newSales.length} prodejů? Úly a zápisy zůstanou, ale současné finance se nahradí.`:`Načíst ${newExpenses.length} výdajů a ${newSales.length} prodejů? Dříve importované položky stejného typu se nahradí, ruční zůstanou.`;
 if(!confirm(message)){notice.textContent='Import byl zrušen.';return;}
 const prev={hives,expenses,sales,events};
 if(kind==='full'){hives=newHives;expenses=newExpenses;sales=newSales;events=newEvents;}
 else if(kind==='finance'){expenses=newExpenses;sales=newSales;}
 else {const src=kind==='legacy'?'legacy':'import-v52';expenses=[...expenses.filter(x=>x.source!==src),...newExpenses];if(kind==='legacy')sales=[...sales.filter(x=>x.source!=='legacy'),...newSales];}
 if(!saveStored()){hives=prev.hives;expenses=prev.expenses;sales=prev.sales;events=prev.events;throw new Error('Prohlížeč nedovolil uložit data. Nic se nepřepsalo.');}
 syncSelection();closeHiveEditor();renderAll();notice.textContent=kind==='full'?`Obnova celé aplikace proběhla. Úly: ${newHives.length}; zápisy: ${newEvents.length}; výdaje: ${newExpenses.length}; prodeje: ${newSales.length}.`:`Finanční obnova proběhla. Výdaje: ${newExpenses.length}; prodeje: ${newSales.length}. Rozdíl: ${czk(balance())}.`;
 }catch(err){notice.textContent='Import se nezdařil: '+err.message;}finally{$('import-finance').value='';}
}

document.addEventListener('click',event=>{
 const x=event.target.closest('button');if(!x)return;
 if(x.dataset.editHive!==undefined){openHiveEditor(x.dataset.editHive);return;}
 if(x.dataset.archiveHive!==undefined){archiveHive(x.dataset.archiveHive);return;}
 if(x.dataset.restoreHive!==undefined){restoreHive(x.dataset.restoreHive);return;}
 if(x.id==='add-hive-button'){openHiveEditor();return;}
 if(x.id==='hive-cancel'){closeHiveEditor();return;}
 if(x.id==='edit-detail-hive'){openHiveEditor(chosenHive);return;}
 if(x.dataset.costHive!==undefined){$('cost-hive').value=x.dataset.costHive;$('cost-amount').focus();return;}
 if(x.dataset.removeCost!==undefined){const old=expenses;const item=expenses.find(v=>v.id===x.dataset.removeCost);if(!item||!confirm('Opravdu smazat tento výdaj?'))return;expenses=expenses.filter(v=>v.id!==x.dataset.removeCost);if(!commitChange(()=>expenses=old))return;renderAll();return;}
 if(x.dataset.removeSale!==undefined){const old=sales;const item=sales.find(v=>v.id===x.dataset.removeSale);if(!item||!confirm('Opravdu smazat tento prodej?'))return;sales=sales.filter(v=>v.id!==x.dataset.removeSale);if(!commitChange(()=>sales=old))return;renderAll();return;}
 if(x.dataset.page){if(x.dataset.page==='costs'&&page==='detail')$('cost-hive').value=String(chosenHive);navigate(x.dataset.page);return;}
 if(x.dataset.action==='record'){renderTypes();navigate('record');return;}
 if(x.dataset.hive!==undefined){chosenHive=x.dataset.hive;renderDetail();navigate('detail');renderTypes();return;}
 if(x.dataset.choose!==undefined){chosenHive=x.dataset.choose;renderTypes();return;}
 if(x.dataset.type){recordType=x.dataset.type;renderTypes();navigate('record');return;}
 if(x.dataset.status){status=x.dataset.status;document.querySelectorAll('[data-status]').forEach(b=>b.classList.toggle('selected',b.dataset.status===status));return;}
 if(x.id==='save'){
   if(!getChosen()||getChosen().archived){alert('Nejdříve vyber aktivní úl.');return;}
   const note=$('recnote').value.trim(),q=$('quantity').value.trim();
   const old=events;
   events=[{id:uniqueId(),type:recordType,hiveId:chosenHive,oldHiveName:getChosen().name,note:note||((recordType==='Krmení'||recordType==='Vytáčení')&&q?`${q} kg`:recordType==='Kontrola'?status:'Bez poznámky'),date:yyyy_mm_dd()},...events];
   if(!commitChange(()=>events=old))return;
   renderHistory();$('recnote').value='';$('quantity').value='';$('toast').textContent='Zápis byl uložen do deníku.';$('toast').style.display='block';setTimeout(()=>$('toast').style.display='none',3200);
 }
});
$('hive-form').addEventListener('submit',ev=>{
 ev.preventDefault();const name=$('hive-name').value.trim(),place=$('hive-place').value.trim();
 if(!name||!place){$('hive-form-message').textContent='Vyplň název a stanoviště úlu.';return;}
 if(hives.some(h=>h.id!==editHiveId&&h.name.toLocaleLowerCase('cs')===name.toLocaleLowerCase('cs'))){$('hive-form-message').textContent='Tento název už používá jiný úl. Zadej jiný.';return;}
 const previous=hives.map(h=>({...h}));
 if(editHiveId){const h=getHive(editHiveId);if(!h)return;h.name=name;h.place=place;}
 else {const h={id:'h-'+uniqueId(),name,place,tag:'Včelstvo',archived:false};hives.push(h);chosenHive=h.id;}
 if(!commitChange(()=>hives=previous))return;
 closeHiveEditor();renderAll();navigate('hives');
});
$('cost-form').addEventListener('submit',ev=>{ev.preventDefault();const hive=$('cost-hive').value,amount=Number($('cost-amount').value),date=$('cost-date').value;if((hive!=='-1'&&!getHive(hive))||!validMoney(amount)||!validDate(date)){$('cost-message').textContent='Zadej správné údaje o výdaji.';return;}const entry={id:uniqueId(),hive,category:$('cost-category').value,amount:asMoney(amount),note:$('cost-note').value.trim(),date,source:'manual'};expenses.unshift(entry);if(!saveStored()){expenses.shift();$('cost-message').textContent='Ukládání je blokované, výdaj se nezapsal.';return;}$('cost-amount').value='';$('cost-note').value='';$('cost-message').textContent='Uložen výdaj '+czk(entry.amount)+'.';renderAll();});
$('sale-form').addEventListener('submit',ev=>{ev.preventDefault();const count=Number($('sale-count').value),price=Number($('sale-price').value),date=$('sale-date').value;if(!Number.isInteger(count)||count<1||count>1000000||!validMoney(price)||!validDate(date)){$('sale-message').textContent='Zadej počet sklenic, cenu za kus a datum.';return;}const entry={id:uniqueId(),count,price:asMoney(price),note:$('sale-note').value.trim(),date,source:'manual'};sales.unshift(entry);if(!saveStored()){sales.shift();$('sale-message').textContent='Ukládání je blokované, prodej se nezapsal.';return;}$('sale-count').value='1';$('sale-note').value='';$('sale-message').textContent=`Zapsán prodej ${count} sklenic za ${czk(count*price)}.`;updateSalePreview();renderAll();});
$('sale-count').addEventListener('input',updateSalePreview);$('sale-price').addEventListener('input',updateSalePreview);
$('export-finance').addEventListener('click',exportBackup);
$('import-finance').addEventListener('change',e=>{if(e.target.files?.[0])importBackup(e.target.files[0]);});
readStored();syncSelection();$('cost-date').value=yyyy_mm_dd();$('sale-date').value=yyyy_mm_dd();renderAll();updateSalePreview();
