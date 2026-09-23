// RM NIERUCHOMOŚCI, Zadania
// Wspólne zadania, kalendarz i proces kredytowy dla zespołu: menedżer, asystentka, doradca kredytowy, agenci.
// Dane: Supabase (logowanie + baza + zmiany na żywo). Bez konfiguracji działa tryb próbny w localStorage.
'use strict';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const TYPY = [
  { k: 'zadanie', n: 'Zadanie', i: '✅', min: 30 },
  { k: 'telefon', n: 'Telefon', i: '📞', min: 15 },
  { k: 'mail', n: 'Mail', i: '✉️', min: 15 },
  { k: 'teren', n: 'Teren', i: '🚗', min: 120 },
  { k: 'prezentacja', n: 'Prezentacja', i: '🏠', min: 60 },
  { k: 'spotkanie', n: 'Spotkanie', i: '🤝', min: 60 },
  { k: 'dokumenty', n: 'Dokumenty', i: '📄', min: 30 }
];
const PRIORYTETY = [
  { k: 1, n: 'Pilne', i: '🔴' },
  { k: 2, n: 'Wysoki', i: '🟠' },
  { k: 3, n: 'Normalny', i: '⚪' },
  { k: 4, n: 'Niski', i: '🔵' }
];
const STATUSY = { otwarte: 'Do zrobienia', w_toku: 'W toku', zrobione: 'Zrobione' };
const ROLE = { admin: 'Menedżer', asystentka: 'Asystentka', doradca: 'Doradca kredytowy', agent: 'Agent' };
const ROLE_GRUPY = [['admin', 'Menedżer'], ['asystentka', 'Asystentka'], ['doradca', 'Doradca kredytowy'], ['agent', 'Agenci']];
const ETAPY = [
  { k: 'rozmowa', n: 'Pierwsza rozmowa z klientem' },
  { k: 'zdolnosc', n: 'Zdolność kredytowa policzona' },
  { k: 'dokumenty', n: 'Dokumenty od klienta zebrane' },
  { k: 'wniosek', n: 'Wniosek złożony w banku' },
  { k: 'wycena', n: 'Wycena nieruchomości (operat)' },
  { k: 'decyzja', n: 'Pozytywna decyzja kredytowa' },
  { k: 'umowa', n: 'Umowa kredytowa podpisana' },
  { k: 'uruchomienie', n: 'Kredyt uruchomiony' }
];
const K_STATUSY = { w_toku: 'W toku', uruchomiony: 'Uruchomiony', odpadl: 'Odpadł' };
const WIDOKI = {
  panel: 'Panel', moje: 'Moje', wszystkie: 'Wszystkie', listy: 'Listy', kalendarz: 'Kalendarz', gantt: 'Gantt', kredyty: 'Kredyty', zrobione: 'Zrobione'
};
const ZAKLADKI = {
  admin: ['panel', 'moje', 'wszystkie', 'listy', 'kalendarz', 'gantt', 'kredyty', 'zrobione'],
  asystentka: ['moje', 'kalendarz', 'gantt', 'zrobione'],
  doradca: ['kredyty'],
  agent: ['moje', 'kalendarz', 'gantt', 'kredyty', 'zrobione']
};
const IKONY_LIST = ['📋', '🎬', '💰', '📄', '🏠', '📞', '🛠️', '⭐', '🧾', '📸'];
const KOLORY = ['#094d47', '#2563eb', '#c2410c', '#7c3aed', '#be185d', '#0891b2', '#65a30d', '#b45309'];
const DNI = ['pon', 'wt', 'śr', 'czw', 'pt', 'sob', 'nd'];
const DNI_PELNE = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
const MIESIACE = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'];
const MIESIACE_D = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
const CACHE_KEY = 'rm-zadania-cache';

// ---------- DATY ----------
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const dzis = () => ymd(new Date());
const plusDni = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
const hhmm = (t) => (t ? String(t).slice(0, 5) : '');
const tsDzien = (iso) => (iso ? ymd(new Date(iso)) : '');

function nazwaDnia(s) {
  if (!s) return 'bez terminu';
  const t = dzis();
  if (s === t) return 'dziś';
  if (s === plusDni(t, 1)) return 'jutro';
  if (s === plusDni(t, -1)) return 'wczoraj';
  const d = parseYmd(s);
  const rok = d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : '';
  return `${DNI_PELNE[d.getDay()].slice(0, 3)}. ${d.getDate()} ${MIESIACE_D[d.getMonth()]}${rok}`;
}
// pełny nagłówek dnia do list Zrobione i podsumowań: "Środa, 23 września 2026 (dziś)"
function naglowekDnia(s) {
  if (!s) return 'Bez daty';
  const d = parseYmd(s);
  const dopisek = { [dzis()]: ' (dziś)', [plusDni(dzis(), -1)]: ' (wczoraj)' }[s] || '';
  const dzien = DNI_PELNE[d.getDay()];
  return `${dzien[0].toUpperCase() + dzien.slice(1)}, ${d.getDate()} ${MIESIACE_D[d.getMonth()]} ${d.getFullYear()}${dopisek}`;
}
function kiedyTs(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${nazwaDnia(ymd(d))}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ---------- KALENDARZ GOOGLE ----------
// Link do gotowego wydarzenia: otwiera Kalendarz Google zalogowanej osoby, zostaje tylko kliknąć Zapisz.
function linkGoogle(z) {
  if (!z.termin) return null;
  const d = z.termin.replace(/-/g, '');
  let daty;
  if (z.godzina) {
    const [h, m] = hhmm(z.godzina).split(':').map(Number);
    const start = new Date(2000, 0, 1, h, m);
    const koniec = new Date(start.getTime() + typ(z.typ).min * 60000);
    const t = (x) => `${pad(x.getHours())}${pad(x.getMinutes())}00`;
    const dKoniec = koniec.getDate() !== 1 ? plusDni(z.termin, 1).replace(/-/g, '') : d;
    daty = `${d}T${t(start)}/${dKoniec}T${t(koniec)}`;
  } else {
    daty = `${d}/${plusDni(z.termin, 1).replace(/-/g, '')}`;
  }
  const opis = [z.opis, z.oferta ? 'Oferta/klient: ' + z.oferta : '', 'Zadania RM: ' + location.origin + location.pathname].filter(Boolean).join('\n\n');
  const p = new URLSearchParams({ action: 'TEMPLATE', text: `${typ(z.typ).i} ${z.tytul}`, dates: daty, details: opis, ctz: 'Europe/Warsaw' });
  if (z.oferta) p.set('location', z.oferta);
  return 'https://calendar.google.com/calendar/render?' + p.toString();
}

// ---------- MAGAZYN: SUPABASE ----------
function supabaseStore(cfg) {
  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  let userId = null;
  const blad = (e) => { if (e) throw new Error(e.message || String(e)); };

  return {
    demo: false,
    async init(onRecovery) {
      sb.auth.onAuthStateChange((ev) => { if (ev === 'PASSWORD_RECOVERY') onRecovery(); });
      const { data } = await sb.auth.getSession();
      userId = data.session ? data.session.user.id : null;
      return userId ? { id: userId, email: data.session.user.email } : null;
    },
    async login(email, haslo) {
      const { data, error } = await sb.auth.signInWithPassword({ email, password: haslo });
      blad(error);
      userId = data.user.id;
      return { id: userId, email: data.user.email };
    },
    async logout() { await sb.auth.signOut(); userId = null; },
    async resetHasla(email) {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
      blad(error);
    },
    async noweHaslo(haslo) { const { error } = await sb.auth.updateUser({ password: haslo }); blad(error); },
    async osoby() {
      const { data, error } = await sb.from('profile').select('*').order('imie');
      blad(error); return data;
    },
    async zadania() {
      const od = new Date(Date.now() - 120 * 86400000).toISOString();
      const { data, error } = await sb.from('zadania').select('*')
        .or(`status.neq.zrobione,zrobione_kiedy.gte.${od}`).limit(3000);
      blad(error); return data;
    },
    async listy() {
      const { data, error } = await sb.from('listy').select('*').order('kolejnosc').order('utworzono');
      blad(error); return data;
    },
    async zapiszListe(l, nowe) {
      const q = nowe ? sb.from('listy').insert(l) : sb.from('listy').update(l).eq('id', l.id);
      const { data, error } = await q.select().single();
      blad(error); return data;
    },
    async usunListe(id) {
      const { data, error } = await sb.from('listy').delete().eq('id', id).select('id');
      blad(error);
      if (!data || !data.length) throw new Error('Usunąć może tylko właściciel listy albo menedżer.');
    },
    async kredyty() {
      const od = new Date(Date.now() - 365 * 86400000).toISOString();
      const { data, error } = await sb.from('kredyty').select('*')
        .or(`status.eq.w_toku,zmieniono.gte.${od}`).limit(1000);
      blad(error); return data;
    },
    async zapiszZadanie(z, nowe, wpisy) {
      const zapytanie = (w) => (nowe ? sb.from('zadania').insert(w) : sb.from('zadania').update(w).eq('id', w.id)).select().single();
      let { data, error } = await zapytanie(z);
      if (error && nowe && /row-level security|violates/i.test(error.message || '')) {
        const { error: e3 } = await sb.from('zadania').insert(z); // bez odczytu zwrotnego
        if (!e3) { data = Object.assign({ utworzono: new Date().toISOString() }, z); error = null; }
      }
      if (error && /kolejnosc/.test(error.message || '') && 'kolejnosc' in z) {
        const bez = Object.assign({}, z); delete bez.kolejnosc; // kolumna jeszcze nie dodana w bazie
        ({ data, error } = await zapytanie(bez));
      }
      blad(error);
      if (wpisy.length) {
        const { error: e2 } = await sb.from('wpisy').insert(wpisy.map((t) => ({ zadanie_id: data.id, rodzaj: 'zmiana', tresc: t })));
        blad(e2);
      }
      return data;
    },
    async usunZadanie(id) {
      const { data, error } = await sb.from('zadania').delete().eq('id', id).select('id');
      blad(error);
      if (!data || !data.length) throw new Error('Usunąć może tylko autor zadania albo menedżer.');
    },
    async zapiszKredyt(k, nowe) {
      const q = nowe ? sb.from('kredyty').insert(k) : sb.from('kredyty').update(k).eq('id', k.id);
      const { data, error } = await q.select().single();
      blad(error); return data;
    },
    async usunKredyt(id) {
      const { data, error } = await sb.from('kredyty').delete().eq('id', id).select('id');
      blad(error);
      if (!data || !data.length) throw new Error('Usunąć może tylko menedżer.');
    },
    async wpisy(zadanieId) {
      const { data, error } = await sb.from('wpisy').select('*').eq('zadanie_id', zadanieId).order('kiedy');
      blad(error); return data;
    },
    async dodajKomentarz(zadanieId, tresc) {
      const { error } = await sb.from('wpisy').insert({ zadanie_id: zadanieId, rodzaj: 'komentarz', tresc });
      blad(error);
    },
    async zapiszProfil(p) { const { error } = await sb.from('profile').update(p).eq('id', userId); blad(error); },
    async adminOsoba(id, aktywny, rola) {
      const { error } = await sb.rpc('admin_osoba', { p_id: id, p_aktywny: aktywny, p_rola: rola });
      blad(error);
    },
    naZmiany(cb) {
      let t = null;
      const odpal = () => { clearTimeout(t); t = setTimeout(cb, 300); };
      const ch = sb.channel('rm-zadania');
      ['zadania', 'wpisy', 'profile', 'kredyty', 'listy'].forEach((tab) => ch.on('postgres_changes', { event: '*', schema: 'public', table: tab }, odpal));
      ch.subscribe();
    }
  };
}

// ---------- MAGAZYN: TRYB PRÓBNY ----------
function demoStore() {
  const KEY = 'rm-zadania-demo-v2';
  const ME = 'rm-zadania-demo-me';
  const wczytaj = () => {
    try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && d.profile) return d; } catch (e) { /* pusto */ }
    return {
      profile: [
        { id: 'u-rafal', imie: 'Rafał', rola: 'admin', kolor: KOLORY[0], aktywny: true },
        { id: 'u-asystentka', imie: 'Asystentka', rola: 'asystentka', kolor: KOLORY[4], aktywny: true },
        { id: 'u-doradca', imie: 'Doradca', rola: 'doradca', kolor: KOLORY[3], aktywny: true },
        { id: 'u-agent1', imie: 'Agent 1', rola: 'agent', kolor: KOLORY[1], aktywny: true },
        { id: 'u-agent2', imie: 'Agent 2', rola: 'agent', kolor: KOLORY[2], aktywny: true }
      ],
      zadania: [], wpisy: [], kredyty: [], listy: []
    };
  };
  const zapisz = (d) => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* brak miejsca */ } };
  let db = wczytaj();
  let userId = null;
  try { userId = localStorage.getItem(ME); } catch (e) { /* brak */ }
  const teraz = () => new Date().toISOString();
  const rola = () => { const p = db.profile.find((x) => x.id === userId); return p && p.aktywny ? p.rola : null; };

  return {
    demo: true,
    demoOsoby: () => db.profile.filter((p) => p.aktywny),
    async init() { return userId && db.profile.some((p) => p.id === userId && p.aktywny) ? { id: userId, email: 'tryb próbny' } : null; },
    async loginDemo(id) { userId = id; try { localStorage.setItem(ME, id); } catch (e) { /* brak */ } return { id, email: 'tryb próbny' }; },
    async logout() { userId = null; try { localStorage.removeItem(ME); } catch (e) { /* brak */ } },
    async osoby() { db = wczytaj(); return db.profile.slice(); },
    async zadania() {
      db.listy = db.listy || [];
      const widoczne = new Set(db.listy.filter((l) => l.wspolna || l.wlasciciel === userId).map((l) => l.id));
      return db.zadania.filter((z) => !z.lista_id || widoczne.has(z.lista_id));
    },
    async listy() { db = wczytaj(); db.listy = db.listy || []; return db.listy.filter((l) => l.wspolna || l.wlasciciel === userId); },
    async zapiszListe(l, nowe) {
      db = wczytaj(); db.listy = db.listy || [];
      if (nowe) { const w = Object.assign({ wlasciciel: userId, utworzono: teraz(), kolejnosc: 0 }, l); db.listy.push(w); zapisz(db); return w; }
      const i = db.listy.findIndex((x) => x.id === l.id);
      if (db.listy[i].wlasciciel !== userId && rola() !== 'admin') throw new Error('Zmienić może tylko właściciel listy albo menedżer.');
      const w = db.listy[i] = Object.assign({}, db.listy[i], l); zapisz(db); return w;
    },
    async usunListe(id) {
      db = wczytaj();
      const l = (db.listy || []).find((x) => x.id === id);
      if (!l || (l.wlasciciel !== userId && rola() !== 'admin')) throw new Error('Usunąć może tylko właściciel listy albo menedżer.');
      db.listy = db.listy.filter((x) => x.id !== id);
      db.zadania = db.zadania.filter((z) => z.lista_id !== id);
      zapisz(db);
    },
    async kredyty() {
      const r = rola();
      return db.kredyty.filter((k) => r === 'admin' || r === 'doradca' || k.utworzyl === userId);
    },
    async zapiszZadanie(z, nowe, wpisy) {
      db = wczytaj();
      let wynik;
      if (nowe) {
        wynik = Object.assign({ utworzyl: userId, utworzono: teraz() }, z);
        db.zadania.push(wynik);
      } else {
        const i = db.zadania.findIndex((x) => x.id === z.id);
        if (i < 0) throw new Error('Zadanie zniknęło');
        wynik = db.zadania[i] = Object.assign({}, db.zadania[i], z);
      }
      wpisy.forEach((t) => db.wpisy.push({ id: uuid(), zadanie_id: wynik.id, autor: userId, rodzaj: 'zmiana', tresc: t, kiedy: teraz() }));
      zapisz(db); return wynik;
    },
    async usunZadanie(id) {
      db = wczytaj();
      const z = db.zadania.find((x) => x.id === id);
      if (!z || (z.utworzyl !== userId && rola() !== 'admin')) throw new Error('Usunąć może tylko autor zadania albo menedżer.');
      db.zadania = db.zadania.filter((x) => x.id !== id);
      db.wpisy = db.wpisy.filter((w) => w.zadanie_id !== id);
      zapisz(db);
    },
    async zapiszKredyt(k, nowe) {
      db = wczytaj();
      if (nowe) { const w = Object.assign({ utworzyl: userId, utworzono: teraz() }, k); db.kredyty.push(w); zapisz(db); return w; }
      if (!['admin', 'doradca'].includes(rola())) throw new Error('Etapy odhacza doradca albo menedżer.');
      const i = db.kredyty.findIndex((x) => x.id === k.id);
      const w = db.kredyty[i] = Object.assign({}, db.kredyty[i], k);
      zapisz(db); return w;
    },
    async usunKredyt(id) {
      if (rola() !== 'admin') throw new Error('Usunąć może tylko menedżer.');
      db = wczytaj(); db.kredyty = db.kredyty.filter((k) => k.id !== id); zapisz(db);
    },
    async wpisy(zadanieId) { return wczytaj().wpisy.filter((w) => w.zadanie_id === zadanieId); },
    async dodajKomentarz(zadanieId, tresc) {
      db = wczytaj();
      db.wpisy.push({ id: uuid(), zadanie_id: zadanieId, autor: userId, rodzaj: 'komentarz', tresc, kiedy: teraz() });
      zapisz(db);
    },
    async zapiszProfil(p) { db = wczytaj(); Object.assign(db.profile.find((x) => x.id === userId), p); zapisz(db); },
    async adminOsoba(id, aktywny, r) {
      if (rola() !== 'admin') throw new Error('Tylko menedżer');
      if (id === userId && (!aktywny || r !== 'admin')) throw new Error('Nie możesz odebrać dostępu samemu sobie');
      db = wczytaj(); Object.assign(db.profile.find((x) => x.id === id), { aktywny, rola: r }); zapisz(db);
    },
    naZmiany(cb) { window.addEventListener('storage', (e) => { if (e.key === KEY) { db = wczytaj(); cb(); } }); }
  };
}

