-- İşçi Takip — gelişmiş özellikler
-- Mesai, işçi profili, gelir/gider kategorileri, ödeme yöntemi, şantiye ve bütçeler.
-- Tekrar çalıştırılabilir (idempotent). Supabase → SQL Editor'de bir kez çalıştırın.

-- ───────── İşçi profili ─────────
alter table public.workers add column if not exists role text not null default 'duz';     -- usta | kalfa | duz | diger
alter table public.workers add column if not exists iban text;
alter table public.workers add column if not exists overtime_rate numeric(12, 2);           -- saatlik mesai ücreti (boşsa yevmiye/8 × 1,5)
alter table public.workers add column if not exists emergency_contact text;

-- ───────── Puantaj: mesai ve not ─────────
alter table public.attendance add column if not exists overtime_hours numeric(5, 2) not null default 0 check (overtime_hours >= 0);
alter table public.attendance add column if not exists overtime_rate numeric(12, 2) not null default 0 check (overtime_rate >= 0);

-- ───────── Gelir / gider ayrıntısı ─────────
alter table public.expenses add column if not exists category text not null default 'diger';
alter table public.expenses add column if not exists method text not null default 'nakit';  -- nakit | banka | kart
alter table public.expenses add column if not exists site text;                             -- şantiye / proje
alter table public.incomes add column if not exists category text not null default 'hakedis';
alter table public.incomes add column if not exists method text not null default 'banka';
alter table public.incomes add column if not exists site text;
alter table public.payments add column if not exists method text not null default 'nakit';

-- ───────── Aylık bütçeler (gider kategorisi başına) ─────────
create table if not exists public.budgets (
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category text not null,
  monthly_limit numeric(12, 2) not null check (monthly_limit >= 0),
  primary key (owner_id, category)
);
alter table public.budgets enable row level security;
drop policy if exists "own budgets" on public.budgets;
create policy "own budgets" on public.budgets
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ───────── Bakiye görünümü: mesai dahil ─────────
create or replace view public.worker_balances
with (security_invoker = true) as
select
  w.id as worker_id,
  coalesce(a.worked_days, 0)::numeric as worked_days,
  coalesce(a.earned, 0)::numeric as earned,
  coalesce(p.paid, 0)::numeric as paid,
  (coalesce(a.earned, 0) - coalesce(p.paid, 0))::numeric as balance
from public.workers w
left join (
  select worker_id,
    sum(case status when 'full' then 1 when 'half' then 0.5 else 0 end) as worked_days,
    sum(daily_wage * case status when 'full' then 1 when 'half' then 0.5 else 0 end + overtime_hours * overtime_rate) as earned
  from public.attendance
  group by worker_id
) a on a.worker_id = w.id
left join (
  select worker_id, sum(amount) as paid from public.payments group by worker_id
) p on p.worker_id = w.id;
