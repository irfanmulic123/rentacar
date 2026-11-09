'use strict';
const $=s=>document.querySelector(s),app=$('#app'),SL={confirmed:'Potvrđena',completed:'Završena',cancelled:'Otkazana'};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let token=sessionStorage.getItem('adm')||'',tab='b',cars=[],bk=[],msg='';
async function api(u,m='GET',body){const r=await fetch(u,{method:m,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:body&&JSON.stringify(body)}),d=await r.json().catch(()=>({}));
  if(r.status===401&&token)logout();if(!r.ok)throw new Error(d.error||'Greška.');return d}
function logout(){token='';sessionStorage.removeItem('adm');$('#out').hidden=true;login()}
$('#out').onclick=logout;
function login(err=''){app.innerHTML=`<form id="lf" class="bar" style="max-width:420px;margin-top:32px"><label>Lozinka<input type="password" id="pw" required autofocus></label><button class="btn">Prijava</button><p class="err" role="alert">${esc(err)}</p></form>`;
  $('#lf').onsubmit=async e=>{e.preventDefault();try{token=(await api('/api/admin/login','POST',{password:$('#pw').value})).token;sessionStorage.setItem('adm',token);load()}catch(x){token='';login(x.message)}}}
async function load(){try{[bk,cars]=await Promise.all([api('/api/admin/bookings'),api('/api/admin/cars')]);$('#out').hidden=false;draw()}catch(x){if(token)app.innerHTML=`<p class="err">${esc(x.message)}</p>`}}
const bTable=()=>`<div class="tw"><table><thead><tr><th>Šifra</th><th>Vozilo</th><th>Period</th><th>Gost</th><th>Iznos</th><th>Status</th><th></th></tr></thead><tbody>${bk.map(b=>`<tr><td>${esc(b.code)}</td><td>${esc(b.car_name)}</td><td>${b.from_date} – ${b.to_date}<br>${esc(b.loc)}</td><td>${esc(b.name)}<br>${esc(b.email)}<br>${esc(b.phone)}</td><td>${b.total} €</td><td><select data-st="${b.id}">${Object.keys(SL).map(s=>`<option value="${s}" ${s===b.status?'selected':''}>${SL[s]}</option>`).join('')}</select></td><td><button class="lnk" data-del="${b.id}">Obriši</button></td></tr>`).join('')||'<tr><td colspan="7">Još nema rezervacija.</td></tr>'}</tbody></table></div>`;
const opt=(a,v)=>a.map(x=>`<option ${x===v?'selected':''}>${x}</option>`).join('');
const cTable=()=>`<form id="cf" class="bar"><input type="hidden" name="id"><label>Naziv<input name="name" required></label><label>Kategorija<select name="cat">${opt(['Ekonomik','Kompakt','SUV','Premium'])}</select></label><label>Mjenjač<select name="tr">${opt(['Manuelni','Automatik'])}</select></label><label>Sjedišta<input name="seats" type="number" min="1" max="9" value="5" required></label><label>Gorivo<input name="fuel" value="Dizel" required></label><label>Cijena/dan (€)<input name="price" type="number" min="1" step="0.5" required></label><label>Boja<input name="color" type="color" value="#0e5a8a"></label><label><span><input name="active" type="checkbox" checked> U ponudi</span></label><button class="btn">Sačuvaj vozilo</button></form>
<div class="tw"><table><thead><tr><th>Vozilo</th><th>Kategorija</th><th>Cijena</th><th>Status</th><th></th></tr></thead><tbody>${cars.map(c=>`<tr><td>${esc(c.name)}</td><td>${esc(c.cat)}, ${esc(c.tr)}</td><td>${c.price} €</td><td>${c.active?'U ponudi':'Skriveno'}</td><td><button class="lnk" data-edit="${c.id}">Uredi</button> <button class="lnk" data-rm="${c.id}">Obriši</button></td></tr>`).join('')}</tbody></table></div>`;
function draw(){const live=bk.filter(b=>b.status!=='cancelled');
  app.innerHTML=`<div class="stats"><div><b>${live.length}</b> aktivnih rezervacija</div><div><b>${live.reduce((s,b)=>s+b.total,0)} €</b> ukupan iznos</div><div><b>${cars.filter(c=>c.active).length}</b> vozila u ponudi</div></div>
  <div class="tabs"><button class="btn ${tab==='b'?'':'ghost'}" data-t="b">Rezervacije</button><button class="btn ${tab==='c'?'':'ghost'}" data-t="c">Vozila</button></div><p class="err" role="alert">${esc(msg)}</p>${tab==='b'?bTable():cTable()}`;msg=''}
app.addEventListener('click',async e=>{const t=e.target.dataset;try{
  if(t.t){tab=t.t;draw()}
  else if(t.del&&confirm('Trajno obrisati rezervaciju?')){await api('/api/admin/bookings/'+t.del,'DELETE');await load()}
  else if(t.edit){const c=cars.find(x=>x.id==t.edit),f=$('#cf');for(const k of['id','name','cat','tr','seats','fuel','price','color'])f.elements[k].value=c[k];f.active.checked=!!c.active;f.scrollIntoView()}
  else if(t.rm&&confirm('Obrisati vozilo?')){msg=(await api('/api/admin/cars/'+t.rm,'DELETE')).note||'';await load()}
}catch(x){msg=x.message;draw()}});
app.addEventListener('change',async e=>{const id=e.target.dataset.st;if(!id)return;try{await api('/api/admin/bookings/'+id,'PATCH',{status:e.target.value})}catch(x){msg=x.message}await load()});
app.addEventListener('submit',async e=>{if(e.target.id!=='cf')return;e.preventDefault();const f=Object.fromEntries(new FormData(e.target)),id=f.id;delete f.id;f.active=e.target.active.checked;
  try{await api('/api/admin/cars'+(id?'/'+id:''),id?'PUT':'POST',f);await load()}catch(x){msg=x.message;draw()}});
token?load():login();