// ---------- STAN ----------
const cfg = window.RM_CONFIG || {};
const store = cfg.supabaseUrl && cfg.supabaseKey && window.supabase ? supabaseStore(cfg) : demoStore();

const S = {
  me: null, osoby: [], zadania: [], kredyty: [], listy: [], otwartaLista: null,
  ganttOd: null, ganttOsoba: null,
  widok: null, filtrOsoba: '', szukaj: '', filtrKredyt: 'w_toku',
  kalMiesiac: null, kalDzien: dzis(),
  otwarte: null, edycja: null, form: {}, kredyt: null, kForm: {},
  ekrany: [], offline: false
};

const osoba = (id) => S.osoby.find((p) => p.id === id) || { id, imie: '?', kolor: '#a8a29e', rola: '' };
const ja = () => osoba(S.me && S.me.id);
const mojaRola = () => ja().rola || 'agent';
const jestemAdminem = () => mojaRola() === 'admin';
const mogeKredyty = () => ['admin', 'doradca'].includes(mojaRola());
const aktywni = () => S.osoby.filter((p) => p.aktywny !== false);
const inicjaly = (imie) => (imie || '?').split(/\s+/).map((c) => c[0] || '').join('').slice(0, 2).toUpperCase();
const avatar = (id, sm) => { const p = osoba(id); return `<span class="avatar${sm ? ' sm' : ''}" style="background:${esc(p.kolor)}" title="${esc(p.imie)}">${esc(inicjaly(p.imie))}</span>`; };
const typ = (k) => TYPY.find((t) => t.k === k) || TYPY[0];
const prio = (k) => PRIORYTETY.find((p) => p.k === Number(k)) || PRIORYTETY[2];
const zakladki = () => ZAKLADKI[mojaRola()] || ZAKLADKI.agent;
const lista = (id) => S.listy.find((l) => l.id === id);
// zadania "robocze" = bez pozycji z szablonów (szablon to wzór, widać go tylko w zakładce Listy)
const robocze = () => S.zadania.filter((z) => !(z.lista_id && lista(z.lista_id) && lista(z.lista_id).szablon));
const etapyZrobione = (k) => ETAPY.filter((e) => k.etapy && k.etapy[e.k]).length;
const nastepnyEtap = (k) => ETAPY.find((e) => !(k.etapy && k.etapy[e.k]));

// ---------- NAWIGACJA ----------
function pokaz(ekran) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === 'screen-' + ekran));
  const zalogowany = !!S.me;
  $('#back-btn').style.display = ['detail', 'form', 'settings', 'kredyt', 'lista', 'podsumowanie'].includes(ekran) ? '' : 'none';
  $('#settings-btn').style.display = zalogowany && ekran === 'main' ? '' : 'none';
  $('#fab').style.display = zalogowany && ekran === 'main' && S.widok !== 'panel' && !(S.widok === 'kredyty' && false) ? '' : 'none';
  $('#header-subtitle').textContent = { detail: 'Zadanie', form: 'Zadanie', settings: 'Ustawienia', kredyt: 'Kredyt', lista: 'Lista', podsumowanie: 'Podsumowanie dnia' }[ekran]
    || (zalogowany ? `${ja().imie}, ${ROLE[mojaRola()] || ''}` : 'Zadania');
  window.scrollTo(0, 0);
}
function wejdz(ekran) { S.ekrany.push(ekran); history.pushState({ e: ekran }, ''); pokaz(ekran); }
function cofnij() { if (S.ekrany.length) history.back(); }
const biezacy = () => S.ekrany[S.ekrany.length - 1] || 'main';
window.addEventListener('popstate', () => {
  S.ekrany.pop();
  const e = biezacy();
  if (e === 'detail' && S.otwarte) renderSzczegoly();
  if (e === 'main') renderMain();
  if (e === 'lista') renderLista();
  pokaz(e);
});
$('#back-btn').addEventListener('click', cofnij);

let toastT = null;
function toast(msg, akcja, onAkcja) {
  const t = $('#toast');
  t.innerHTML = `<span>${esc(msg)}</span>` + (akcja ? `<button type="button">${esc(akcja)}</button>` : '');
  if (akcja) t.querySelector('button').onclick = () => { t.classList.remove('show'); onAkcja(); };
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), akcja ? 5000 : 2600);
}
function baner(msg) { const b = $('#banner'); b.textContent = msg || ''; b.style.display = msg ? '' : 'none'; }

// ---------- DANE ----------
async function wczytajDane() {
  try {
    const [osoby, zadania, kredyty, listy] = await Promise.all([store.osoby(), store.zadania(), store.kredyty(), store.listy()]);
    S.osoby = osoby; S.zadania = zadania; S.kredyty = kredyty; S.listy = listy; S.offline = false;
    if (!store.demo) try { localStorage.setItem(CACHE_KEY, JSON.stringify({ osoby, zadania, kredyty, listy, kiedy: Date.now() })); } catch (e) { /* brak miejsca */ }
    baner(store.demo ? 'Tryb próbny: dane są tylko w tej przeglądarce' : '');
  } catch (e) {
    let c = null;
    try { c = JSON.parse(localStorage.getItem(CACHE_KEY)); } catch (e2) { /* brak */ }
    if (c) { S.osoby = c.osoby; S.zadania = c.zadania; S.kredyty = c.kredyty || []; S.listy = c.listy || []; }
    S.offline = true;
    baner(navigator.onLine ? 'Nie udało się pobrać danych: ' + e.message : 'Brak zasięgu. Widzisz ostatnio pobrany stan, zmiany zapiszesz po powrocie sieci.');
  }
}
async function odswiez() {
  await wczytajDane();
  const e = biezacy();
  if (e === 'main') renderMain();
  if (e === 'detail') renderSzczegoly();
  if (e === 'lista') renderLista();
}
window.addEventListener('online', odswiez);
window.addEventListener('offline', () => baner('Brak zasięgu. Zmiany zapiszesz po powrocie sieci.'));
document.addEventListener('visibilitychange', () => { if (!document.hidden && S.me) odswiez(); });

// ---------- LISTY ZADAŃ ----------
function pasuje(z) {
  if (!S.szukaj) return true;
  const q = S.szukaj.toLowerCase();
  return [z.tytul, z.oferta, z.opis, osoba(z.przypisany).imie, z.klient, z.bank].some((v) => (v || '').toLowerCase().includes(q));
}
function sortuj(a, b) {
  return (a.termin || '9999').localeCompare(b.termin || '9999')
    || (a.priorytet || 3) - (b.priorytet || 3)
    || (hhmm(a.godzina) || '99').localeCompare(hhmm(b.godzina) || '99')
    || (a.utworzono || '').localeCompare(b.utworzono || '');
}
const poPriorytecie = (a, b) => (a.priorytet || 3) - (b.priorytet || 3) || sortuj(a, b);
function grupuj(lista) {
  // Zaległe, Dziś, Jutro, potem każdy kolejny dzień osobno z pełną datą; grupy liczą się od dzisiejszej daty,
  // więc zadanie na 1 października samo wskoczy do "Jutro", a potem do "Dziś"
  const t = dzis(), jutro = plusDni(t, 1);
  const g = { 'Zaległe': [], 'Dziś': [], 'Jutro': [] };
  const bez = [];
  lista.slice().sort(sortuj).forEach((z) => {
    if (!z.termin) bez.push(z);
    else if (z.termin < t) g['Zaległe'].push(z);
    else if (z.termin === t) g['Dziś'].push(z);
    else if (z.termin === jutro) g['Jutro'].push(z);
    else { const n = naglowekDnia(z.termin); (g[n] = g[n] || []).push(z); }
  });
  g['Bez terminu'] = bez;
  // w dniu najważniejsze na górze
  Object.keys(g).forEach((k) => g[k].sort(poPriorytecie));
  return g;
}
function karta(z, opcje = {}) {
  const t = dzis();
  const zrobione = z.status === 'zrobione';
  const zalegle = !zrobione && z.termin && z.termin < t;
  const p = z.priorytet || 3;
  const kl = ['task', 'p' + p, zalegle ? 'zalegle' : '', z.status === 'w_toku' ? 'wtoku' : '', zrobione ? 'zrobione' : ''].join(' ');
  const meta = [];
  if (opcje.zrobione) meta.push(`<span>✔ ${esc(osoba(z.zrobione_przez).imie)}, ${esc(kiedyTs(z.zrobione_kiedy))}</span>`);
  else if (!opcje.bezDaty && (z.termin || z.godzina)) meta.push(`<span class="task-when">${esc(nazwaDnia(z.termin))}${z.godzina ? ' ' + esc(hhmm(z.godzina)) : ''}</span>`);
  else if (opcje.bezDaty && z.godzina) meta.push(`<span class="task-when">${esc(hhmm(z.godzina))}</span>`);
  if (!zrobione && p <= 2) meta.push(`<span class="tag p${p}">${prio(p).n.toLowerCase()}</span>`);
  if (z.status === 'w_toku') meta.push('<span class="tag wtoku">w toku</span>');
  if (z.oferta) meta.push(`<span class="tag">${esc(z.oferta)}</span>`);
  if (z.lista_id && !opcje.bezListy && lista(z.lista_id)) meta.push(`<span class="tag lista">${esc(lista(z.lista_id).ikona)} ${esc(lista(z.lista_id).nazwa)}</span>`);
  if (!zrobione && z.kalendarz && z.termin) {
    meta.push(z.w_kalendarzu ? '<span class="tag gcal-ok" title="Dodane do Kalendarza Google">📅 w kalendarzu</span>'
      : (z.przypisany === S.me.id ? `<button class="tag gcal" data-gcal="${esc(z.id)}">📅 dodaj do kalendarza</button>` : '<span class="tag gcal-czeka">📅 czeka na kalendarz</span>'));
  }
  return `<div class="${kl}" data-id="${esc(z.id)}">
    ${opcje.uchwyt ? '<span class="drag" data-drag="1" title="Przeciągnij, żeby zmienić kolejność">⠿</span>' : ''}
    <button class="check${zrobione ? ' on' : ''}" data-toggle="${esc(z.id)}" aria-label="${zrobione ? 'Przywróć' : 'Oznacz jako zrobione'}">${zrobione ? '✓' : ''}</button>
    <div class="task-body" data-open="${esc(z.id)}">
      <div class="task-title">${typ(z.typ).i} ${esc(z.tytul)}</div>
      ${meta.length ? `<div class="task-meta">${meta.join('')}</div>` : ''}
    </div>
    ${opcje.uchwyt && !zrobione ? `<button class="plan-btn" data-planuj="${esc(z.id)}" title="Zaplanuj na konkretny dzień">📅</button>` : ''}
    ${avatar(z.przypisany)}
  </div>`;
}
// przeniesienie zadania (np. pozycji z listy) na konkretny dzień; zostaje na liście, a w Moje wchodzi do swojego dnia
function ustawDzien(id, termin) {
  const z = S.zadania.find((x) => x.id === id);
  if (!z || (z.termin || '') === (termin || '')) return;
  zmienZadanie(id, { termin: termin || null, w_kalendarzu: false }, `Termin: ${nazwaDnia(z.termin)} → ${nazwaDnia(termin)}`,
    () => toast(termin ? `Zaplanowane: ${nazwaDnia(termin)}` : 'Bez terminu'));
}
function wybierzDate(id) {
  const z = S.zadania.find((x) => x.id === id);
  const inp = document.createElement('input');
  inp.type = 'date';
  inp.value = (z && z.termin) || dzis();
  inp.style.cssText = 'position:fixed;left:50%;top:40%;opacity:0;width:1px;height:1px';
  document.body.appendChild(inp);
  const sprzataj = () => setTimeout(() => inp.remove(), 500);
  inp.addEventListener('change', () => { if (inp.value) ustawDzien(id, inp.value); sprzataj(); });
  inp.addEventListener('blur', sprzataj);
  try { if (inp.showPicker) { inp.showPicker(); return; } } catch (e) { /* stara przeglądarka */ }
  inp.remove();
  otworz(id); // bez okienka daty: szczegóły zadania mają przyciski dni
}
// zwinięte grupy pamiętamy w przeglądarce; grupy list są domyślnie zwinięte
let ZWINIETE = {};
try { ZWINIETE = JSON.parse(localStorage.getItem('rm-zadania-zwiniete')) || {}; } catch (e) { ZWINIETE = {}; }
const czyZwiniete = (klucz_, domyslnie) => (klucz_ in ZWINIETE ? ZWINIETE[klucz_] : domyslnie);
function przelaczGrupe(klucz_, domyslnie) {
  ZWINIETE[klucz_] = !czyZwiniete(klucz_, domyslnie);
  try { localStorage.setItem('rm-zadania-zwiniete', JSON.stringify(ZWINIETE)); } catch (e) { /* brak */ }
}
function grupaHtml(klucz_, tytul, lista_, opcje = {}) {
  const zw = czyZwiniete(klucz_, !!opcje.domyslnieZwinieta);
  return `<div class="grupa${zw ? ' zwinieta' : ''}">
    <button class="group-title zwin${opcje.alert ? ' alert' : ''}" data-zwin="${esc(klucz_)}" data-domyslnie="${opcje.domyslnieZwinieta ? 1 : 0}" aria-expanded="${!zw}">
      <span class="strzalka">${zw ? '▸' : '▾'}</span> ${tytul} · ${lista_.length}</button>
    ${zw ? '' : lista_.map((z) => karta(z, opcje.karta || {})).join('')}
  </div>`;
}
function renderGrupy(zadania, pusto) {
  // pozycje z list bez terminu idą pod swoją listę, reszta według dat
  const naListach = {};
  const reszta = [];
  zadania.forEach((z) => {
    const l = z.lista_id && lista(z.lista_id);
    if (l && !z.termin) (naListach[l.id] = naListach[l.id] || []).push(z);
    else reszta.push(z);
  });
  const g = grupuj(reszta);
  let html = Object.entries(g).filter(([, l]) => l.length)
    .map(([n, l]) => grupaHtml(S.widok + ':' + n, n, l, { alert: n === 'Zaległe' })).join('');
  html += S.listy.filter((l) => naListach[l.id]).sort((a, b) => kluczListy(a) - kluczListy(b)).map((l) =>
    grupaHtml(S.widok + ':lista:' + l.id, `${esc(l.ikona)} ${esc(l.nazwa)}`,
      naListach[l.id].sort((a, b) => klucz(a) - klucz(b)), { domyslnieZwinieta: true, karta: { bezListy: true, uchwyt: true } })).join('');
  return html || `<div class="empty">${pusto}</div>`;
}
function statsHtml(pola) {
  return pola.map(([n, l, alert]) => `<div class="stat${alert && n ? ' alert' : ''}"><b>${n}</b><span>${l}</span></div>`).join('');
}
// pozycja listy bez terminu (np. opłaty, filmy do nagrania) nie jest "otwartym zadaniem" w licznikach
const naLiscieBezTerminu = (z) => !!(z.lista_id && !z.termin);
function renderStats(lista) {
  const t = dzis();
  const otwarte = lista.filter((z) => z.status !== 'zrobione');
  $('#stats').innerHTML = statsHtml([
    [otwarte.filter((z) => z.termin && z.termin < t).length, 'zaległe', true],
    [otwarte.filter((z) => (z.priorytet || 3) === 1 && !naLiscieBezTerminu(z)).length, 'pilne', true],
    [otwarte.filter((z) => z.termin === t).length, 'na dziś'],
    [otwarte.filter((z) => z.termin === plusDni(t, 1)).length, 'jutro'],
    [lista.filter((z) => z.status === 'zrobione' && tsDzien(z.zrobione_kiedy) === t).length, '✓ dziś']
  ]);
}
function renderFiltrOsob() {
  const el = $('#osoby-filtr');
  if (!jestemAdminem() || ['moje', 'panel', 'kredyty', 'listy', 'gantt'].includes(S.widok)) { el.style.display = 'none'; return; }
  el.style.display = '';
  el.innerHTML = `<button class="chip${S.filtrOsoba ? '' : ' on'}" data-osoba="">Wszyscy</button>` +
    aktywni().map((p) => `<button class="chip${S.filtrOsoba === p.id ? ' on' : ''}" data-osoba="${esc(p.id)}">${avatar(p.id, true)} ${esc(p.imie)}</button>`).join('');
}
function renderZakladki() {
  const lista = zakladki();
  if (!lista.includes(S.widok)) S.widok = lista[0];
  $('#tabs').innerHTML = lista.map((w) => `<button class="tab${S.widok === w ? ' on' : ''}" data-view="${w}">${WIDOKI[w]}</button>`).join('');
}

