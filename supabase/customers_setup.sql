-- Customers table setup for ZADA
-- This will store customer profiles for easier reordering

-- Create customers table
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  phone text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create function to update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger for updated_at
drop trigger if exists update_customers_updated_at on public.customers;
create trigger update_customers_updated_at
  before update on public.customers
  for each row
  execute function public.update_updated_at_column();

-- Add helpful indexes
create index if not exists idx_customers_email on public.customers (email);
create index if not exists idx_customers_created_at on public.customers (created_at);

-- Enable RLS and open dev policies (tighten later)
alter table public.customers enable row level security;

-- Dev policies (open for now)
do $$
begin
  if not exists (select 1 from pg_policies where policyname='customers_select_all_dev') then
    create policy "customers_select_all_dev" on public.customers for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname='customers_insert_all_dev') then
    create policy "customers_insert_all_dev" on public.customers for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname='customers_update_all_dev') then
    create policy "customers_update_all_dev" on public.customers for update using (true);
  end if;
end $$;

-- Create orders table to link with customers (if not exists)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id),
  order_number text unique not null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  delivery_address text not null,
  items jsonb not null,
  total_amount decimal(10,2) not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')),
  payment_method text default 'cash',
  delivery_zone text,
  priority text default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  notes text,
  estimated_delivery timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add indexes for orders
create index if not exists idx_orders_customer_id on public.orders (customer_id);
create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_orders_created_at on public.orders (created_at);
create index if not exists idx_orders_order_number on public.orders (order_number);

-- Trigger for orders updated_at
drop trigger if exists update_orders_updated_at on public.orders;
create trigger update_orders_updated_at
  before update on public.orders
  for each row
  execute function public.update_updated_at_column();

-- Enable RLS for orders
alter table public.orders enable row level security;

-- Dev policies for orders
do $$
begin
  if not exists (select 1 from pg_policies where policyname='orders_select_all_dev') then
    create policy "orders_select_all_dev" on public.orders for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname='orders_insert_all_dev') then
    create policy "orders_insert_all_dev" on public.orders for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname='orders_update_all_dev') then
    create policy "orders_update_all_dev" on public.orders for update using (true);
  end if;
end $$;

-- Sample data (optional - remove in production)
-- insert into public.customers (email, name, phone, address) values 
-- ('john@example.com', 'John Doe', '+1234567890', '123 Main St, City, State'),
-- ('jane@example.com', 'Jane Smith', '+0987654321', '456 Oak Ave, City, State');
