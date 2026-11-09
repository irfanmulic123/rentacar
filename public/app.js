'use strict';
const $=s=>document.querySelector(s),stat={confirmed:'Potvrđena',cancelled:'Otkazana',completed:'Završena'};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=d=>new Date(d).toLocaleDateString('sr-Latn-ME'),days=(a,b)=>Math.round((new Date(b)-new Date(a))/864e5)+1;
async function api(u,o={}){if(o.body){o.body=JSON.stringify(o.body);o.headers={'Content-Type':'application/json'}}const r=await fetch(u,o),d=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(d.error||'Greška na serveru.'),{status:r.status});return d}
let CARS=[],pick=null,USER=null,mode='login',after=null;
const LOCS=[['Podgorica aerodrom',42.3594,19.2519],['Budva',42.2864,18.84],['Kotor',42.4247,18.7712],['Bar',42.0937,19.1003],['Tivat aerodrom',42.4047,18.7233]];
let loc=LOCS[0][0];const markers={};
const pin=on=>L.divIcon({className:'',html:`<div class="pin ${on?'on':''}"></div>`,iconSize:[26,26],iconAnchor:[13,26]});
function pickLoc(n){loc=n;$('#loc-name').textContent=n;document.querySelectorAll('.chip').forEach(c=>c.setAttribute('aria-pressed',c.dataset.loc===n));for(const k in markers)markers[k].setIcon(pin(k===n))}
$('#chips').innerHTML=LOCS.map(l=>`<button type="button" class="chip" data-loc="${l[0]}">${l[0]}</button>`).join('');
$('#chips').addEventListener('click',e=>{if(e.target.dataset.loc)pickLoc(e.target.dataset.loc)});
if(window.L){const map=L.map('map',{scrollWheelZoom:false});
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
  map.fitBounds(LOCS.map(l=>[l[1],l[2]]),{padding:[30,30]});
  LOCS.forEach(l=>{markers[l[0]]=L.marker([l[1],l[2]],{icon:pin(false),title:l[0],alt:l[0]}).addTo(map).on('click',()=>pickLoc(l[0]))})}
else $('#map').hidden=true;
pickLoc(loc);
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
  $('#grid').innerHTML=list.length?list.map(c=>`<article class="car ${c.busy?'busy':''}"><div class="pic">${c.photos.length?`<img class="ph" src="/api/photos/${c.photos[0]}" alt="${esc(c.name)}" loading="lazy">`:svg(c.color)}</div>
    ${c.photos.length>1?`<div class="ths">${c.photos.map((p,i)=>`<button class="th" data-src="${p}" aria-label="Fotografija ${i+1}"><img src="/api/photos/${p}" alt="" loading="lazy"></button>`).join('')}</div>`:''}
    <div class="cb"><h3>${esc(c.name)}</h3><div class="meta">${esc(c.cat)} · ${esc(c.tr)} · ${c.seats} sjedišta · ${esc(c.fuel)}</div>
    <div class="foot"><div class="price">${c.price} €<small> / dan</small>${r?`<div class="meta">Ukupno ${c.price*r.n} €</div>`:''}</div>${c.busy?'<span class="tag">Zauzeto u izabranom periodu</span>':`<button class="btn" data-id="${c.id}">Rezerviši</button>`}</div></div></article>`).join('')
    :'<p>Nijedno vozilo ne odgovara filterima. Povećajte maksimalnu cijenu ili promijenite kategoriju.</p>';
}
['#f-cat','#f-tr','#f-price'].forEach(s=>$(s).addEventListener('input',render));
$('#search').addEventListener('submit',e=>{e.preventDefault();loadCars();$('#flota').scrollIntoView({behavior:'smooth'})});
function openBook(id){const r=valid();pick=CARS.find(c=>c.id==id);if(!pick||!r)return;$('#d-title').textContent=pick.name;
  $('#d-sum').textContent=`${fmt(r.f)} – ${fmt(r.t)}, ${r.n} ${r.n===1?'dan':'dana'}, ${loc}. Ukupno ${pick.price*r.n} €. Rezervacija je na ime ${USER.name}.`;$('#d-err').textContent='';$('#dlg').showModal()}