let przeciaganieWidoku = false;
function renderMain() {
  if ($('#view').classList.contains('przeciagam')) return; // nie przerywamy przeciągania odświeżeniem
  if (!przeciaganieWidoku) {
    przeciaganieWidoku = true;
    wlaczPrzeciaganie($('#view'), (id, prevId, nextId) => (lista(id) ? zapiszKolejnoscListy(id, prevId, nextId) : zapiszKolejnoscZadania(id, prevId, nextId)));
  }
  renderZakladki();
  document.body.classList.toggle('widok-kalendarz', S.widok === 'kalendarz');
  renderFiltrOsob();
  $('#szukaj').parentElement.style.display = ['panel', 'gantt'].includes(S.widok) ? 'none' : '';
  $('#szukaj').placeholder = S.widok === 'kredyty' ? 'Szukaj: klient, oferta, bank' : 'Szukaj: tytuł, oferta, opis';
  $('#fab').style.display = S.widok === 'panel' ? 'none' : '';
  $('#fab').setAttribute('aria-label', S.widok === 'kredyty' ? 'Nowy klient kredytowy' : 'Nowe zadanie');
  const v = $('#view');
  if (S.widok === 'panel') { v.innerHTML = htmlPanel(); return; }
  if (S.widok === 'kredyty') { v.innerHTML = htmlKredyty(); return; }
  if (S.widok === 'listy') { v.innerHTML = htmlListy(); return; }
  if (S.widok === 'gantt') { v.innerHTML = htmlGantt(); return; }
  const moje = S.widok === 'moje';
  const tylkoJa = moje || !jestemAdminem();
  const kogo = (z) => (tylkoJa ? z.przypisany === S.me.id : !S.filtrOsoba || z.przypisany === S.filtrOsoba);
  const zakres = robocze().filter(kogo).filter(pasuje);
  renderStats(zakres);
  if (S.widok === 'kalendarz') { v.innerHTML = htmlKalendarz(zakres); return; }
  if (S.widok === 'zrobione') {
    const zr = robocze().filter((z) => z.status === 'zrobione')
      .filter((z) => (jestemAdminem() ? !S.filtrOsoba || z.zrobione_przez === S.filtrOsoba || z.przypisany === S.filtrOsoba : z.przypisany === S.me.id || z.zrobione_przez === S.me.id))
      .filter(pasuje)
      .sort((a, b) => (b.zrobione_kiedy || '').localeCompare(a.zrobione_kiedy || ''));
    // każdy dzień osobno: pełna data z dniem tygodnia i wynik planu tego dnia
    const dni = {};
    zr.forEach((z) => { const d = tsDzien(z.zrobione_kiedy); (dni[d] = dni[d] || []).push(z); });
    let tydzien = null;
    v.innerHTML = Object.entries(dni).map(([d, l]) => {
      const pn = d ? plusDni(d, -((parseYmd(d).getDay() + 6) % 7)) : '';
      const nowyTydzien = pn !== tydzien; tydzien = pn;
      const w = podsumowanieDnia(d, S.filtrOsoba || null);
      const wynik = w.plan ? `<span class="day-score ${w.procent >= 80 ? 'ok' : w.procent >= 50 ? 'mid' : 'bad'}">plan ${w.zrobionePlan}/${w.plan} · ${w.procent}%</span>` : '';
      return (nowyTydzien && pn ? `<div class="week-sep">Tydzień od ${parseYmd(pn).getDate()} ${MIESIACE_D[parseYmd(pn).getMonth()]}</div>` : '')
        + `<div class="day-block"><button class="day-title" data-podsum="${d}"><span>${esc(naglowekDnia(d))}</span><span class="day-right">${wynik}<b>${l.length} ✓</b></span></button>`
        + l.map((z) => karta(z, { zrobione: true })).join('') + '</div>';
    }).join('') || '<div class="empty">Nic jeszcze nie zostało odhaczone w ostatnich 4 miesiącach.</div>';
    return;
  }
  v.innerHTML = renderGrupy(zakres.filter((z) => z.status !== 'zrobione'), moje ? 'Masz czysto. Nowe zadanie dodasz przyciskiem +' : 'Brak otwartych zadań.');
}

// ---------- PANEL MENEDŻERA ----------
function htmlPanel() {
  const t = dzis();
  const tydzienTemu = plusDni(t, -6);
  const otwarte = robocze().filter((z) => z.status !== 'zrobione');
  const zalegle = otwarte.filter((z) => z.termin && z.termin < t);
  const pilne = otwarte.filter((z) => (z.priorytet || 3) === 1 && !(z.termin && z.termin < t) && !naLiscieBezTerminu(z));
  const jutro = plusDni(t, 1);
  const zrob7 = robocze().filter((z) => z.status === 'zrobione' && tsDzien(z.zrobione_kiedy) >= tydzienTemu);
  const kWToku = S.kredyty.filter((k) => k.status === 'w_toku');
  $('#stats').innerHTML = statsHtml([
    [zalegle.length, 'zaległe w zespole', true],
    [pilne.length, 'pilne otwarte', true],
    [otwarte.filter((z) => z.termin === t).length, 'na dziś'],
    [otwarte.filter((z) => z.termin === jutro).length, 'jutro'],
    [zrob7.length, 'zrobione w 7 dni']
  ]);

  const kartyOsob = ROLE_GRUPY.map(([r]) => aktywni().filter((p) => p.rola === r)).flat().map((p) => {
    const moje = otwarte.filter((z) => z.przypisany === p.id);
    const zal = moje.filter((z) => z.termin && z.termin < t).length;
    const dz = moje.filter((z) => z.termin === t).length;
    const ju = moje.filter((z) => z.termin === jutro).length;
    const zad = moje.filter((z) => !naLiscieBezTerminu(z)).length;
    const lis = moje.filter(naLiscieBezTerminu).length;
    const zr = zrob7.filter((z) => z.zrobione_przez === p.id).length;
    const kr = p.rola === 'doradca' ? kWToku.filter((k) => k.doradca === p.id).length : null;
    return `<button class="person${zal ? ' alarm' : ''}" data-panel-osoba="${esc(p.id)}">
      <div class="person-top">${avatar(p.id)}<div><b>${esc(p.imie)}</b><small>${esc(ROLE[p.rola] || '')}</small></div></div>
      <div class="person-nums">
        <span><b class="${zal ? 'red' : ''}">${zal}</b>zaległe</span>
        <span><b>${dz}</b>na dziś</span>
        <span><b>${ju}</b>jutro</span>
        <span><b>${zad}</b>zadania</span>
        <span><b>${kr != null ? kr : lis}</b>${kr != null ? 'kredyty' : 'na listach'}</span>
        <span><b class="green">${zr}</b>zrobione 7 dni</span>
      </div>
    </button>`;
  }).join('');

  const etapyLicz = ETAPY.map((e) => ({ e, n: kWToku.filter((k) => (nastepnyEtap(k) || {}).k === e.k).length })).filter((x) => x.n);
  const ostatnie = robocze().filter((z) => z.status === 'zrobione').sort((a, b) => (b.zrobione_kiedy || '').localeCompare(a.zrobione_kiedy || '')).slice(0, 6);

  const dzisW = podsumowanieDnia(t, null);
  return `
    ${htmlWyniki()}
    <div class="group-title">Zespół · kliknij osobę, żeby zobaczyć jej zadania</div>
    <div class="people">${kartyOsob || '<div class="empty">Brak osób w zespole.</div>'}</div>
    <button class="link-btn" data-idz="settings">Zarządzaj zespołem: role, usuwanie osób</button>
    ${zalegle.length ? `<div class="group-title alert">Zaległe w zespole · ${zalegle.length}</div>${zalegle.sort(poPriorytecie).map((z) => karta(z)).join('')}` : ''}
    ${pilne.length ? `<div class="group-title">Pilne otwarte · ${pilne.length}</div>${pilne.sort(sortuj).map((z) => karta(z)).join('')}` : ''}
    <div class="group-title">Kredyty w toku · ${kWToku.length}</div>
    <div class="card">${etapyLicz.length ? etapyLicz.map((x) => `<div class="kr-row"><span>czeka na: ${esc(x.e.n)}</span><b>${x.n}</b></div>`).join('') : '<span class="hint">Brak kredytów w toku.</span>'}
      <button class="link-btn" data-widok="kredyty">Otwórz kredyty</button></div>
    ${S.kredyty.length ? `<div class="group-title">Ostatnie zmiany w kredytach</div>${S.kredyty.slice().sort((a, b) => (b.zmieniono || '').localeCompare(a.zmieniono || '')).slice(0, 5).map((k) => {
      const br = (k.braki || []).filter((x) => !x.zrobione).length;
      const nast = nastepnyEtap(k);
      return `<div class="task kredyt" data-kredyt="${esc(k.id)}"><div class="task-body"><div class="task-title">🏦 ${esc(k.klient)}</div>
        <div class="task-meta"><span>${etapyZrobione(k)}/${ETAPY.length}${k.status === 'w_toku' && nast ? ', następny: ' + esc(nast.n) : ', ' + esc(K_STATUSY[k.status])}</span>${br ? `<span class="tag p1">do uzupełnienia: ${br}</span>` : ''}</div>
        <div class="task-meta"><span>${esc(k.zmienil ? osoba(k.zmienil).imie : osoba(k.utworzyl).imie)}, ${esc(kiedyTs(k.zmieniono))}</span></div></div>${k.doradca ? avatar(k.doradca) : ''}</div>`;
    }).join('')}` : ''}
    ${ostatnie.length ? `<div class="group-title">Ostatnio zrobione</div>${ostatnie.map((z) => karta(z, { zrobione: true })).join('')}` : ''}`;
}

