const express=require('express'),Database=require('better-sqlite3'),crypto=require('crypto'),path=require('path');
const db=new Database(process.env.DB_PATH||path.join(__dirname,'rentacar.db'));
db.pragma('journal_mode = WAL');db.pragma('foreign_keys = ON');
db.exec(`CREATE TABLE IF NOT EXISTS cars(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,cat TEXT NOT NULL,tr TEXT NOT NULL,seats INTEGER NOT NULL,fuel TEXT NOT NULL,price REAL NOT NULL,color TEXT NOT NULL DEFAULT '#0e5a8a',active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS bookings(id INTEGER PRIMARY KEY AUTOINCREMENT,code TEXT UNIQUE NOT NULL,car_id INTEGER NOT NULL REFERENCES cars(id),from_date TEXT NOT NULL,to_date TEXT NOT NULL,loc TEXT NOT NULL,total REAL NOT NULL,name TEXT NOT NULL,email TEXT NOT NULL,phone TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'confirmed',created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS ix_b ON bookings(car_id,from_date,to_date)`);
if(!db.prepare('SELECT COUNT(*) n FROM cars').get().n){const i=db.prepare('INSERT INTO cars(name,cat,tr,seats,fuel,price,color) VALUES(?,?,?,?,?,?,?)');
[['Fiat Panda','Ekonomik','Manuelni',4,'Benzin',24,'#e8a33d'],['Škoda Fabia','Ekonomik','Manuelni',5,'Benzin',28,'#6a8fa8'],['VW Golf 8','Kompakt','Automatik',5,'Dizel',45,'#2f3a46'],['Peugeot 308','Kompakt','Manuelni',5,'Dizel',38,'#a4281f'],['Dacia Duster','SUV','Manuelni',5,'Dizel',52,'#6b7a4f'],['Toyota RAV4 Hybrid','SUV','Automatik',5,'Hibrid',78,'#c9cfcb'],['BMW 320d','Premium','Automatik',5,'Dizel',95,'#0e5a8a'],['Mercedes C 220','Premium','Automatik',5,'Dizel',110,'#13202b']].forEach(c=>i.run(...c))}
const PASS=process.env.ADMIN_PASSWORD||(()=>{const p=crypto.randomBytes(6).toString('hex');console.log('ADMIN_PASSWORD nije postavljen. Privremena lozinka:',p);return p})();
const SECRET=process.env.SECRET||crypto.randomBytes(32).toString('hex');
const h=s=>crypto.createHash('sha256').update(s).digest(),sign=b=>crypto.createHmac('sha256',SECRET).update(b).digest('hex');
const mk=()=>{const e=Date.now()+8*36e5;return e+'.'+sign(String(e))};
const ok=t=>{try{const [e,s]=String(t).split('.');return !!e&&Date.now()<+e&&crypto.timingSafeEqual(Buffer.from(s),Buffer.from(sign(e)))}catch{return false}};
const app=express();app.set('trust proxy',1);app.use(express.json({limit:'20kb'}));
app.use(express.static(path.join(__dirname,'public')));
const bad=(r,m,c=400)=>r.status(c).json({error:m}),DATE=/^\d{4}-\d{2}-\d{2}$/,nd=(a,b)=>Math.round((new Date(b)-new Date(a))/864e5)+1;
const taken=(car,f,t,x=0)=>db.prepare("SELECT 1 FROM bookings WHERE car_id=? AND status!='cancelled' AND id!=? AND NOT(to_date<? OR from_date>?)").get(car,x,f,t);
const BK='SELECT b.*,c.name car_name FROM bookings b JOIN cars c ON c.id=b.car_id';
const pub=b=>({code:b.code,car:b.car_name,from:b.from_date,to:b.to_date,loc:b.loc,total:b.total,status:b.status,name:b.name});
app.get('/api/cars',(q,r)=>{const{from,to}=q.query,k=DATE.test(from)&&DATE.test(to)&&to>=from;
 r.json(db.prepare('SELECT * FROM cars WHERE active=1 ORDER BY price').all().map(c=>({...c,busy:k?!!taken(c.id,from,to):false})))});
app.post('/api/bookings',(q,r)=>{const b=q.body||{},s=(v,m)=>String(v||'').trim().slice(0,m);
 const name=s(b.name,80),email=s(b.email,120),phone=s(b.phone,30),loc=s(b.loc,60);
 if(!name||!/^\S+@\S+\.\S+$/.test(email)||phone.length<6||!loc)return bad(r,'Provjerite ime, email i telefon.');
 if(!DATE.test(b.from)||!DATE.test(b.to)||b.to<b.from||b.from<new Date().toISOString().slice(0,10))return bad(r,'Datumi nisu ispravni.');
 const car=db.prepare('SELECT * FROM cars WHERE id=? AND active=1').get(+b.car_id);if(!car)return bad(r,'Vozilo nije dostupno.',404);
 const code=crypto.randomBytes(4).toString('hex').toUpperCase();
 try{db.transaction(()=>{if(taken(car.id,b.from,b.to))throw new Error('busy');
  db.prepare('INSERT INTO bookings(code,car_id,from_date,to_date,loc,total,name,email,phone) VALUES(?,?,?,?,?,?,?,?,?)').run(code,car.id,b.from,b.to,loc,car.price*nd(b.from,b.to),name,email,phone)})()}
 catch(e){return e.message==='busy'?bad(r,'Vozilo je zauzeto u izabranom periodu.',409):bad(r,'Greška na serveru.',500)}
 r.status(201).json(pub(db.prepare(BK+' WHERE code=?').get(code)))});
