-- İşçi Takip - Supabase şeması
-- Her kayıt, onu oluşturan admin kullanıcıya (auth.users) aittir ve RLS ile korunur.

create extension if not exists "pgcrypto";

-- İşletme profili (her kullanıcı = bir işletme / usta başı)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  business_name text,
  created_at timestamptz not null default now()
);

-- İşçiler
create table if not exists public.workers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  full_name text not null,
  phone text,
  daily_wage numeric(12, 2) not null check (daily_wage >= 0),
  start_date date not null default current_date,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists workers_owner_idx on public.workers (owner_id);

-- Puantaj: işçi başına günde tek kayıt.
-- status: full = tam gün, half = yarım gün, absent = gelmedi, leave = izinli
-- daily_wage o günkü yevmiyenin kopyasıdır; işçinin yevmiyesi sonradan değişse de geçmiş bozulmaz.
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  worker_id uuid not null references public.workers (id) on delete cascade,
  work_date date not null,
  status text not null check (status in ('full', 'half', 'absent', 'leave')),
  daily_wage numeric(12, 2) not null check (daily_wage >= 0),
  note text,
  created_at timestamptz not null default now(),
  unique (worker_id, work_date)
);
create index if not exists attendance_owner_date_idx on public.attendance (owner_id, work_date);

-- İşçiye yapılan ödemeler (avans / maaş ödemesi)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  worker_id uuid not null references public.workers (id) on delete cascade,
  pay_date date not null default current_date,
  amount numeric(12, 2) not null check (amount > 0),
  kind text not null default 'advance' check (kind in ('advance', 'payment')),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists payments_owner_date_idx on public.payments (owner_id, pay_date);

-- İşletme gelirleri (hakediş, müşteri ödemesi vb.)
create table if not exists public.incomes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  income_date date not null default current_date,
  amount numeric(12, 2) not null check (amount > 0),
  description text,
  created_at timestamptz not null default now()
);
create index if not exists incomes_owner_date_idx on public.incomes (owner_id, income_date);

-- Diğer işletme giderleri (malzeme, nakliye vb.)
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  expense_date date not null default current_date,
  amount numeric(12, 2) not null check (amount > 0),
  description text,
  created_at timestamptz not null default now()
);
create index if not exists expenses_owner_date_idx on public.expenses (owner_id, expense_date);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.workers enable row level security;
alter table public.attendance enable row level security;
alter table public.payments enable row level security;
alter table public.incomes enable row level security;
alter table public.expenses enable row level security;

create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "own workers" on public.workers
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "own attendance" on public.attendance
  for all using (owner_id = auth.uid()) with check (
    owner_id = auth.uid()
    and exists (select 1 from public.workers w where w.id = worker_id and w.owner_id = auth.uid())
  );

create policy "own payments" on public.payments
  for all using (owner_id = auth.uid()) with check (
    owner_id = auth.uid()
    and exists (select 1 from public.workers w where w.id = worker_id and w.owner_id = auth.uid())
  );

create policy "own incomes" on public.incomes
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "own expenses" on public.expenses
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Yeni üye olunca profil satırı oluştur
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, business_name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'business_name'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- İşçi bazında toplam bakiye (tüm zamanlar). security_invoker sayesinde RLS geçerlidir.
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
    sum(daily_wage * case status when 'full' then 1 when 'half' then 0.5 else 0 end) as earned
  from public.attendance
  group by worker_id
) a on a.worker_id = w.id
left join (
  select worker_id, sum(amount) as paid from public.payments group by worker_id
) p on p.worker_id = w.id;