// ---------- KREDYTY ----------
function htmlKredyty() {
  const lista = S.kredyty.filter((k) => k.status === S.filtrKredyt).filter(pasuje)
    .sort((a, b) => etapyZrobione(a) - etapyZrobione(b) || (b.zmieniono || '').localeCompare(a.zmieniono || ''));
  const ile = (s) => S.kredyty.filter((k) => k.status === s).length;
  $('#stats').innerHTML = statsHtml([[ile('w_toku'), 'w toku'], [ile('uruchomiony'), 'uruchomione'], [ile('odpadl'), 'odpadły']]);
  const filtr = Object.entries(K_STATUSY).map(([k, n]) => `<button class="chip${S.filtrKredyt === k ? ' on' : ''}" data-kfiltr="${k}">${n} · ${ile(k)}</button>`).join('');
  const karty = lista.map((k) => {
    const n = etapyZrobione(k), nast = nastepnyEtap(k);
    const braki = (k.braki || []).filter((b) => !b.zrobione).length;
    return `<div class="task kredyt" data-kredyt="${esc(k.id)}">
      <div class="task-body">
        <div class="task-title">🏦 ${esc(k.klient)}</div>
        <div class="task-meta">${k.bank ? `<span>${esc(k.bank)}</span>` : ''}${k.oferta ? `<span class="tag">${esc(k.oferta)}</span>` : ''}</div>
        <div class="bar"><i style="width:${Math.round((n / ETAPY.length) * 100)}%"></i></div>
        <div class="task-meta"><span>${n}/${ETAPY.length}</span><span>${k.status === 'w_toku' && nast ? 'następny: ' + esc(nast.n) : esc(K_STATUSY[k.status])}</span>${braki ? `<span class="tag p1">do uzupełnienia: ${braki}</span>` : ''}</div>
        ${k.zmienil ? `<div class="task-meta"><span>zmiana: ${esc(osoba(k.zmienil).imie)}, ${esc(kiedyTs(k.zmieniono))}</span></div>` : ''}
      </div>
      ${k.doradca ? avatar(k.doradca) : ''}
    </div>`;
  }).join('');
  const info = mogeKredyty() ? '' : '<p class="hint">Widzisz klientów, których przekazałeś do doradcy. Etapy odhacza doradca.</p>';
  return `<div class="chips">${filtr}</div>${info}${karty || '<div class="empty">Brak klientów w tej grupie. Nowego dodasz przyciskiem +</div>'}`;
}
function otworzKredyt(k) {
  S.kredyt = k || null;
  const doradcy = aktywni().filter((p) => p.rola === 'doradca');
  S.kForm = k ? JSON.parse(JSON.stringify(k)) : {
    klient: '', oferta: '', bank: '', notatka: '', etapy: {}, braki: [], status: 'w_toku',
    doradca: mojaRola() === 'doradca' ? S.me.id : (doradcy[0] ? doradcy[0].id : null)
  };
  $('#k-tytul').textContent = k ? 'Klient kredytowy' : 'Nowy klient kredytowy';
  $('#k-klient').value = S.kForm.klient;
  $('#k-oferta').value = S.kForm.oferta;
  $('#k-bank').value = S.kForm.bank;
  $('#k-notatka').value = S.kForm.notatka;
  const banki = [...new Set(S.kredyty.map((x) => x.bank).filter(Boolean).concat(['PKO BP', 'Pekao', 'mBank', 'Santander', 'ING', 'Millennium', 'BNP Paribas', 'Alior', 'Credit Agricole', 'VeloBank']))];
  $('#banki-lista').innerHTML = banki.map((b) => `<option value="${esc(b)}">`).join('');
  $('#k-usun').style.display = k && jestemAdminem() ? '' : 'none';
  const tylkoOdczyt = k && !mogeKredyty();
  ['#k-klient', '#k-oferta', '#k-bank', '#k-notatka'].forEach((s) => { $(s).disabled = !!tylkoOdczyt; });
  $('#k-zapisz').style.display = tylkoOdczyt ? 'none' : '';
  rysujKredyt();
  wejdz('kredyt');
}
function rysujKredyt() {
  const f = S.kForm;
  const edytowalne = mogeKredyty() || !S.kredyt;
  const doradcy = S.osoby.filter((p) => (p.aktywny !== false && ['doradca', 'admin'].includes(p.rola)) || p.id === f.doradca);
  $('#k-doradca').innerHTML = doradcy.map((p) => `<button type="button" class="chip${f.doradca === p.id ? ' on' : ''}" data-kdoradca="${esc(p.id)}" ${edytowalne ? '' : 'disabled'}>${avatar(p.id, true)} ${esc(p.imie)}</button>`).join('');
  const mozeOdhaczac = mogeKredyty();
  $('#k-etapy-card').style.display = S.kredyt || mozeOdhaczac ? '' : 'none';
  $('#k-postep').textContent = `${etapyZrobione(f)}/${ETAPY.length}`;
  $('#k-etapy').innerHTML = ETAPY.map((e, i) => {
    const w = f.etapy && f.etapy[e.k];
    return `<button type="button" class="etap${w ? ' on' : ''}" data-etap="${e.k}" ${mozeOdhaczac ? '' : 'disabled'}>
      <span class="etap-box">${w ? '✓' : i + 1}</span>
      <span class="etap-txt">${esc(e.n)}${w ? `<small>${esc(osoba(w.kto).imie)}, ${esc(kiedyTs(w.kiedy))}</small>` : ''}</span>
    </button>`;
  }).join('');
  // do uzupełnienia: dopisuje menedżer albo doradca, odhacza doradca (lub menedżer)
  const braki = f.braki || [];
  const otwBraki = braki.filter((b) => !b.zrobione).length;
  $('#k-braki-licznik').textContent = braki.length ? `${otwBraki} z ${braki.length} brakuje` : '';
  $('#k-braki').innerHTML = braki.map((b) => `<div class="brak${b.zrobione ? ' on' : ''}">
      <button type="button" class="etap-box" data-brak="${esc(b.id)}" ${mozeOdhaczac ? '' : 'disabled'}>${b.zrobione ? '✓' : ''}</button>
      <span class="etap-txt">${esc(b.tekst)}<small>${b.zrobione ? `dostarczone: ${esc(osoba(b.kto_zrobil).imie)}, ${esc(kiedyTs(b.kiedy_zrobione))}` : `dopisał(a): ${esc(osoba(b.kto).imie)}, ${esc(kiedyTs(b.kiedy))}`}</small></span>
      ${mozeOdhaczac ? `<button type="button" class="mini-x" data-brak-usun="${esc(b.id)}" aria-label="Usuń">✕</button>` : ''}
    </div>`).join('') || '<p class="hint">Brak braków. Dopisz, czego doradca potrzebuje od klienta, np. zaświadczenie o zarobkach, wyciąg z konta, operat.</p>';
  $('#k-braki-dodaj').style.display = mozeOdhaczac ? '' : 'none';
  $('#k-status').innerHTML = Object.entries(K_STATUSY).map(([k, n]) => `<button type="button" data-kstatus="${k}" class="${f.status === k ? 'on' : ''}" ${mozeOdhaczac ? '' : 'disabled'}>${n}</button>`).join('');
}
async function zapiszKredyt(cicho) {
  const f = S.kForm;
  f.klient = $('#k-klient').value.trim();
  f.oferta = $('#k-oferta').value.trim();
  f.bank = $('#k-bank').value.trim();
  f.notatka = $('#k-notatka').value.trim();
  if (!f.klient) { toast('Wpisz klienta'); return false; }
  const nowe = !S.kredyt;
  const rekord = { klient: f.klient, oferta: f.oferta, bank: f.bank, notatka: f.notatka, etapy: f.etapy || {}, braki: f.braki || [], status: f.status, doradca: f.doradca || null, zmienil: S.me.id, zmieniono: new Date().toISOString() };
  if (nowe) { rekord.id = uuid(); rekord.utworzyl = S.me.id; } else rekord.id = S.kredyt.id;
  try {
    const w = await store.zapiszKredyt(rekord, nowe);
    const i = S.kredyty.findIndex((x) => x.id === w.id);
    if (i >= 0) S.kredyty[i] = w; else S.kredyty.push(w);
    S.kredyt = w;
    $('#k-usun').style.display = jestemAdminem() ? '' : 'none';
    if (!cicho) toast(nowe ? 'Klient dodany' : 'Zapisane');
    return true;
  } catch (e) { toast('Nie zapisano: ' + e.message); return false; }
}
$('#kredyt-form').addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b || b.disabled) return;
  const f = S.kForm;
  if (b.dataset.kdoradca) { f.doradca = b.dataset.kdoradca; rysujKredyt(); return; }
  if (b.dataset.brak) {
    const x = (f.braki || []).find((y) => y.id === b.dataset.brak);
    if (x) {
      x.zrobione = !x.zrobione;
      x.kto_zrobil = x.zrobione ? S.me.id : null;
      x.kiedy_zrobione = x.zrobione ? new Date().toISOString() : null;
      rysujKredyt();
      if (S.kredyt) await zapiszKredyt(true);
    }
    return;
  }
  if (b.dataset.brakUsun) {
    f.braki = (f.braki || []).filter((y) => y.id !== b.dataset.brakUsun);
    rysujKredyt();
    if (S.kredyt) await zapiszKredyt(true);
    return;
  }
  if (b.id === 'k-brak-btn') { await dodajBrak(); return; }
  if (b.dataset.etap) {
    f.etapy = f.etapy || {};
    if (f.etapy[b.dataset.etap]) delete f.etapy[b.dataset.etap];
    else f.etapy[b.dataset.etap] = { kiedy: new Date().toISOString(), kto: S.me.id };
    if (f.etapy.uruchomienie) f.status = 'uruchomiony';
    else if (f.status === 'uruchomiony') f.status = 'w_toku';
    rysujKredyt();
    if (S.kredyt) await zapiszKredyt(true); // odhaczenie zapisuje się od razu
    return;
  }
  if (b.dataset.kstatus) {
    f.status = b.dataset.kstatus; rysujKredyt();
    if (S.kredyt) { await zapiszKredyt(true); toast('Status: ' + K_STATUSY[f.status]); }
    return;
  }
  if (b.id === 'k-usun') {
    if (!confirm('Usunąć tego klienta kredytowego?')) return;
    try { await store.usunKredyt(S.kredyt.id); S.kredyty = S.kredyty.filter((x) => x.id !== S.kredyt.id); toast('Usunięte'); cofnij(); }
    catch (err) { toast(err.message); }
  }
});
async function dodajBrak() {
  const pole = $('#k-brak-tekst');
  const t = pole.value.trim();
  if (!t) return;
  pole.value = '';
  pole.focus();
  S.kForm.braki = (S.kForm.braki || []).concat([{ id: uuid(), tekst: t.slice(0, 200), kto: S.me.id, kiedy: new Date().toISOString(), zrobione: false }]);
  rysujKredyt();
  if (S.kredyt) await zapiszKredyt(true);
}
$('#k-brak-tekst').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); dodajBrak(); } });
$('#kredyt-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#k-zapisz').disabled = true;
  if (await zapiszKredyt(false)) cofnij();
  $('#k-zapisz').disabled = false;
});

