-- ZADANIA RM, podsumowanie tygodnia per osoba (od 11.10.2026)
-- Uruchom RAZ w Supabase > SQL Editor. Zamiast KLUCZ_TUTAJ wstaw klucz z ~/.sekrety/zadania_klucz.txt
-- (ten sam klucz jest w zmiennej ZADANIA_KLUCZ środowiska chmury "Raport rynku"). Klucza NIE commitujemy.
--
-- Jak to działa: w niedzielę o 23:00 automat w chmurze (Olek) pobiera zadania zrobione w tygodniu
-- przez public.tydzien_dane(), ocenia je (ważne, administracyjne, teren, zjadacze czasu) i zapisuje
-- wynik przez public.zapisz_podsumowanie(). Aplikacja tylko czyta tabelę.

create table if not exists public.podsumowania_tygodnia (
  osoba uuid not null references public.profile(id) on delete cascade,
  tydzien date not null,                       -- poniedziałek tygodnia
  dane jsonb not null default '{}'::jsonb,     -- liczby, zjadacze czasu z powodem, komentarz
  utworzono timestamptz not null default now(),
  primary key (osoba, tydzien)
);
alter table public.podsumowania_tygodnia enable row level security;
drop policy if exists podsumowania_odczyt on public.podsumowania_tygodnia;
create policy podsumowania_odczyt on public.podsumowania_tygodnia for select to authenticated
  using (public.czy_admin() or osoba = auth.uid());
grant select on public.podsumowania_tygodnia to authenticated;

insert into prywatne.ustawienia (klucz, wartosc) values ('podsumowania_klucz', 'KLUCZ_TUTAJ')
  on conflict (klucz) do update set wartosc = excluded.wartosc;

create or replace function prywatne.klucz_ok(p text) returns boolean
language sql stable security definer set search_path = prywatne as $$
  select coalesce(p, '') <> '' and p = (select wartosc from prywatne.ustawienia where klucz = 'podsumowania_klucz');
$$;

-- zadania zrobione w tygodniu [p_od, p_od + 7 dni) czasu polskiego oraz plan tygodnia każdej osoby
create or replace function public.tydzien_dane(p_klucz text, p_od date) returns jsonb
language plpgsql stable security definer set search_path = public, prywatne as $$
begin
  if not prywatne.klucz_ok(p_klucz) then raise exception 'zly klucz'; end if;
  return jsonb_build_object(
    'od', p_od,
    'osoby', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'imie', imie, 'rola', rola)), '[]'::jsonb)
              from public.profile where aktywny),
    'zrobione', (select coalesce(jsonb_agg(jsonb_build_object(
                   'id', z.id, 'osoba', coalesce(z.zrobione_przez, z.przypisany), 'tytul', z.tytul, 'typ', z.typ,
                   'priorytet', z.priorytet, 'oferta', z.oferta, 'lista', l.nazwa, 'termin', z.termin,
                   'kiedy', (z.zrobione_kiedy at time zone 'Europe/Warsaw'))), '[]'::jsonb)
                 from public.zadania z left join public.listy l on l.id = z.lista_id
                 where z.status = 'zrobione'
                   and (z.zrobione_kiedy at time zone 'Europe/Warsaw')::date >= p_od
                   and (z.zrobione_kiedy at time zone 'Europe/Warsaw')::date < p_od + 7),
    'plan', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
               select jsonb_build_object('osoba', przypisany, 'zaplanowane', count(*),
                                         'zrobione', count(*) filter (where status = 'zrobione')) x
               from public.zadania
               where przypisany is not null and termin >= p_od and termin < p_od + 7
               group by przypisany) t)
  );
end $$;

create or replace function public.zapisz_podsumowanie(p_klucz text, p_osoba uuid, p_tydzien date, p_dane jsonb) returns void
language plpgsql security definer set search_path = public, prywatne as $$
begin
  if not prywatne.klucz_ok(p_klucz) then raise exception 'zly klucz'; end if;
  insert into public.podsumowania_tygodnia (osoba, tydzien, dane, utworzono) values (p_osoba, p_tydzien, p_dane, now())
    on conflict (osoba, tydzien) do update set dane = excluded.dane, utworzono = now();
end $$;

revoke all on function prywatne.klucz_ok(text) from public, anon, authenticated;
revoke all on function public.tydzien_dane(text, date) from public;
revoke all on function public.zapisz_podsumowanie(text, uuid, date, jsonb) from public;
grant execute on function public.tydzien_dane(text, date) to anon, authenticated;
grant execute on function public.zapisz_podsumowanie(text, uuid, date, jsonb) to anon, authenticated;
