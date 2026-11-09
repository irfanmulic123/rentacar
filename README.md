# Primorje Rent a Car

Web aplikacija za iznajmljivanje automobila: Node.js, Express, SQLite (`better-sqlite3`), frontend u čistom HTML/CSS/JS.

## Funkcije
- Katalog vozila, filteri, izbor datuma, ukupna cijena, provjera zauzetosti (na serveru, u transakciji).
- Rezervacija sa šifrom; gost vidi i otkazuje svoje rezervacije.
- Admin panel (`/admin.html`): pregled i promjena statusa rezervacija, brisanje, dodavanje/uređivanje/sakrivanje vozila.

## Pokretanje
```bash
npm install
ADMIN_PASSWORD="vasa-jaka-lozinka" npm start
```
Aplikacija: http://localhost:3000, admin: http://localhost:3000/admin.html

Promjenljive okruženja: `ADMIN_PASSWORD` (obavezno u produkciji), `SECRET` (potpis admin tokena), `PORT`, `DB_PATH` (putanja do SQLite fajla).

## Objava (npr. Render)
GitHub Pages ne podržava backend. Na Render.com napravite **Web Service** iz ovog repozitorijuma (Build: `npm install`, Start: `npm start`), postavite `ADMIN_PASSWORD` i `SECRET`, i dodajte **Persistent Disk** (npr. mount `/data`, `DB_PATH=/data/rentacar.db`). Bez diska se baza briše pri svakom redeploy-u.