// ---------- LISTY (zakładki jak w To Do) ----------
function htmlListy() {
  const otwarte = (id) => S.zadania.filter((z) => z.lista_id === id && z.status !== 'zrobione').length;
  const wszystkie = (id) => S.zadania.filter((z) => z.lista_id === id).length;
  const karta_ = (l) => `<div class="list-card" role="button" tabindex="0" data-id="${esc(l.id)}" data-otworz-liste="${esc(l.id)}">
      <span class="drag" data-drag="1" title="Przeciągnij, żeby zmienić kolejność">⠿</span>
      <span class="list-ico">${esc(l.ikona)}</span>
      <span class="list-name">${esc(l.nazwa)}<small>${l.szablon ? `szablon · ${wszystkie(l.id)} pozycji` : `${otwarte(l.id)} otwartych`}${l.wspolna ? '' : ' · prywatna'}${l.wlasciciel !== S.me.id ? ' · ' + esc(osoba(l.wlasciciel).imie) : ''}</small></span>
      <span class="list-count">${l.szablon ? '📑' : otwarte(l.id)}</span>
    </div>`;
  const q = S.szukaj.toLowerCase();
  const poKolei = (a, b) => kluczListy(a) - kluczListy(b);
  const zwykle = S.listy.filter((l) => !l.szablon).filter((l) => !q || l.nazwa.toLowerCase().includes(q)).sort(poKolei);
  const szablony = S.listy.filter((l) => l.szablon).sort(poKolei);
  const wynik = q ? robocze().filter((z) => z.lista_id).filter(pasuje) : [];
  $('#stats').innerHTML = statsHtml([[zwykle.length, 'list'], [szablony.length, 'szablonów'], [robocze().filter((z) => z.lista_id && z.status !== 'zrobione').length, 'otwartych na listach']]);
  return `
    ${wynik.length ? `<div class="group-title">Znalezione na listach · ${wynik.length}</div>${wynik.map((z) => karta(z)).join('')}` : ''}
    <div class="group-title">Listy</div>
    <div class="sortuj-listy">${zwykle.map(karta_).join('')}</div>${zwykle.length ? '' : '<div class="empty">Nie masz jeszcze list. Na przykład „Filmy do nagrania” albo „Opłaty, wrzesień”.</div>'}
    <button class="btn-ghost wide dashed" data-nowa-lista="zwykla">+ Nowa lista</button>
    <div class="group-title">Szablony · wzory do powielania co miesiąc</div>
    <div class="sortuj-listy">${szablony.map(karta_).join('')}</div>${szablony.length ? '' : '<p class="hint">Szablon to lista wzór, np. „Szablon, opłaty”. Jednym kliknięciem robisz z niej „Opłaty, październik” ze wszystkimi pozycjami.</p>'}
    <button class="btn-ghost wide dashed" data-nowa-lista="szablon">+ Nowy szablon</button>`;
}
async function nowaLista(szablon) {
  const nazwa = (prompt(szablon ? 'Nazwa szablonu (np. Szablon, opłaty):' : 'Nazwa listy (np. Filmy do nagrania):', '') || '').trim();
  if (!nazwa) return null;
  const ikona = /opłat|oplat|rachun|faktur|płat/i.test(nazwa) ? '💰' : /film|rolk|nagra|wideo/i.test(nazwa) ? '🎬' : /dokument|umow/i.test(nazwa) ? '📄' : '📋';
  try {
    const l = await store.zapiszListe({ id: uuid(), nazwa: nazwa.slice(0, 80), ikona, wspolna: true, szablon: !!szablon, wlasciciel: S.me.id }, true);
    S.listy.push(l);
    otworzListe(l.id);
    return l;
  } catch (e) { toast('Nie utworzono: ' + e.message); return null; }
}
function otworzListe(id) {
  S.otwartaLista = id;
  renderLista();
  if (biezacy() !== 'lista') wejdz('lista');
  setTimeout(() => { const i = $('#l-szybko'); if (i && !('ontouchstart' in window)) i.focus(); }, 50);
}
// kolejność na liście: ręczna (przeciąganie); bez ustawionej kolejności liczy się moment dodania
const klucz = (z) => (z.kolejnosc != null ? Number(z.kolejnosc) : (Date.parse(z.utworzono) || 0));
function renderLista() {
  const l = lista(S.otwartaLista);
  const el = $('#lista');
  if (!l) { el.innerHTML = '<div class="empty">Ta lista została usunięta.</div>'; el.dataset.lista = ''; return; }
  // szkielet z polem dodawania budujemy raz na listę, żeby odświeżanie nie zabierało kursora
  if (el.dataset.lista !== l.id) {
    el.dataset.lista = l.id;
    el.innerHTML = `
      <div id="l-head"></div>
      <form id="l-dodaj" class="quick-add"><input id="l-szybko" maxlength="300" placeholder="+ Dodaj pozycję i naciśnij Enter" autocomplete="off" enterkeyhint="done"><button class="btn-primary" type="submit">Dodaj</button></form>
      <p class="hint">Enter dodaje pozycję, a pole zostaje gotowe na następną. Kolejność zmienisz, przeciągając uchwyt ⠿. Osobę, termin i priorytet ustawisz po kliknięciu pozycji.</p>
      <div id="l-otwarte"></div>
      <div id="l-zrobione"></div>
      <div id="l-ustawienia"></div>`;
    $('#l-dodaj').onsubmit = (e) => { e.preventDefault(); dodajNaListe(); };
    wlaczPrzeciaganie($('#l-otwarte'));
  }
  const moja = l.wlasciciel === S.me.id || jestemAdminem();
  const zad = S.zadania.filter((z) => z.lista_id === l.id);
  const otwarte = zad.filter((z) => z.status !== 'zrobione').sort((a, b) => klucz(a) - klucz(b));
  const zrobione = zad.filter((z) => z.status === 'zrobione').sort((a, b) => (b.zrobione_kiedy || '').localeCompare(a.zrobione_kiedy || ''));
  const proc = zad.length ? Math.round((zrobione.length / zad.length) * 100) : 0;
  $('#l-head').innerHTML = `
    <div class="card">
      <div class="list-head"><span class="list-ico big">${esc(l.ikona)}</span><div><h1 class="detail-title">${esc(l.nazwa)}</h1>
      <small class="hint">${l.szablon ? 'Szablon' : 'Lista'} · ${l.wspolna ? 'wspólna dla zespołu' : 'prywatna'} · ${esc(osoba(l.wlasciciel).imie)}</small></div></div>
      ${!l.szablon && zad.length ? `<div class="bar"><i style="width:${proc}%"></i></div><small class="hint">${zrobione.length}/${zad.length} zrobione (${proc}%)</small>` : ''}
    </div>
    ${l.szablon ? '<button class="btn-primary wide" id="l-uzyj">📑 Utwórz listę z tego szablonu</button><div class="spacer"></div>' : ''}`;
  if (!$('#l-otwarte').classList.contains('przeciagam')) {
    $('#l-otwarte').innerHTML = otwarte.map((z) => karta(z, { bezListy: true, uchwyt: true })).join('') || '<div class="empty">Pusto. Dodaj pierwszą pozycję powyżej.</div>';
  }
  $('#l-zrobione').innerHTML = zrobione.length ? `<div class="group-title">Zrobione · ${zrobione.length}</div>${zrobione.map((z) => karta(z, { zrobione: true, bezListy: true })).join('')}` : '';
  $('#l-ustawienia').innerHTML = moja ? `<div class="card"><div class="card-title">Ustawienia listy</div>
      <div class="sub">Ikona</div><div class="chips" id="l-ikony">${IKONY_LIST.map((i) => `<button type="button" class="chip${l.ikona === i ? ' on' : ''}" data-ikona="${i}">${i}</button>`).join('')}</div>
      <div class="btn-row wrap">
        <button class="btn-ghost" id="l-nazwa">Zmień nazwę</button>
        <button class="btn-ghost" id="l-wspolna">${l.wspolna ? 'Zrób prywatną' : 'Udostępnij zespołowi'}</button>
        <button class="btn-ghost" id="l-szablon">${l.szablon ? 'Zamień w zwykłą listę' : 'Zapisz jako szablon'}</button>
        <button class="btn-danger" id="l-usun">Usuń listę</button>
      </div></div>` : '';
  const zmien = async (zm) => {
    try { const w = await store.zapiszListe(Object.assign({ id: l.id }, zm), false); Object.assign(l, w); renderLista(); }
    catch (err) { toast(err.message); }
  };
  if (l.szablon) $('#l-uzyj').onclick = () => uzyjSzablonu(l);
  if (!moja) return;
  $('#l-ikony').onclick = (e) => { const b = e.target.closest('[data-ikona]'); if (b) zmien({ ikona: b.dataset.ikona }); };
  $('#l-nazwa').onclick = () => { const n = (prompt('Nowa nazwa:', l.nazwa) || '').trim(); if (n) zmien({ nazwa: n.slice(0, 80) }); };
  $('#l-wspolna').onclick = () => zmien({ wspolna: !l.wspolna });
  $('#l-szablon').onclick = () => zmien({ szablon: !l.szablon });
  $('#l-usun').onclick = async () => {
    if (!confirm(`Usunąć listę „${l.nazwa}” razem z ${zad.length} pozycjami?`)) return;
    try { await store.usunListe(l.id); S.listy = S.listy.filter((x) => x.id !== l.id); S.zadania = S.zadania.filter((z) => z.lista_id !== l.id); toast('Lista usunięta'); cofnij(); }
    catch (err) { toast(err.message); }
  };
}
// seryjne dodawanie: pole czyści się od razu i zostaje aktywne, pozycja pojawia się bez czekania na bazę
async function dodajNaListe() {
  const l = lista(S.otwartaLista);
  const pole = $('#l-szybko');
  const t = pole.value.trim();
  if (!l || !t) return;
  pole.value = '';
  pole.focus();
  const z = { id: uuid(), tytul: t, typ: 'zadanie', przypisany: S.me.id, priorytet: 3, oferta: '', opis: '', status: 'otwarte', utworzyl: S.me.id, lista_id: l.id, kalendarz: false, w_kalendarzu: false, kolejnosc: Date.now(), utworzono: new Date().toISOString(), zmieniono: new Date().toISOString() };
  S.zadania.push(z);
  renderLista();
  try {
    const w = await store.zapiszZadanie(Object.assign({}, z), true, [`Dodano na listę: ${l.nazwa}`]);
    Object.assign(z, w);
  } catch (err) {
    S.zadania = S.zadania.filter((x) => x.id !== z.id);
    renderLista();
    if (!pole.value) pole.value = t;
    toast('Nie zapisano: ' + err.message);
  }
}
// przeciąganie za uchwyt ⠿ (palec albo mysz); zapisuje tylko przesuniętą pozycję
let ostatniePrzeciagniecie = 0;
const kluczListy = (l) => (l && l.kolejnosc ? Number(l.kolejnosc) : (Date.parse(l && l.utworzono) || 0));
// wspólny zapis nowej pozycji: środek między sąsiadami (zapisuje się tylko przesunięty element)
function nowaPozycja(kp, kn) {
  if (kp != null && kn != null) return (kp + kn) / 2;
  if (kp != null) return kp + 1000;
  if (kn != null) return kn - 1000;
  return null;
}
async function zapiszKolejnoscZadania(id, prevId, nextId) {
  const z = S.zadania.find((x) => x.id === id);
  const kp = prevId ? klucz(S.zadania.find((x) => x.id === prevId) || {}) : null;
  const kn = nextId ? klucz(S.zadania.find((x) => x.id === nextId) || {}) : null;
  const nowy = nowaPozycja(kp, kn);
  if (!z || nowy == null || nowy === klucz(z)) return;
  z.kolejnosc = nowy;
  try { await store.zapiszZadanie({ id, kolejnosc: nowy, zmieniono: new Date().toISOString() }, false, []); }
  catch (err) { toast('Nie zapisano kolejności: ' + err.message); }
}
async function zapiszKolejnoscListy(id, prevId, nextId) {
  const l = lista(id);
  const nowy = nowaPozycja(prevId ? kluczListy(lista(prevId)) : null, nextId ? kluczListy(lista(nextId)) : null);
  if (!l || nowy == null) return;
  l.kolejnosc = nowy;
  try { await store.zapiszListe({ id, kolejnosc: nowy }, false); }
  catch (err) { toast('Nie zapisano kolejności: ' + err.message); }
}
function wlaczPrzeciaganie(kontener, zapisz = zapiszKolejnoscZadania) {
  kontener.addEventListener('pointerdown', (e) => {
    const h = e.target.closest('[data-drag]');
    if (!h) return;
    e.preventDefault();
    e.stopPropagation();
    const el = h.closest('[data-id]');
    let startY = e.clientY;
    const startScroll = window.scrollY;
    kontener.classList.add('przeciagam');
    el.classList.add('dragging');
    try { h.setPointerCapture(e.pointerId); } catch (err) { /* stare przeglądarki */ }
    const przesun = (ev) => {
      if (ev.clientY < 90) window.scrollBy(0, -12);
      else if (ev.clientY > window.innerHeight - 90) window.scrollBy(0, 12);
      const top = el.offsetTop;
      const prev = el.previousElementSibling, next = el.nextElementSibling;
      if (prev && prev.dataset.id) {
        const r = prev.getBoundingClientRect();
        if (ev.clientY < r.top + r.height / 2) el.parentNode.insertBefore(el, prev);
      }
      if (next && next.dataset.id) {
        const r = next.getBoundingClientRect();
        if (ev.clientY > r.top + r.height / 2) el.parentNode.insertBefore(el, next.nextElementSibling);
      }
      startY += el.offsetTop - top; // element zmienił miejsce w układzie, palec zostaje na nim
      el.style.transform = `translateY(${ev.clientY - startY + (window.scrollY - startScroll)}px)`;
    };
    const koniec = async () => {
      h.removeEventListener('pointermove', przesun);
      h.removeEventListener('pointerup', koniec);
      h.removeEventListener('pointercancel', koniec);
      el.style.transform = '';
      el.classList.remove('dragging');
      kontener.classList.remove('przeciagam');
      ostatniePrzeciagniecie = Date.now();
      const prevEl = el.previousElementSibling, nextEl = el.nextElementSibling;
      await zapisz(el.dataset.id, prevEl && prevEl.dataset.id, nextEl && nextEl.dataset.id);
    };
    h.addEventListener('pointermove', przesun);
    h.addEventListener('pointerup', koniec);
    h.addEventListener('pointercancel', koniec);
  });
}
async function uzyjSzablonu(szablon) {
  const d = new Date();
  const baza = szablon.nazwa.replace(/^szablon\s*[,:\-–]?\s*/i, '').trim() || szablon.nazwa;
  const nazwa = (prompt('Nazwa nowej listy:', `${baza[0].toUpperCase() + baza.slice(1)}, ${MIESIACE[d.getMonth()]} ${d.getFullYear()}`) || '').trim();
  if (!nazwa) return;
  try {
    const nowa = await store.zapiszListe({ id: uuid(), nazwa: nazwa.slice(0, 80), ikona: szablon.ikona, wspolna: szablon.wspolna, szablon: false, wlasciciel: S.me.id }, true);
    S.listy.push(nowa);
    const pozycje = S.zadania.filter((z) => z.lista_id === szablon.id && z.status !== 'zrobione').sort((x, y) => klucz(x) - klucz(y));
    const baza0 = Date.now();
    for (const [i, p] of pozycje.entries()) {
      const z = { id: uuid(), kolejnosc: baza0 + i * 1000, tytul: p.tytul, typ: p.typ, przypisany: aktywni().some((o) => o.id === p.przypisany) ? p.przypisany : S.me.id, priorytet: p.priorytet || 3, oferta: p.oferta || '', opis: p.opis || '', status: 'otwarte', utworzyl: S.me.id, lista_id: nowa.id, kalendarz: false, w_kalendarzu: false, zmieniono: new Date().toISOString() };
      S.zadania.push(await store.zapiszZadanie(z, true, [`Z szablonu: ${szablon.nazwa}`]));
    }
    toast(`Gotowe: ${pozycje.length} pozycji`);
    otworzListe(nowa.id);
  } catch (e) { toast('Nie udało się: ' + e.message); }
}