app.get('/api/bookings/:code',(q,r)=>{const b=db.prepare(BK+' WHERE code=?').get(q.params.code);b?r.json(pub(b)):bad(r,'Nije pronađeno.',404)});
app.delete('/api/bookings/:code',(q,r)=>{const n=db.prepare("UPDATE bookings SET status='cancelled' WHERE code=? AND status='confirmed'").run(q.params.code).changes;n?r.json({ok:true}):bad(r,'Rezervaciju nije moguće otkazati.',404)});
const fails=new Map();
app.post('/api/admin/login',(q,r)=>{let f=fails.get(q.ip)||{n:0,t:0};if(Date.now()-f.t>9e5)f={n:0,t:0};
 if(f.n>=5)return bad(r,'Previše pokušaja. Pokušajte kasnije.',429);
 if(!crypto.timingSafeEqual(h(String(q.body?.password||'')),h(PASS))){fails.set(q.ip,{n:f.n+1,t:Date.now()});return bad(r,'Pogrešna lozinka.',401)}
 fails.delete(q.ip);r.json({token:mk()})});
app.use('/api/admin',(q,r,n)=>ok((q.get('authorization')||'').replace('Bearer ',''))?n():bad(r,'Neovlašćen pristup.',401));
app.get('/api/admin/bookings',(q,r)=>r.json(db.prepare(BK+' ORDER BY b.from_date DESC').all()));
app.patch('/api/admin/bookings/:id',(q,r)=>{const st=q.body?.status;if(!['confirmed','cancelled','completed'].includes(st))return bad(r,'Nepoznat status.');
 const b=db.prepare('SELECT * FROM bookings WHERE id=?').get(+q.params.id);if(!b)return bad(r,'Nije pronađeno.',404);
 if(st!=='cancelled'&&taken(b.car_id,b.from_date,b.to_date,b.id))return bad(r,'Termin se preklapa sa drugom rezervacijom.',409);
 db.prepare('UPDATE bookings SET status=? WHERE id=?').run(st,b.id);r.json({ok:true})});
app.delete('/api/admin/bookings/:id',(q,r)=>{db.prepare('DELETE FROM bookings WHERE id=?').run(+q.params.id);r.json({ok:true})});
const carIn=b=>{b=b||{};const c={name:String(b.name||'').trim().slice(0,60),cat:String(b.cat||''),tr:String(b.tr||''),seats:+b.seats,fuel:String(b.fuel||'').trim().slice(0,20),price:+b.price,color:/^#[0-9a-f]{6}$/i.test(b.color)?b.color:'#0e5a8a',active:b.active?1:0};
 return c.name&&['Ekonomik','Kompakt','SUV','Premium'].includes(c.cat)&&['Manuelni','Automatik'].includes(c.tr)&&c.seats>=1&&c.seats<=9&&c.price>0&&c.price<=2000&&c.fuel?c:null};
app.get('/api/admin/cars',(q,r)=>r.json(db.prepare('SELECT * FROM cars ORDER BY id').all()));
app.post('/api/admin/cars',(q,r)=>{const c=carIn(q.body);if(!c)return bad(r,'Provjerite podatke o vozilu.');
 r.status(201).json({id:db.prepare('INSERT INTO cars(name,cat,tr,seats,fuel,price,color,active) VALUES(@name,@cat,@tr,@seats,@fuel,@price,@color,@active)').run(c).lastInsertRowid})});
app.put('/api/admin/cars/:id',(q,r)=>{const c=carIn(q.body);if(!c)return bad(r,'Provjerite podatke o vozilu.');
 db.prepare('UPDATE cars SET name=@name,cat=@cat,tr=@tr,seats=@seats,fuel=@fuel,price=@price,color=@color,active=@active WHERE id=@id').run({...c,id:+q.params.id});r.json({ok:true})});
app.delete('/api/admin/cars/:id',(q,r)=>{const id=+q.params.id;
 if(db.prepare('SELECT 1 FROM bookings WHERE car_id=?').get(id)){db.prepare('UPDATE cars SET active=0 WHERE id=?').run(id);return r.json({note:'Vozilo ima rezervacije, pa je samo uklonjeno iz ponude.'})}
 db.prepare('DELETE FROM cars WHERE id=?').run(id);r.json({ok:true})});
app.listen(process.env.PORT||3000,()=>console.log('Server radi na portu',process.env.PORT||3000));
