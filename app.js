'use strict';
const CARS=[
 {id:1,name:'Fiat Panda',cat:'Ekonomik',tr:'Manuelni',seats:4,fuel:'Benzin',price:24,color:'#e8a33d'},
 {id:2,name:'Škoda Fabia',cat:'Ekonomik',tr:'Manuelni',seats:5,fuel:'Benzin',price:28,color:'#6a8fa8'},
 {id:3,name:'VW Golf 8',cat:'Kompakt',tr:'Automatik',seats:5,fuel:'Dizel',price:45,color:'#2f3a46'},
 {id:4,name:'Peugeot 308',cat:'Kompakt',tr:'Manuelni',seats:5,fuel:'Dizel',price:38,color:'#a4281f'},
 {id:5,name:'Dacia Duster',cat:'SUV',tr:'Manuelni',seats:5,fuel:'Dizel',price:52,color:'#6b7a4f'},
 {id:6,name:'Toyota RAV4 Hybrid',cat:'SUV',tr:'Automatik',seats:5,fuel:'Hibrid',price:78,color:'#c9cfcb'},
 {id:7,name:'BMW 320d',cat:'Premium',tr:'Automatik',seats:5,fuel:'Dizel',price:95,color:'#0e5a8a'},
 {id:8,name:'Mercedes C 220',cat:'Premium',tr:'Automatik',seats:5,fuel:'Dizel',price:110,color:'#13202b'}
];
const $=s=>document.querySelector(s);
const KEY='primorje-bookings';
const load=()=>{try{return JSON.parse(localStorage.getItem(KEY))||[]}catch{return[]}};
const save=b=>{try{localStorage.setItem(KEY,JSON.stringify(b))}catch{}};
let bookings=load(), pick=null;

const today=new Date().toISOString().slice(0,10);
$('#from').min=$('#to').min=today;
$('#from').addEventListener('change',()=>{$('#to').min=$('#from').value||today;if($('#to').value<$('#from').value)$('#to').value=$('#from').value;render()});
$('#to').addEventListener('change',render);

const days=(a,b)=>Math.round((new Date(b)-new Date(a))/864e5)+1;
const valid=()=>{const f=$('#from').value,t=$('#to').value;return f&&t&&t>=f?{f,t,n:days(f,t)}:null};
const busy=(id,f,t)=>bookings.some(b=>b.car===id&&!(t<b.from||f>b.to));
const fmt=d=>new Date(d).toLocaleDateString('sr-Latn-ME');

const svg=c=>`<svg viewBox="0 0 240 90" role="img" aria-label="Automobil"><path d="M12 62l10-22c3-7 8-10 15-12l48-4c10-1 17 1 24 6l26 10 34 4c20 3 33 9 33 18v4H12z" fill="${c}"/><circle cx="62" cy="68" r="14" fill="#13202b"/><circle cx="62" cy="68" r="6" fill="#d3d9d6"/><circle cx="186" cy="68" r="14" fill="#13202b"/><circle cx="186" cy="68" r="6" fill="#d3d9d6"/><path d="M80 32l20 0 22 11H70z" fill="#fff" opacity=".55"/></svg>`;

function render(){
  const cat=$('#f-cat').value,tr=$('#f-tr').value,max=+$('#f-price').value,r=valid();
  $('#f-out').textContent=max+' €';
  $('#range-msg').textContent=r?`${r.n} ${r.n===1?'dan':'dana'}: ${fmt(r.f)} – ${fmt(r.t)}`:'Izaberite datume da vidite slobodna vozila i ukupnu cijenu.';
  const list=CARS.filter(c=>(!cat||c.cat===cat)&&(!tr||c.tr===tr)&&c.price<=max);
  $('#grid').innerHTML=list.length?list.map(c=>{
    const taken=r&&busy(c.id,r.f,r.t);
    return `<article class="car ${taken?'busy':''}">${svg(c.color)}<h3>${c.name}</h3>
    <div class="meta">${c.cat} · ${c.tr} · ${c.seats} sjedišta · ${c.fuel}</div>
    <div class="foot"><div class="price">${c.price} €<small> / dan</small>${r?`<div class="meta">Ukupno ${c.price*r.n} €</div>`:''}</div>
    ${taken?'<span class="tag">Zauzeto u izabranom periodu</span>':`<button class="btn" data-id="${c.id}">Rezerviši</button>`}</div></article>`}).join('')
    :'<p>Nijedno vozilo ne odgovara filterima. Povećajte maksimalnu cijenu ili promijenite kategoriju.</p>';
}
['#f-cat','#f-tr','#f-price'].forEach(s=>$(s).addEventListener('input',render));
$('#search').addEventListener('submit',e=>{e.preventDefault();render();$('#flota').scrollIntoView({behavior:'smooth'})});

$('#grid').addEventListener('click',e=>{
  const id=e.target.dataset.id;if(!id)return;
  const r=valid();
  if(!r){$('#range-msg').textContent='Prvo izaberite datume preuzimanja i vraćanja.';$('#from').focus();return}
  pick=CARS.find(c=>c.id==id);
  $('#d-title').textContent=pick.name;
  $('#d-sum').textContent=`${fmt(r.f)} – ${fmt(r.t)}, ${r.n} ${r.n===1?'dan':'dana'}, ${$('#loc').value}. Ukupno ${pick.price*r.n} €.`;
  $('#d-err').textContent='';$('#dlg').showModal();
});
$('#d-cancel').addEventListener('click',()=>$('#dlg').close());
$('#book').addEventListener('submit',e=>{
  e.preventDefault();
  const r=valid(),fd=new FormData(e.target);
  if(!r||!pick)return;
  if(busy(pick.id,r.f,r.t)){$('#d-err').textContent='Vozilo je u međuvremenu zauzeto. Izaberite drugi termin.';return}
  bookings.push({id:Date.now(),car:pick.id,carName:pick.name,from:r.f,to:r.t,loc:$('#loc').value,total:pick.price*r.n,name:fd.get('name').trim(),email:fd.get('email').trim(),phone:fd.get('phone').trim()});
  save(bookings);$('#dlg').close();e.target.reset();render();renderBookings();$('#rezervacije').scrollIntoView({behavior:'smooth'});
});

function renderBookings(){
  const el=$('#bookings');
  el.innerHTML=bookings.length?bookings.map(b=>`<div class="bk"><div><strong>${esc(b.carName)}</strong><br>${fmt(b.from)} – ${fmt(b.to)}, ${esc(b.loc)}<br>${esc(b.name)}, ${esc(b.email)}</div><div>${b.total} € <button data-del="${b.id}">Otkaži</button></div></div>`).join('')
  :'<p>Nemate rezervacija. Izaberite datume i vozilo da počnete.</p>';
}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
$('#bookings').addEventListener('click',e=>{
  const id=e.target.dataset.del;if(!id)return;
  bookings=bookings.filter(b=>b.id!=id);save(bookings);render();renderBookings();
});
render();renderBookings();