// ---------- WYKRES GANTTA ----------
const GANTT_DNI = 21;
function ganttStart() { return S.ganttOd || plusDni(dzis(), -3); }
function htmlGantt() {
  const od = ganttStart(), doD = plusDni(od, GANTT_DNI - 1), t = dzis();
  if (S.ganttOsoba == null || !jestemAdminem()) S.ganttOsoba = S.me.id;
  const osobaFiltr = S.ganttOsoba;
  const dni = Array.from({ length: GANTT_DNI }, (_, i) => plusDni(od, i));
  const idx = (d) => Math.round((parseYmd(d) - parseYmd(od)) / 86400000);
  const zakres = robocze().filter((z) => z.termin && (!osobaFiltr || z.przypisany === osobaFiltr));
  const bezTerminu = robocze().filter((z) => !z.termin && z.status !== 'zrobione' && (!osobaFiltr || z.przypisany === osobaFiltr)).length;
  const pasek = (z) => {
    let start = z.od || z.termin; // jeden dzień, chyba że wpisano "Początek"
    if (start > z.termin) start = z.termin;
    if (z.termin < od || start > doD) return null;
    return { z, a: Math.max(0, idx(start)), b: Math.min(GANTT_DNI - 1, idx(z.termin)), uciete: start < od };
  };
  const ludzie = osobaFiltr ? [osoba(osobaFiltr)] : ROLE_GRUPY.map(([r]) => aktywni().filter((p) => p.rola === r)).flat();
  let r = 2;
  let wiersze = '';
  ludzie.forEach((p) => {
    const paski = zakres.filter((z) => z.przypisany === p.id).map(pasek).filter(Boolean)
      .sort((x, y) => x.a - y.a || (x.z.priorytet || 3) - (y.z.priorytet || 3));
    if (!osobaFiltr) { wiersze += `<div class="g-person" style="grid-row:${r}">${avatar(p.id, true)} ${esc(p.imie)} <small>${paski.length}</small></div>`; r++; }
    if (!paski.length) { wiersze += `<div class="g-name g-empty" style="grid-row:${r}">brak zadań w tym okresie</div>`; r++; }
    paski.forEach(({ z, a, b, uciete }) => {
      const stan = z.status === 'zrobione' ? 'done' : z.termin < t ? 'late' : z.status === 'w_toku' ? 'prog' : 'open';
      wiersze += `<button class="g-name" style="grid-row:${r}" data-open="${esc(z.id)}" title="${esc(z.tytul)}">${typ(z.typ).i} ${esc(z.tytul)}</button>`
        + `<button class="g-bar ${stan} p${z.priorytet || 3}${uciete ? ' cut' : ''}" style="grid-row:${r};grid-column:${a + 2} / ${b + 3}" data-open="${esc(z.id)}" title="${esc(z.tytul)}, termin ${esc(nazwaDnia(z.termin))}">${b - a >= 2 ? esc(z.tytul) : ''}</button>`;
      r++;
    });
  });
  const naglowek = dni.map((d, i) => {
    const x = parseYmd(d);
    return `<div class="g-day${d === t ? ' today' : ''}${[0, 6].includes(x.getDay()) ? ' we' : ''}" style="grid-column:${i + 2}"><small>${DNI[(x.getDay() + 6) % 7]}</small>${x.getDate()}</div>`;
  }).join('');
  const dzisKol = idx(t);
  const linia = dzisKol >= 0 && dzisKol < GANTT_DNI ? `<div class="g-today" style="grid-column:${dzisKol + 2};grid-row:1 / ${Math.max(r, 3)}"></div>` : '';
  const chipy = !jestemAdminem() ? '' : `<button class="chip${S.ganttOsoba === '' ? ' on' : ''}" data-gantt-osoba="">Cały zespół</button>` +
    aktywni().map((p) => `<button class="chip${S.ganttOsoba === p.id ? ' on' : ''}" data-gantt-osoba="${esc(p.id)}">${avatar(p.id, true)} ${esc(p.id === S.me.id ? p.imie + ' (ja)' : p.imie)}</button>`).join('');
  const pOd = parseYmd(od), pDo = parseYmd(doD);
  $('#stats').innerHTML = statsHtml([
    [zakres.filter((z) => z.status !== 'zrobione' && z.termin < t).length, 'po terminie', true],
    [zakres.filter((z) => z.status === 'w_toku').length, 'w toku'],
    [zakres.filter((z) => z.status !== 'zrobione' && z.termin >= t && z.termin <= plusDni(t, 7)).length, 'w 7 dni'],
    [bezTerminu, 'bez terminu']
  ]);
  return `
    <div class="chips chips-scroll">${chipy}</div>
    <div class="cal-head">
      <b>${pOd.getDate()} ${MIESIACE_D[pOd.getMonth()]} – ${pDo.getDate()} ${MIESIACE_D[pDo.getMonth()]}</b>
      <div class="cal-nav"><button data-gantt="-7" aria-label="Tydzień wstecz">‹</button><button data-gantt="0">Dziś</button><button data-gantt="7" aria-label="Tydzień dalej">›</button></div>
    </div>
    <div class="g-legend"><span class="lg open"></span>do zrobienia <span class="lg prog"></span>w toku <span class="lg late"></span>po terminie <span class="lg done"></span>zrobione</div>
    <div class="g-wrap"><div class="gantt" style="grid-template-columns: var(--g-name) repeat(${GANTT_DNI}, var(--g-day))">
      <div class="g-corner">Zadanie</div>${naglowek}${linia}${wiersze || '<div class="g-name g-empty" style="grid-row:2">Brak zadań z terminem w tym okresie</div>'}
    </div></div>
    <p class="hint">Każde zadanie to jeden dzień, jego termin. Dłuższy pasek pojawi się tylko wtedy, gdy w zadaniu wpiszesz „Początek” (zadanie na kilka dni).</p>`;
}

// ---------- PODSUMOWANIE DNIA (23:50) ----------
// plan dnia = zadania z terminem na ten dzień; wynik = ile z nich jest zrobionych
function podsumowanieDnia(d, osobaId) {
  const moje = (z) => !osobaId || z.przypisany === osobaId;
  const plan = robocze().filter((z) => z.termin === d && moje(z));
  const zrobionePlan = plan.filter((z) => z.status === 'zrobione');
  const niezrobione = plan.filter((z) => z.status !== 'zrobione').sort(poPriorytecie);
  const dodatkowe = robocze().filter((z) => z.status === 'zrobione' && tsDzien(z.zrobione_kiedy) === d && z.termin !== d && (!osobaId || z.zrobione_przez === osobaId || z.przypisany === osobaId));
  return { plan: plan.length, zrobionePlan: zrobionePlan.length, niezrobione, dodatkowe, procent: plan.length ? Math.round((zrobionePlan.length / plan.length) * 100) : 0 };
}
function wynikOkresu(od, doD, osobaId) {
  const plan = robocze().filter((z) => z.termin && z.termin >= od && z.termin <= doD && (!osobaId || z.przypisany === osobaId));
  const zr = plan.filter((z) => z.status === 'zrobione').length;
  return { plan: plan.length, zrobione: zr, procent: plan.length ? Math.round((zr / plan.length) * 100) : null };
}
function htmlWyniki() {
  const t = dzis(), od7 = plusDni(t, -6);
  const osoby = [null, S.me.id].concat(ROLE_GRUPY.map(([r]) => aktywni().filter((p) => p.rola === r && p.id !== S.me.id).map((p) => p.id)).flat());
  const kom = (w) => (w.plan ? `<b class="${w.procent >= 80 ? 'green' : w.procent < 50 ? 'red' : ''}">${w.procent}%</b><small>${w.zrobione}/${w.plan}</small>` : '<b class="muted">–</b><small>brak planu</small>');
  const pasek = (w) => `<span class="mini-bar"><i style="width:${w.procent || 0}%"></i></span>`;
  return `<div class="card wyniki"><div class="card-title">Wykonanie planu (zadania z terminem)</div>
    <div class="wynik-row head"><span></span><span>dziś</span><span>7 dni</span></div>
    ${osoby.map((id) => {
      const wd = wynikOkresu(t, t, id), w7 = wynikOkresu(od7, t, id);
      const nazwa = id ? `${avatar(id, true)} ${esc(osoba(id).imie)}${id === S.me.id ? ' (ja)' : ''} <small>${esc(ROLE[osoba(id).rola] || '')}</small>` : '👥 <b>Cały zespół</b>';
      return `<button class="wynik-row${id ? '' : ' razem'}" data-podsum="${t}" data-podsum-osoba="${id || ''}">
        <span class="wynik-kto">${nazwa}</span><span class="wynik-pct">${kom(wd)}${pasek(wd)}</span><span class="wynik-pct">${kom(w7)}${pasek(w7)}</span></button>`;
    }).join('')}
    <p class="hint">Kliknij wiersz: pełne podsumowanie dnia z listą tego, co nie zostało zrobione.</p></div>`;
}
function pokazPodsumowanie(d, osobaId) {
  // konkretna osoba z panelu; bez wskazania: menedżer widzi zespół, reszta siebie
  const kto = osobaId || (jestemAdminem() ? null : S.me.id);
  const naglowekOsoby = kto ? `${esc(osoba(kto).imie)} · ` : (jestemAdminem() ? 'Cały zespół · ' : '');
  const w = podsumowanieDnia(d, kto);
  const kolor = w.procent >= 80 ? 'var(--success)' : w.procent >= 50 ? 'var(--accent)' : 'var(--danger)';
  const zespol = jestemAdminem() && !kto ? aktywni().map((p) => ({ p, w: podsumowanieDnia(d, p.id) })).filter((x) => x.w.plan || x.w.dodatkowe.length) : [];
  const mojeNiezrobione = w.niezrobione.filter((z) => z.przypisany === S.me.id);
  $('#podsum').innerHTML = `
    <div class="card center">
      <div class="card-title">${naglowekOsoby}${esc(naglowekDnia(d))}</div>
      <div class="ring" style="--p:${w.procent};--c:${kolor}"><span>${w.plan ? w.procent + '%' : '–'}</span></div>
      <p class="big-line">${w.plan ? `Zrobione <b>${w.zrobionePlan}</b> z <b>${w.plan}</b> zaplanowanych${kto ? '' : ' w zespole'}` : 'Na ten dzień nic nie było zaplanowane'}</p>
      <p class="hint">${w.niezrobione.length ? `Nie zrobiono: <b>${w.niezrobione.length}</b>` : w.plan ? 'Wszystko z planu zrobione 👏' : ''}${w.dodatkowe.length ? ` · spoza planu zrobione: <b>${w.dodatkowe.length}</b>` : ''}</p>
    </div>
    ${zespol.length ? `<div class="card"><div class="card-title">Zespół</div>${zespol.map(({ p, w: x }) => `<div class="team-row">${avatar(p.id)}<div class="team-name">${esc(p.imie)}<small>${x.zrobionePlan}/${x.plan} z planu${x.dodatkowe.length ? `, +${x.dodatkowe.length} spoza planu` : ''}</small></div><b class="${x.plan && x.procent < 50 ? 'red' : ''}">${x.plan ? x.procent + '%' : '–'}</b></div>`).join('')}</div>` : ''}
    ${w.niezrobione.length ? `<div class="group-title alert">Nie zrobiono · ${w.niezrobione.length}</div>${w.niezrobione.map((z) => karta(z)).join('')}` : ''}
    ${mojeNiezrobione.length && d <= dzis() ? `<button class="btn-primary wide" id="p-przenies">Przenieś moje niezrobione (${mojeNiezrobione.length}) na ${d < dzis() ? 'dziś' : 'jutro'}</button><div class="spacer"></div>` : ''}
    ${w.dodatkowe.length ? `<div class="group-title">Zrobione spoza planu · ${w.dodatkowe.length}</div>${w.dodatkowe.map((z) => karta(z, { zrobione: true })).join('')}` : ''}`;
  const pb = $('#p-przenies');
  if (pb) pb.onclick = async () => {
    const cel = d < dzis() ? dzis() : plusDni(d, 1);
    pb.disabled = true;
    for (const z of mojeNiezrobione) {
      try {
        await store.zapiszZadanie({ id: z.id, termin: cel, w_kalendarzu: false, zmieniono: new Date().toISOString() }, false, [`Termin: ${nazwaDnia(z.termin)} → ${nazwaDnia(cel)} (przeniesione z podsumowania)`]);
        z.termin = cel; z.w_kalendarzu = false;
      } catch (e) { toast('Nie przeniesiono: ' + e.message); break; }
    }
    toast(`Przeniesione na ${nazwaDnia(cel)}`);
    pokazPodsumowanie(d, kto || '');
    odswiez();
  };
  try { localStorage.setItem('rm-podsum-' + d, '1'); } catch (e) { /* brak */ }
  if (biezacy() !== 'podsumowanie') wejdz('podsumowanie'); else window.scrollTo(0, 0);
}
// o 23:50 (gdy aplikacja jest otwarta) oraz przy pierwszym otwarciu następnego dnia
function sprawdzPodsumowanie(przyStarcie) {
  if (!S.me || !zakladki().includes('moje')) return;
  const teraz = new Date();
  const widziane = (d) => { try { return !!localStorage.getItem('rm-podsum-' + d); } catch (e) { return true; } };
  const kto = jestemAdminem() ? null : S.me.id;
  if (teraz.getHours() === 23 && teraz.getMinutes() >= 50 && !widziane(dzis()) && biezacy() === 'main') { pokazPodsumowanie(dzis()); return; }
  const wczoraj = plusDni(dzis(), -1);
  if (przyStarcie && !widziane(wczoraj) && podsumowanieDnia(wczoraj, kto).plan > 0) pokazPodsumowanie(wczoraj);
}
setInterval(() => sprawdzPodsumowanie(false), 30000);

// ---------- KALENDARZ ----------
function htmlKalendarz(zakres) {
  if (!S.kalMiesiac) { const d = parseYmd(S.kalDzien); S.kalMiesiac = new Date(d.getFullYear(), d.getMonth(), 1); }
  const m = S.kalMiesiac;
  const start = new Date(m);
  start.setDate(1 - ((m.getDay() + 6) % 7)); // poniedziałek
  const poDniu = {};
  zakres.filter((z) => z.termin).forEach((z) => { (poDniu[z.termin] = poDniu[z.termin] || []).push(z); });
  const t = dzis();
  let komorki = DNI.map((d) => `<div class="cal-dow">${d}</div>`).join('');
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    if (i === 35 && d.getMonth() !== m.getMonth()) break;
    const k = ymd(d);
    const l = (poDniu[k] || []).sort(poPriorytecie);
    const kl = ['cal-day', d.getMonth() !== m.getMonth() ? 'inny' : '', k === t ? 'dzis' : '', k === S.kalDzien ? 'wybrany' : '', i % 7 >= 5 ? 'weekend' : ''].join(' ');
    const kropki = l.slice(0, 6).map((z) => `<span class="dot${z.status === 'zrobione' ? ' done' : ''}" style="background:${esc(osoba(z.przypisany).kolor)}"></span>`).join('');
    // na komputerze zamiast kropek widać tytuły (jak w kalendarzu Google)
    const tytuly = l.slice(0, 3).map((z) => `<span class="cal-item${z.status === 'zrobione' ? ' done' : ''} p${z.priorytet || 3}" style="border-left-color:${esc(osoba(z.przypisany).kolor)}">${z.godzina ? esc(hhmm(z.godzina)) + ' ' : ''}${esc(z.tytul)}</span>`).join('');
    komorki += `<button class="${kl}" data-dzien="${k}"><span class="num">${d.getDate()}</span><span class="dots">${kropki}</span>${l.length > 6 ? `<span class="more mobile">+${l.length - 6}</span>` : ''}<span class="cal-items">${tytuly}${l.length > 3 ? `<span class="more">+${l.length - 3} więcej</span>` : ''}</span></button>`;
  }
  const naDzien = (poDniu[S.kalDzien] || []).sort(sortuj);
  const d = parseYmd(S.kalDzien);
  return `
    <div class="cal-layout"><div class="cal-left">
    <div class="cal-head">
      <b>${MIESIACE[m.getMonth()][0].toUpperCase() + MIESIACE[m.getMonth()].slice(1)} ${m.getFullYear()}</b>
      <div class="cal-nav">
        <button data-kal="-1" aria-label="Poprzedni miesiąc">‹</button>
        <button data-kal="0">Dziś</button>
        <button data-kal="1" aria-label="Następny miesiąc">›</button>
      </div>
    </div>
    <div class="cal-grid">${komorki}</div>
    </div><div class="cal-right">
    <div class="day-head">
      <b>${DNI_PELNE[d.getDay()]}, ${d.getDate()} ${MIESIACE_D[d.getMonth()]}</b>
      <button class="pill" data-dodaj-dzien="${S.kalDzien}">+ Dodaj na ten dzień</button>
    </div>
    ${naDzien.map((z) => karta(z, { bezDaty: true })).join('') || '<div class="empty">Nic zaplanowanego.</div>'}
    </div></div>`;
}