$('#grid').addEventListener('click',e=>{const th=e.target.closest('.th');
  if(th){th.closest('.car').querySelector('.ph').src='/api/photos/'+th.dataset.src;return}
  const id=e.target.dataset.id;if(!id)return;
  if(!valid()){$('#range-msg').textContent='Prvo izaberite datume preuzimanja i vraćanja.';$('#from').focus();return}
  if(!USER){after=()=>openBook(id);openAuth('login','Prijavite se ili napravite nalog da biste rezervisali.');return}
  openBook(id)});
$('#d-cancel').addEventListener('click',()=>$('#dlg').close());
$('#book').addEventListener('submit',async e=>{e.preventDefault();const r=valid();if(!r||!pick)return;
  try{await api('/api/bookings',{method:'POST',body:{car_id:pick.id,from:r.f,to:r.t,loc,phone:new FormData(e.target).get('phone')}});
    $('#dlg').close();e.target.reset();await loadCars();await renderBookings();$('#rezervacije').scrollIntoView({behavior:'smooth'})}
  catch(x){$('#d-err').textContent=x.message;if(x.status===409)loadCars();if(x.status===401){USER=null;drawAuth()}}});
function drawAuth(){$('#auth').innerHTML=USER?`<span class="hi">${esc(USER.name.split(' ')[0])}</span><button class="btn ghost" id="b-out">Odjava</button>`:'<button class="btn ghost" id="b-in">Prijava</button><button class="btn" id="b-reg">Registracija</button>'}
function openAuth(m,hint=''){mode=m;const reg=m==='register',f=$('#aform');
  $('#a-title').textContent=reg?'Registracija':'Prijava';$('#a-hint').textContent=hint;$('#l-name').hidden=!reg;f.name.required=reg;
  f.password.autocomplete=reg?'new-password':'current-password';$('#a-ok').textContent=reg?'Napravi nalog':'Prijavi se';
  $('#a-switch').textContent=reg?'Već imam nalog':'Nemam nalog';$('#a-err').textContent='';$('#adlg').showModal()}
$('#auth').addEventListener('click',async e=>{
  if(e.target.id==='b-in')openAuth('login');else if(e.target.id==='b-reg')openAuth('register');
  else if(e.target.id==='b-out'){await api('/api/logout',{method:'POST'});USER=null;drawAuth();renderBookings()}});
$('#a-switch').addEventListener('click',()=>openAuth(mode==='login'?'register':'login',$('#a-hint').textContent));
$('#a-close').addEventListener('click',()=>{after=null;$('#adlg').close()});
$('#aform').addEventListener('submit',async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));
  try{USER=await api('/api/'+mode,{method:'POST',body:f});e.target.reset();$('#adlg').close();drawAuth();await renderBookings();if(after){const a=after;after=null;a()}}
  catch(x){$('#a-err').textContent=x.message}});
async function renderBookings(){const el=$('#bookings');
  if(!USER){el.innerHTML='<p>Prijavite se da vidite svoje rezervacije.</p>';return}
  let rows=[];try{rows=await api('/api/my-bookings')}catch{}
  el.innerHTML=rows.length?rows.map(b=>`<div class="bk"><div><strong>${esc(b.car)}</strong> · šifra ${esc(b.code)}<br>${fmt(b.from)} – ${fmt(b.to)}, ${esc(b.loc)}<br>${stat[b.status]||''}</div><div>${b.total} € ${b.status==='confirmed'?`<button class="lnk" data-del="${b.id}">Otkaži</button>`:''}</div></div>`).join(''):'<p>Nemate rezervacija. Izaberite datume i vozilo da počnete.</p>'}
$('#bookings').addEventListener('click',async e=>{const id=e.target.dataset.del;if(!id)return;try{await api('/api/my-bookings/'+id,{method:'DELETE'})}catch{}await loadCars();renderBookings()});
(async()=>{try{USER=(await api('/api/me')).user}catch{}drawAuth();loadCars();renderBookings()})();
