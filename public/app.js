'use strict';
const $=s=>document.querySelector(s),KEY='primorje-codes',stat={confirmed:'potvrđena',cancelled:'otkazana',completed:'završena'};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=d=>new Date(d).toLocaleDateString('sr-Latn-ME'),days=(a,b)=>Math.round((new Date(b)-new Date(a))/864e5)+1;
const codes=()=>{try{return JSON.parse(localStorage.getItem(KEY))||[]}catch{return[]}},setCodes=c=>{try{localStorage.setItem(KEY,JSON.stringify(c))}catch{}};
async function api(u,o){const r=await fetch(u,o),d=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(d.error||'Greška na serveru.'),{status:r.status});return d}
let CARS=[],pick=null;
$('#from').min=$('#to').min=new Date().toISOString().slice(0,10);
const valid=()=>{const f=$('#from').value,t=$('#to').value;return f&&t&&t>=f?{f,t,n:days(f,t)}:null};
async function loadCars(){const r=valid();try{CARS=await api('/api/cars'+(r?`?from=${r.f}&to=${r.t}`:''))}catch(e){$('#grid').innerHTML=`<p class="err">${esc(e.message)}</p>`;return}render()}
$('#from').addEventListener('change',()=>{$('#to').min=$('#from').value;if($('#to').value<$('#from').value)$('#to').value=$('#from').value;loadCars()});
$('#to').addEventListener('change',loadCars);
const svg=c=>`<svg viewBox="0 0 240 90" role="img" aria-label="Automobil"><path d="M12 62l10-22c3-7 8-10 15-12l48-4c10-1 17 1 24 6l26 10 34 4c20 3 33 9 33 18v4H12z" fill="${esc(c)}"/><circle cx="62" cy="68" r="14" fill="#13202b"/><circle cx="62" cy="68" r="6" fill="#d3d9d6"/><circle cx="186" cy="68" r="14" fill="#13202b"/><circle cx="186" cy="68" r="6" fill="#d3d9d6"/><path d="M80 32l20 0 22 11H70z" fill="#fff" opacity=".55"/></svg>`;
function render(){
  const cat=$('#f-cat').value,tr=$('#f-tr').value,max=+$('#f-price').value,r=valid();$('#f-out').textContent=max+' €';
  $('#range-msg').textContent=r?`${r.n} ${r.n===1?'dan':'dana'}: ${fmt(r.f)} – ${fmt(r.t)}`:'Izaberite datume da vidite slobodna vozila i ukupnu cijenu.';
  const list=CARS.filter(c=>(!cat||c.cat===cat)&&(!tr||c.tr===tr)&&c.price<=max);
  $('#grid').innerHTML=list.length?list.map(c=>`<article class="car ${c.busy?'busy':''}">${svg(c.color)}<h3>${esc(c.name)}</h3><div class="meta">${esc(c.cat)} · ${esc(c.tr)} · ${c.seats} sjedišta · ${esc(c.fuel)}</div>
    <div class="foot"><div class="price">${c.price} €<small> / dan</small>${r?`<div class="meta">Ukupno ${c.price*r.n} €</div>`:''}</div>${c.busy?'<span class="tag">Zauzeto u izabranom periodu</span>':`<button class="btn" data-id="${c.id}">Rezerviši</button>`}</div></article>`).join('')
    :'<p>Nijedno vozilo ne odgovara filterima. Povećajte maksimalnu cijenu ili promijenite kategoriju.</p>';
}
['#f-cat','#f-tr','#f-price'].forEach(s=>$(s).addEventListener('input',render));
$('#search').addEventListener('submit',e=>{e.preventDefault();loadCars();$('#flota').scrollIntoView({behavior:'smooth'})});
$('#grid').addEventListener('click',e=>{const id=e.target.dataset.id;if(!id)return;const r=valid();
  if(!r){$('#range-msg').textContent='Prvo izaberite datume preuzimanja i vraćanja.';$('#from').focus();return}
  pick=CARS.find(c=>c.id==id);$('#d-title').textContent=pick.name;
  $('#d-sum').textContent=`${fmt(r.f)} – ${fmt(r.t)}, ${r.n} ${r.n===1?'dan':'dana'}, ${$('#loc').value}. Ukupno ${pick.price*r.n} €.`;$('#d-err').textContent='';$('#dlg').showModal()});
$('#d-cancel').addEventListener('click',()=>$('#dlg').close());
$('#book').addEventListener('submit',async e=>{e.preventDefault();const r=valid(),fd=new FormData(e.target);if(!r||!pick)return;
  try{const b=await api('/api/bookings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({car_id:pick.id,from:r.f,to:r.t,loc:$('#loc').value,name:fd.get('name'),email:fd.get('email'),phone:fd.get('phone')})});
    setCodes([...codes(),b.code]);$('#dlg').close();e.target.reset();await loadCars();await renderBookings();$('#rezervacije').scrollIntoView({behavior:'smooth'})}
  catch(x){$('#d-err').textContent=x.message;if(x.status===409)loadCars()}});
async function renderBookings(){
  const all=codes(),list=await Promise.all(all.map(c=>api('/api/bookings/'+c).catch(e=>e.status===404?null:undefined)));
  const keep=all.filter((c,i)=>list[i]!==null);if(keep.length!==all.length)setCodes(keep);
  const rows=list.filter(Boolean);
  $('#bookings').innerHTML=rows.length?rows.map(b=>`<div class="bk"><div><strong>${esc(b.car)}</strong> · šifra ${esc(b.code)}<br>${fmt(b.from)} – ${fmt(b.to)}, ${esc(b.loc)}<br>${esc(b.name)}, ${stat[b.status]||''}</div><div>${b.total} € ${b.status==='confirmed'?`<button data-del="${esc(b.code)}">Otkaži</button>`:''}</div></div>`).join(''):'<p>Nemate rezervacija. Izaberite datume i vozilo da počnete.</p>';
}
$('#bookings').addEventListener('click',async e=>{const c=e.target.dataset.del;if(!c)return;try{await api('/api/bookings/'+c,{method:'DELETE'})}catch{}await loadCars();renderBookings()});
loadCars();renderBookings();