// ---------- ODHACZANIE ----------
async function zmienZadanie(id, zmiana, wpis, poZapisie) {
  const z = S.zadania.find((x) => x.id === id);
  if (!z) return;
  const kopia = Object.assign({}, z);
  Object.assign(z, zmiana, { zmieniono: new Date().toISOString() }); // od razu na ekranie
  odrysuj();
  try {
    await store.zapiszZadanie(Object.assign({ id }, zmiana, { zmieniono: z.zmieniono }), false, wpis ? [wpis] : []);
    if (poZapisie) poZapisie(kopia);
  } catch (e) {
    Object.assign(z, kopia); odrysuj();
    toast('Nie zapisano: ' + e.message);
  }
  odswiez();
}
function ustawStatus(id, status) {
  const z = S.zadania.find((x) => x.id === id);
  if (!z || z.status === status) return;
  const stary = z.status;
  const zmiana = { status };
  if (status === 'zrobione') { zmiana.zrobione_przez = S.me.id; zmiana.zrobione_kiedy = new Date().toISOString(); }
  else { zmiana.zrobione_przez = null; zmiana.zrobione_kiedy = null; }
  zmienZadanie(id, zmiana, `Status: ${STATUSY[stary]} → ${STATUSY[status]}`,
    () => { if (status === 'zrobione') toast('Zrobione ✓', 'Cofnij', () => ustawStatus(id, stary)); });
}
function dodajDoGoogle(id) {
  const z = S.zadania.find((x) => x.id === id);
  const url = z && linkGoogle(z);
  if (!url) { toast('Zadanie nie ma terminu'); return; }
  window.open(url, '_blank', 'noopener');
  if (z.przypisany === S.me.id && !z.w_kalendarzu) zmienZadanie(id, { w_kalendarzu: true }, 'Dodano do Kalendarza Google');
}
function odrysuj() {
  const e = biezacy();
  if (e === 'main') renderMain(); else if (e === 'detail') renderSzczegoly(); else if (e === 'lista') renderLista();
}

// ---------- SZCZEGÓŁY ZADANIA ----------
function otworz(id) {
  S.otwarte = id;
  renderSzczegoly();
  if (biezacy() !== 'detail') wejdz('detail');
}
let wpisyZadania = { id: null, lista: [] };
function renderSzczegoly() {
  const z = S.zadania.find((x) => x.id === S.otwarte);
  const el = $('#detail');
  if (!z) { el.innerHTML = '<div class="empty">To zadanie zostało usunięte.</div>'; return; }
  const moznaUsunac = z.utworzyl === S.me.id || jestemAdminem();
  const p = prio(z.priorytet);
  const info = [
    ['Rodzaj', `${typ(z.typ).i} ${typ(z.typ).n}`],
    ['Priorytet', `${p.i} ${p.n}`],
    ['Dla kogo', `${avatar(z.przypisany, true)} ${esc(osoba(z.przypisany).imie)}`],
    ['Termin', esc(z.termin ? nazwaDnia(z.termin) + (z.godzina ? ', ' + hhmm(z.godzina) : '') : 'bez terminu')],
    z.oferta ? ['Oferta', esc(z.oferta)] : null,
    z.kalendarz ? ['Kalendarz', z.w_kalendarzu ? '📅 dodane do Kalendarza Google' : '📅 do dodania przez: ' + esc(osoba(z.przypisany).imie)] : null,
    ['Zlecił(a)', `${esc(osoba(z.utworzyl).imie)}, ${esc(kiedyTs(z.utworzono))}`],
    z.status === 'zrobione' ? ['Zrobione', `${esc(osoba(z.zrobione_przez).imie)}, ${esc(kiedyTs(z.zrobione_kiedy))}`] : null
  ].filter(Boolean);
  el.innerHTML = `
    <div class="card">
      <h1 class="detail-title">${esc(z.tytul)}</h1>
      <div class="status-row">
        ${Object.entries(STATUSY).map(([k, n]) => `<button data-s="${k}" class="${z.status === k ? 'on' : ''}">${n}</button>`).join('')}
      </div>
    </div>
    <div class="card"><div class="card-title">Na który dzień</div>
      <div class="quick-dates">${[['Dziś', dzis()], ['Jutro', plusDni(dzis(), 1)], ['Pojutrze', plusDni(dzis(), 2)], ['Poniedziałek', plusDni(dzis(), ((8 - new Date().getDay()) % 7) || 7)]]
        .map(([n, d]) => `<button class="pill${z.termin === d ? ' on' : ''}" data-na-dzien="${d}" data-zadanie="${esc(z.id)}">${n}</button>`).join('')}
        <button class="pill" data-planuj="${esc(z.id)}">📅 Wybierz datę</button>
        ${z.termin ? `<button class="pill" data-na-dzien="" data-zadanie="${esc(z.id)}">Bez terminu</button>` : ''}</div>
    </div>
    ${z.termin ? `<button class="btn-gcal wide" data-gcal="${esc(z.id)}">📅 ${z.w_kalendarzu && z.przypisany === S.me.id ? 'Otwórz ponownie w Kalendarzu Google' : 'Dodaj do mojego Kalendarza Google'}</button>` : ''}
    <div class="card"><dl class="info">${info.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl></div>
    ${z.opis ? `<div class="card"><div class="card-title">Opis</div><div class="opis">${esc(z.opis)}</div></div>` : ''}
    <div class="card">
      <div class="card-title">Historia i komentarze</div>
      <ul class="hist" id="hist"><li class="hint">Wczytuję…</li></ul>
      <textarea class="komentarz" id="kom-tresc" rows="2" maxlength="2000" placeholder="Napisz, co zrobione albo gdzie utknęło"></textarea>
      <button class="btn-primary wide" id="kom-dodaj">Dodaj komentarz</button>
    </div>
    <div class="btn-row">
      <button class="btn-ghost" id="d-edytuj">Edytuj</button>
      ${moznaUsunac ? '<button class="btn-danger" id="d-usun">Usuń</button>' : ''}
    </div>`;
  el.querySelectorAll('.status-row button').forEach((b) => { b.onclick = () => ustawStatus(z.id, b.dataset.s); });
  $('#d-edytuj').onclick = () => otworzFormularz(z);
  if (moznaUsunac) $('#d-usun').onclick = async () => {
    if (!confirm('Usunąć to zadanie razem z historią?')) return;
    try { await store.usunZadanie(z.id); S.zadania = S.zadania.filter((x) => x.id !== z.id); toast('Usunięte'); cofnij(); }
    catch (e) { toast(e.message); }
  };
  $('#kom-dodaj').onclick = async () => {
    const t = $('#kom-tresc').value.trim();
    if (!t) return;
    $('#kom-dodaj').disabled = true;
    try { await store.dodajKomentarz(z.id, t); $('#kom-tresc').value = ''; await rysujWpisy(z.id); }
    catch (e) { toast('Nie zapisano: ' + e.message); }
    $('#kom-dodaj').disabled = false;
  };
  rysujWpisy(z.id);
}
async function rysujWpisy(id) {
  // najpierw to, co już mamy (bez migania), potem świeże z bazy
  if (wpisyZadania.id === id && $('#hist')) $('#hist').innerHTML = htmlWpisy(wpisyZadania.lista);
  try {
    wpisyZadania = { id, lista: await store.wpisy(id) };
    if (S.otwarte === id && $('#hist')) $('#hist').innerHTML = htmlWpisy(wpisyZadania.lista);
  } catch (e) {
    if ($('#hist')) $('#hist').innerHTML = '<li class="hint">Historia niedostępna bez sieci.</li>';
  }
}
function htmlWpisy(l) {
  if (!l.length) return '<li class="hint">Brak wpisów.</li>';
  return l.map((w) => `<li class="${esc(w.rodzaj)}">${avatar(w.autor, true)}<div><div class="kto">${esc(osoba(w.autor).imie)} · ${esc(kiedyTs(w.kiedy))}</div><div class="tresc">${esc(w.tresc)}</div></div></li>`).join('');
}

// ---------- FORMULARZ ZADANIA ----------
function otworzFormularz(z, preset = {}) {
  S.edycja = z || null;
  const f = z ? {
    tytul: z.tytul, typ: z.typ, przypisany: z.przypisany, termin: z.termin || '', godzina: hhmm(z.godzina),
    priorytet: z.priorytet || 3, oferta: z.oferta || '', opis: z.opis || '', kalendarz: !!z.kalendarz, lista_id: z.lista_id || null, od: z.od || ''
  } : Object.assign({ tytul: '', typ: 'zadanie', przypisany: S.me.id, termin: '', godzina: '', priorytet: 3, oferta: '', opis: '', kalendarz: false, lista_id: null, od: '' }, preset);
  S.form = f;
  $('#form-title').textContent = z ? 'Edycja zadania' : 'Nowe zadanie';
  $('#f-tytul').value = f.tytul;
  $('#f-termin').value = f.termin;
  $('#f-godzina').value = f.godzina;
  $('#f-od').value = f.od;
  $('#f-kalendarz').checked = f.kalendarz;
  $('#f-oferta').value = f.oferta;
  $('#f-opis').value = f.opis;
  rysujFormChipy();
  wejdz('form');
  if (!z) setTimeout(() => $('#f-tytul').focus(), 50);
}
function czesteOferty() {
  const licz = {};
  S.zadania.concat(S.kredyty).forEach((z) => { if (z.oferta) licz[z.oferta] = (licz[z.oferta] || 0) + 1; });
  return Object.keys(licz).sort((a, b) => licz[b] - licz[a]);
}
function rysujFormChipy() {
  const f = S.form;
  $('#f-typ').innerHTML = TYPY.map((t) => `<button type="button" class="chip${f.typ === t.k ? ' on' : ''}" data-typ="${t.k}">${t.i} ${t.n}</button>`).join('');
  $('#f-lista').innerHTML = `<button type="button" class="chip${!f.lista_id ? ' on' : ''}" data-lista-f="">Bez listy</button>` +
    S.listy.filter((l) => !l.szablon || l.id === f.lista_id).map((l) => `<button type="button" class="chip${f.lista_id === l.id ? ' on' : ''}" data-lista-f="${esc(l.id)}">${esc(l.ikona)} ${esc(l.nazwa)}</button>`).join('');
  $('#f-priorytet').innerHTML = PRIORYTETY.map((p) => `<button type="button" class="chip prio p${p.k}${Number(f.priorytet) === p.k ? ' on' : ''}" data-prio="${p.k}">${p.i} ${p.n}</button>`).join('');
  // wybór osoby pogrupowany: menedżer, asystentka, doradca, agenci
  $('#f-osoba').innerHTML = ROLE_GRUPY.map(([r, n]) => {
    const l = S.osoby.filter((p) => p.rola === r && (p.aktywny !== false || p.id === f.przypisany));
    if (!l.length) return '';
    return `<div class="sub mini">${n}</div><div class="chips">${l.map((p) =>
      `<button type="button" class="chip${f.przypisany === p.id ? ' on' : ''}" data-osoba-f="${esc(p.id)}">${avatar(p.id, true)} ${esc(p.id === S.me.id ? p.imie + ' (ja)' : p.imie)}</button>`).join('')}</div>`;
  }).join('');
  const t = dzis();
  const pon = plusDni(t, ((8 - parseYmd(t).getDay()) % 7) || 7);
  const szybkie = [['Dziś', t], ['Jutro', plusDni(t, 1)], ['Pojutrze', plusDni(t, 2)], ['Poniedziałek', pon], ['Bez terminu', '']];
  $('#f-szybkie').innerHTML = szybkie.map(([n, d]) => `<button type="button" class="pill${$('#f-termin').value === d ? ' on' : ''}" data-szybki="${d}">${n}</button>`).join('');
  const oferty = czesteOferty();
  $('#oferty-lista').innerHTML = oferty.map((o) => `<option value="${esc(o)}">`).join('');
  $('#f-oferty-chips').innerHTML = oferty.slice(0, 6).map((o) => `<button type="button" class="chip" data-oferta="${esc(o)}">${esc(o)}</button>`).join('');
  const maTermin = !!$('#f-termin').value;
  $('#f-kalendarz').disabled = !maTermin;
  if (!maTermin) $('#f-kalendarz').checked = false;
  $('#f-od').max = $('#f-termin').value || '';
  $('#f-kalendarz-opis').textContent = !maTermin ? 'Najpierw wybierz dzień'
    : f.przypisany === S.me.id ? 'Po zapisaniu otworzy się gotowe wydarzenie w Twoim kalendarzu'
      : `${osoba(f.przypisany).imie} zobaczy przycisk, który doda je do jej/jego kalendarza`;
}
$('#task-form').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.typ) { S.form.typ = b.dataset.typ; rysujFormChipy(); }
  else if (b.dataset.prio) { S.form.priorytet = Number(b.dataset.prio); rysujFormChipy(); }
  else if (b.dataset.listaF !== undefined) { S.form.lista_id = b.dataset.listaF || null; rysujFormChipy(); }
  else if (b.dataset.osobaF) { S.form.przypisany = b.dataset.osobaF; rysujFormChipy(); }
  else if (b.dataset.szybki !== undefined) { $('#f-termin').value = b.dataset.szybki; if (!b.dataset.szybki) $('#f-godzina').value = ''; rysujFormChipy(); }
  else if (b.dataset.oferta) { $('#f-oferta').value = b.dataset.oferta; }
});
$('#f-termin').addEventListener('change', rysujFormChipy);
$('#f-anuluj').addEventListener('click', cofnij);
$('#task-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = S.form;
  const z = {
    tytul: $('#f-tytul').value.trim(),
    typ: f.typ,
    przypisany: f.przypisany,
    termin: $('#f-termin').value || null,
    godzina: $('#f-godzina').value || null,
    priorytet: Number(f.priorytet) || 3,
    oferta: $('#f-oferta').value.trim(),
    opis: $('#f-opis').value.trim(),
    kalendarz: $('#f-kalendarz').checked && !!$('#f-termin').value,
    lista_id: f.lista_id || null,
    od: $('#f-od').value || null,
    zmieniono: new Date().toISOString()
  };
  if (!z.tytul) { toast('Wpisz, co trzeba zrobić'); return; }
  if (z.od && (!z.termin || z.od > z.termin)) { toast('Początek musi być przed terminem'); return; }
  const stare = S.edycja;
  const wpisy = [];
  // zmiana terminu albo osoby = trzeba dodać do kalendarza od nowa
  const zmianaTerminu = stare && ((stare.termin || '') !== (z.termin || '') || hhmm(stare.godzina) !== (z.godzina || '') || stare.przypisany !== z.przypisany);
  z.w_kalendarzu = stare && !zmianaTerminu ? !!stare.w_kalendarzu : false;
  // Kalendarz Google otwieramy od razu (przed zapisem), inaczej przeglądarka zablokuje okno
  const otworzGoogle = z.kalendarz && z.przypisany === S.me.id && !z.w_kalendarzu;
  if (otworzGoogle) { window.open(linkGoogle(z), '_blank', 'noopener'); z.w_kalendarzu = true; }
  if (!stare) {
    z.id = uuid();
    z.status = 'otwarte';
    z.utworzyl = S.me.id;
    wpisy.push(z.przypisany === S.me.id ? 'Utworzono zadanie' : `Zlecono: ${osoba(z.przypisany).imie}`);
  } else {
    z.id = stare.id;
    if (stare.przypisany !== z.przypisany) wpisy.push(`Przekazano: ${osoba(stare.przypisany).imie} → ${osoba(z.przypisany).imie}`);
    const tStary = (stare.termin || '') + ' ' + hhmm(stare.godzina), tNowy = (z.termin || '') + ' ' + (z.godzina || '');
    if (tStary.trim() !== tNowy.trim()) wpisy.push(`Termin: ${nazwaDnia(stare.termin)} ${hhmm(stare.godzina)} → ${nazwaDnia(z.termin)} ${z.godzina || ''}`.replace(/\s+/g, ' ').trim());
    if ((stare.priorytet || 3) !== z.priorytet) wpisy.push(`Priorytet: ${prio(stare.priorytet).n} → ${prio(z.priorytet).n}`);
    if ((stare.lista_id || null) !== z.lista_id) wpisy.push(`Lista: ${stare.lista_id && lista(stare.lista_id) ? lista(stare.lista_id).nazwa : 'bez listy'} → ${z.lista_id && lista(z.lista_id) ? lista(z.lista_id).nazwa : 'bez listy'}`);
    if (stare.tytul !== z.tytul || (stare.opis || '') !== z.opis || (stare.oferta || '') !== z.oferta || stare.typ !== z.typ) wpisy.push('Poprawiono treść zadania');
  }
  if (otworzGoogle) wpisy.push('Dodano do Kalendarza Google');
  $('#f-zapisz').disabled = true;
  try {
    const zapisane = await store.zapiszZadanie(z, !stare, wpisy);
    const niewidoczne = !jestemAdminem() && osoba(zapisane.przypisany).rola === 'admin' && zapisane.przypisany !== S.me.id;
    const i = S.zadania.findIndex((x) => x.id === zapisane.id);
    if (niewidoczne) { if (i >= 0) S.zadania.splice(i, 1); } // zlecone menedżerowi znika z widoku zlecającego
    else if (i >= 0) S.zadania[i] = zapisane; else S.zadania.push(zapisane);
    toast(stare ? 'Zapisane' : (z.przypisany === S.me.id ? 'Dodane' : `Zlecone: ${osoba(z.przypisany).imie}`));
    wpisyZadania = { id: null, lista: [] };
    cofnij();
    odswiez();
  } catch (err) {
    toast('Nie zapisano: ' + err.message);
  }
  $('#f-zapisz').disabled = false;
});

// ---------- GŁÓWNY: ZDARZENIA ----------
function ustawWidok(w) {
  S.widok = w;
  try { localStorage.setItem('rm-zadania-widok', w); } catch (err) { /* brak */ }
  renderMain();
  window.scrollTo(0, 0);
}
$('#tabs').addEventListener('click', (e) => { const b = e.target.closest('.tab'); if (b) ustawWidok(b.dataset.view); });
$('#osoby-filtr').addEventListener('click', (e) => {
  const b = e.target.closest('[data-osoba]');
  if (!b) return;
  S.filtrOsoba = b.dataset.osoba;
  renderMain();
});
$('#szukaj').addEventListener('input', (e) => { S.szukaj = e.target.value.trim(); renderMain(); });
document.addEventListener('click', (e) => {
  if (Date.now() - ostatniePrzeciagniecie < 400) return; // puszczenie po przeciągnięciu to nie kliknięcie
  const pl = e.target.closest('[data-planuj]');
  if (pl) { e.stopPropagation(); wybierzDate(pl.dataset.planuj); return; }
  const nd = e.target.closest('[data-na-dzien]');
  if (nd) { ustawDzien(nd.dataset.zadanie, nd.dataset.naDzien); return; }
  const zw = e.target.closest('[data-zwin]');
  if (zw) { przelaczGrupe(zw.dataset.zwin, zw.dataset.domyslnie === '1'); odrysuj(); return; }
  const g = e.target.closest('[data-gcal]');
  if (g) { e.stopPropagation(); dodajDoGoogle(g.dataset.gcal); return; }
  const t = e.target.closest('[data-toggle]');
  if (t) { const z = S.zadania.find((x) => x.id === t.dataset.toggle); if (z) ustawStatus(z.id, z.status === 'zrobione' ? 'otwarte' : 'zrobione'); return; }
  const o = e.target.closest('[data-open]');
  if (o) { otworz(o.dataset.open); return; }
  const kr = e.target.closest('[data-kredyt]');
  if (kr) { const k = S.kredyty.find((x) => x.id === kr.dataset.kredyt); if (k) otworzKredyt(k); return; }
  const ps = e.target.closest('[data-podsum]');
  if (ps) { pokazPodsumowanie(ps.dataset.podsum, ps.dataset.podsumOsoba); return; }
  const ol = e.target.closest('[data-otworz-liste]');
  if (ol) { otworzListe(ol.dataset.otworzListe); return; }
  const nl = e.target.closest('[data-nowa-lista]');
  if (nl) { nowaLista(nl.dataset.nowaLista === 'szablon'); return; }
  const go = e.target.closest('[data-gantt]');
  if (go) { const n = Number(go.dataset.gantt); S.ganttOd = n === 0 ? null : plusDni(ganttStart(), n); renderMain(); return; }
  const gp = e.target.closest('[data-gantt-osoba]');
  if (gp) { S.ganttOsoba = gp.dataset.ganttOsoba; renderMain(); return; }
  const kf = e.target.closest('[data-kfiltr]');
  if (kf) { S.filtrKredyt = kf.dataset.kfiltr; renderMain(); return; }
  const po = e.target.closest('[data-panel-osoba]');
  if (po) { S.filtrOsoba = po.dataset.panelOsoba; ustawWidok('wszystkie'); return; }
  const w = e.target.closest('[data-widok]');
  if (w) { ustawWidok(w.dataset.widok); return; }
  const idz = e.target.closest('[data-idz="settings"]');
  if (idz) { otworzUstawienia(); return; }
  const d = e.target.closest('[data-dzien]');
  if (d) { S.kalDzien = d.dataset.dzien; const x = parseYmd(S.kalDzien); if (x.getMonth() !== S.kalMiesiac.getMonth()) S.kalMiesiac = new Date(x.getFullYear(), x.getMonth(), 1); renderMain(); return; }
  const k = e.target.closest('[data-kal]');
  if (k) {
    const n = Number(k.dataset.kal);
    if (n === 0) { S.kalDzien = dzis(); S.kalMiesiac = null; }
    else S.kalMiesiac = new Date(S.kalMiesiac.getFullYear(), S.kalMiesiac.getMonth() + n, 1);
    renderMain(); return;
  }
  const a = e.target.closest('[data-dodaj-dzien]');
  if (a) otworzFormularz(null, { termin: a.dataset.dodajDzien });
});
$('#fab').addEventListener('click', () => {
  if (S.widok === 'kredyty') { otworzKredyt(null); return; }
  if (S.widok === 'listy') { nowaLista(false); return; }
  otworzFormularz(null, S.widok === 'kalendarz' ? { termin: S.kalDzien } : {});
});

// ---------- USTAWIENIA I ZESPÓŁ ----------
function otworzUstawienia() {
  const p = ja();
  $('#s-imie').value = p.imie || '';
  S.nowyKolor = p.kolor;
  rysujUstawienia();
  wejdz('settings');
}
$('#settings-btn').addEventListener('click', otworzUstawienia);
function rysujUstawienia() {
  $('#s-kolor').innerHTML = KOLORY.map((k) => `<button type="button" class="kolor${S.nowyKolor === k ? ' on' : ''}" style="background:${k}" data-kolor="${k}" aria-label="kolor"></button>`).join('');
  const admin = jestemAdminem();
  const lista = S.osoby.slice().sort((a, b) => (b.aktywny !== false) - (a.aktywny !== false) || ROLE_GRUPY.findIndex(([r]) => r === a.rola) - ROLE_GRUPY.findIndex(([r]) => r === b.rola));
  $('#s-zespol').innerHTML = lista.map((p) => {
    const nieaktywny = p.aktywny === false;
    const ja_ = p.id === S.me.id;
    const sterowanie = admin && !ja_ ? `
      <select data-rola-osoby="${esc(p.id)}" ${nieaktywny ? 'disabled' : ''}>${Object.entries(ROLE).map(([k, n]) => `<option value="${k}"${p.rola === k ? ' selected' : ''}>${n}</option>`).join('')}</select>
      ${nieaktywny ? `<button class="mini-btn" data-przywroc="${esc(p.id)}">Przywróć</button>` : `<button class="mini-btn danger" data-usun-osobe="${esc(p.id)}">Usuń</button>`}` : '';
    return `<div class="team-row${nieaktywny ? ' off' : ''}">${avatar(p.id)} <div class="team-name">${esc(p.imie)}${ja_ ? ' (ja)' : ''}<small>${esc(ROLE[p.rola] || p.rola || '')}${nieaktywny ? ', bez dostępu' : ''}</small></div>${sterowanie}</div>`;
  }).join('');
  $('#s-zespol-hint').textContent = admin
    ? (store.demo ? 'Tryb próbny.' : 'Nową osobę dodajesz w Supabase: Authentication, Users, Add user. Po pierwszym logowaniu pojawi się tutaj, wtedy ustaw jej rolę.') + ' Usunięcie odbiera dostęp od razu, historia zadań zostaje.'
    : '';
  $('#s-konto').textContent = store.demo ? 'Tryb próbny, baza niepodłączona.' : 'Zalogowano jako ' + (S.me.email || '');
}
$('#s-kolor').addEventListener('click', (e) => { const b = e.target.closest('[data-kolor]'); if (b) { S.nowyKolor = b.dataset.kolor; rysujUstawienia(); } });
$('#s-zespol').addEventListener('click', async (e) => {
  const u = e.target.closest('[data-usun-osobe]');
  const pr = e.target.closest('[data-przywroc]');
  const b = u || pr;
  if (!b) return;
  const p = osoba(u ? u.dataset.usunOsobe : pr.dataset.przywroc);
  if (u) {
    const otwarte = robocze().filter((z) => z.przypisany === p.id && z.status !== 'zrobione').length;
    if (!confirm(`Usunąć ${p.imie} z zespołu? Straci dostęp od razu.${otwarte ? `\n\nMa ${otwarte} otwartych zadań. Przekaż je komuś w zakładce Wszystkie (filtr: ${p.imie}).` : ''}`)) return;
  }
  try {
    await store.adminOsoba(p.id, !u, p.rola);
    await wczytajDane(); rysujUstawienia();
    toast(u ? `${p.imie} bez dostępu` : `${p.imie} przywrócony dostęp`);
  } catch (err) { toast('Nie udało się: ' + err.message); }
});
$('#s-zespol').addEventListener('change', async (e) => {
  const s = e.target.closest('[data-rola-osoby]');
  if (!s) return;
  const p = osoba(s.dataset.rolaOsoby);
  try { await store.adminOsoba(p.id, true, s.value); await wczytajDane(); rysujUstawienia(); toast(`${p.imie}: ${ROLE[s.value]}`); }
  catch (err) { toast('Nie udało się: ' + err.message); rysujUstawienia(); }
});
$('#s-zapisz').addEventListener('click', async () => {
  const imie = $('#s-imie').value.trim();
  if (!imie) { toast('Wpisz imię'); return; }
  try { await store.zapiszProfil({ imie, kolor: S.nowyKolor }); await wczytajDane(); rysujUstawienia(); toast('Profil zapisany'); }
  catch (e) { toast('Nie zapisano: ' + e.message); }
});
$('#s-wyloguj').addEventListener('click', async () => {
  await store.logout();
  S.me = null; S.ekrany = [];
  try { localStorage.removeItem(CACHE_KEY); localStorage.removeItem('rm-zadania-widok'); } catch (e) { /* brak */ }
  location.replace(location.pathname);
});

// ---------- LOGOWANIE ----------
$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#login-submit').disabled = true;
  $('#login-msg').textContent = '';
  try { S.me = await store.login($('#login-email').value.trim(), $('#login-pass').value); await start(); }
  catch (err) { $('#login-msg').textContent = /invalid/i.test(err.message) ? 'Zły e-mail albo hasło.' : 'Nie udało się zalogować: ' + err.message; }
  $('#login-submit').disabled = false;
});
$('#forgot-btn').addEventListener('click', async () => {
  const email = $('#login-email').value.trim();
  if (!email) { $('#login-msg').textContent = 'Wpisz najpierw swój e-mail, wyślę link do zmiany hasła.'; return; }
  try { await store.resetHasla(email); $('#login-msg').textContent = 'Wysłane. Sprawdź skrzynkę (także spam) i kliknij link.'; }
  catch (err) { $('#login-msg').textContent = 'Nie udało się wysłać: ' + err.message; }
});
$('#haslo-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try { await store.noweHaslo($('#haslo-nowe').value); toast('Hasło zmienione'); history.replaceState(null, '', location.pathname); await start(); }
  catch (err) { toast('Nie udało się: ' + err.message); }
});

async function start() {
  await wczytajDane();
  const p = S.osoby.find((x) => x.id === S.me.id);
  if (!p || p.aktywny === false) {
    baner(p ? 'Twoje konto zostało wyłączone. Napisz do Rafała.' : 'Twoje konto nie ma jeszcze profilu w zespole. Napisz do Rafała.');
  }
  let zapamietany = null;
  try { zapamietany = localStorage.getItem('rm-zadania-widok'); } catch (e) { /* brak */ }
  S.widok = zakladki().includes(zapamietany) ? zapamietany : zakladki()[0];
  S.ekrany = [];
  history.replaceState({ e: 'main' }, '');
  renderMain();
  pokaz('main');
  sprawdzPodsumowanie(true);
}

(async function init() {
  let odzyskiwanie = false;
  const user = await store.init(() => { odzyskiwanie = true; pokaz('haslo'); });
  store.naZmiany(() => { if (S.me) odswiez(); });
  if (odzyskiwanie || /type=recovery/.test(location.hash)) { S.me = user; pokaz('haslo'); return; }
  if (user) { S.me = user; await start(); return; }
  if (store.demo) {
    $('#demo-card').style.display = '';
    $('#login-form').closest('.card').style.display = 'none';
    $('#demo-users').innerHTML = store.demoOsoby().map((p) => `<button class="chip" data-demo="${esc(p.id)}">${esc(p.imie)} <small>${esc(ROLE[p.rola])}</small></button>`).join('');
    $('#demo-users').addEventListener('click', async (e) => {
      const b = e.target.closest('[data-demo]');
      if (b) { S.me = await store.loginDemo(b.dataset.demo); await start(); }
    });
  }
  pokaz('login');
})();
