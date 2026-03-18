-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROPERTIES
create table public.properties (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  address text not null,
  city text not null default 'Vancouver',
  province text not null default 'BC',
  postal_code text,
  landlord_name text not null default 'Warrington Residential',
  pm_name text,
  pm_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- UNITS
create table public.units (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid references public.properties(id) on delete cascade,
  unit_number text not null,
  floor integer,
  bedrooms integer default 1,
  created_at timestamptz default now()
);

-- USERS (extends Supabase auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'building_manager' check (role in ('admin','property_manager','building_manager')),
  property_id uuid references public.properties(id),
  avatar_url text,
  created_at timestamptz default now()
);

-- INSPECTIONS
create table public.inspections (
  id uuid primary key default uuid_generate_v4(),
  unit_id uuid references public.units(id) on delete cascade,
  property_id uuid references public.properties(id),
  type text not null check (type in ('move_in','move_out')),
  status text not null default 'draft' check (status in ('draft','in_progress','tenant_signing','pm_signing','complete')),
  tenant_name text not null,
  tenant_email text,
  possession_date date,
  inspection_date date,
  end_of_tenancy_date date,
  move_in_agent text,
  move_out_agent text,
  res_mgr_inspecting text,
  linked_move_in_id uuid references public.inspections(id),
  smoke_alarm_move_in text,
  smoke_alarm_move_out text,
  smoke_alarm_comment text,
  keys_suite_given integer, keys_suite_returned integer,
  keys_building_given integer, keys_building_returned integer,
  keys_mailbox_given integer, keys_mailbox_returned integer,
  fob1_code text, fob2_code text, fob3_code text,
  bike_room_given integer, bike_room_returned integer,
  parking_stall text, parking_decal text, locker text,
  keys_missing boolean default false,
  tenant_agrees boolean,
  tenant_disagrees_reason text,
  tenant_signature text,
  tenant_signed_at timestamptz,
  pm_signature text,
  pm_signed_at timestamptz,
  pm_name text,
  tenant_forwarding_apt text,
  tenant_forwarding_street text,
  tenant_forwarding_city text,
  tenant_forwarding_province text,
  tenant_forwarding_postal text,
  tenant_phone_home text,
  tenant_phone_cell text,
  repairs_at_start text,
  pdf_url text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- INSPECTION ITEMS (the condition rows)
create table public.inspection_items (
  id uuid primary key default uuid_generate_v4(),
  inspection_id uuid references public.inspections(id) on delete cascade,
  section text not null,
  item_name text not null,
  move_in_code text,
  move_in_comment text,
  move_out_code text,
  move_out_comment text,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- PHOTOS
create table public.inspection_photos (
  id uuid primary key default uuid_generate_v4(),
  inspection_id uuid references public.inspections(id) on delete cascade,
  item_id uuid references public.inspection_items(id) on delete set null,
  section text,
  label text,
  storage_path text not null,
  public_url text,
  taken_at timestamptz default now(),
  created_at timestamptz default now()
);

-- DEPOSIT STATEMENT
create table public.deposit_statements (
  id uuid primary key default uuid_generate_v4(),
  inspection_id uuid unique references public.inspections(id) on delete cascade,
  unpaid_rent numeric(10,2) default 0,
  liquidated_damages numeric(10,2) default 0,
  carpet_cleaning numeric(10,2) default 0,
  window_cover_cleaning numeric(10,2) default 0,
  suite_cleaning numeric(10,2) default 0,
  painting numeric(10,2) default 0,
  repair_replacement numeric(10,2) default 0,
  key_fob_replacement numeric(10,2) default 0,
  pet_damage numeric(10,2) default 0,
  other_charges numeric(10,2) default 0,
  security_deposit numeric(10,2) default 0,
  key_deposit numeric(10,2) default 0,
  accrued_interest numeric(10,2) default 0,
  other_deposit numeric(10,2) default 0,
  tenant_forfeit_amount numeric(10,2),
  tenant_forfeit_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- AUDIT LOG
create table public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  inspection_id uuid references public.inspections(id) on delete cascade,
  user_id uuid references auth.users(id),
  user_name text,
  action text not null,
  details jsonb,
  created_at timestamptz default now()
);

-- RLS POLICIES
alter table public.properties enable row level security;
alter table public.units enable row level security;
alter table public.profiles enable row level security;
alter table public.inspections enable row level security;
alter table public.inspection_items enable row level security;
alter table public.inspection_photos enable row level security;
alter table public.deposit_statements enable row level security;
alter table public.audit_logs enable row level security;

-- Allow authenticated users to read everything (simplify for MVP)
create policy "authenticated read properties" on public.properties for select to authenticated using (true);
create policy "authenticated read units" on public.units for select to authenticated using (true);
create policy "authenticated manage inspections" on public.inspections for all to authenticated using (true);
create policy "authenticated manage items" on public.inspection_items for all to authenticated using (true);
create policy "authenticated manage photos" on public.inspection_photos for all to authenticated using (true);
create policy "authenticated manage deposits" on public.deposit_statements for all to authenticated using (true);
create policy "authenticated manage audits" on public.audit_logs for all to authenticated using (true);
create policy "users manage own profile" on public.profiles for all to authenticated using (auth.uid() = id);
create policy "admin manage properties" on public.properties for all to authenticated using (true);
create policy "admin manage units" on public.units for all to authenticated using (true);

-- STORAGE BUCKET (run this separately in Supabase dashboard)
-- insert into storage.buckets (id, name, public) values ('inspection-photos', 'inspection-photos', true);

-- FUNCTIONS
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', coalesce(new.raw_user_meta_data->>'role', 'building_manager'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- SEED: default sections/items template
create table public.inspection_templates (
  id uuid primary key default uuid_generate_v4(),
  section text not null,
  item_name text not null,
  sort_order integer default 0
);

insert into public.inspection_templates (section, item_name, sort_order) values
('Entry, Halls & Stairs', 'Walls, Ceiling and Trim', 1),
('Entry, Halls & Stairs', 'Front Door', 2),
('Entry, Halls & Stairs', 'Closets', 3),
('Entry, Halls & Stairs', 'Light Fixtures / Electrical Outlets / Bulbs', 4),
('Entry, Halls & Stairs', 'Hard Floor / Carpet / Tile / Linoleum', 5),
('Kitchen', 'Walls, Ceiling and Trim', 10),
('Kitchen', 'Hard Floor / Carpet / Tile / Linoleum', 11),
('Kitchen', 'Countertop / Cabinets / Closets', 12),
('Kitchen', 'Stove / Oven / Hoodfan', 13),
('Kitchen', 'Taps, Sink, Garburator and Stoppers', 14),
('Kitchen', 'Dishwasher / Microwave', 15),
('Kitchen', 'Refrigerator', 16),
('Kitchen', 'Light Fixtures / Electrical Outlets / Bulbs', 17),
('Kitchen', 'Windows / Coverings / Screens / Blinds', 18),
('Dining Area', 'Walls, Ceiling and Trim', 20),
('Dining Area', 'Hard Floor / Carpet / Tile / Linoleum', 21),
('Dining Area', 'Light Fixtures / Electrical Outlets / Bulbs', 22),
('Dining Area', 'Windows / Coverings / Screens / Blinds', 23),
('Living Room', 'Walls, Ceiling and Trim', 30),
('Living Room', 'Hard Floor / Carpet / Tile / Linoleum', 31),
('Living Room', 'Fireplace', 32),
('Living Room', 'Patio Door / Curtains / Blinds', 33),
('Living Room', 'Light Fixtures / Electrical Outlets / Bulbs', 34),
('First Bathroom', 'Walls, Ceiling and Trim', 40),
('First Bathroom', 'Cabinets and Mirror', 41),
('First Bathroom', 'Tub / Shower / Taps / Stopper', 42),
('First Bathroom', 'Sink / Stopper / Taps', 43),
('First Bathroom', 'Toilet', 44),
('First Bathroom', 'Floor', 45),
('First Bathroom', 'Tiles / Grout', 46),
('First Bathroom', 'Light Fixtures / Electrical Outlets / Bulbs', 47),
('First Bathroom', 'Windows / Coverings / Screens / Blinds', 48),
('First Bathroom', 'Door / Fan', 49),
('Stairwell & Hall', 'Walls, Ceiling and Trim', 50),
('Stairwell & Hall', 'Stairs', 51),
('Stairwell & Hall', 'Light Fixtures / Electrical Outlets / Bulbs', 52),
('Stairwell & Hall', 'Windows / Coverings / Screens / Blinds', 53),
('Stairwell & Hall', 'Closets / Doors', 54),
('Second Bathroom', 'Walls, Ceiling and Trim', 60),
('Second Bathroom', 'Cabinets and Mirror', 61),
('Second Bathroom', 'Tub / Shower / Taps / Stopper', 62),
('Second Bathroom', 'Sink / Stopper / Taps', 63),
('Second Bathroom', 'Toilet', 64),
('Second Bathroom', 'Floor', 65),
('Second Bathroom', 'Tiles / Grout', 66),
('Second Bathroom', 'Light Fixtures / Electrical Outlets / Bulbs', 67),
('Second Bathroom', 'Windows / Coverings / Screens / Blinds', 68),
('Second Bathroom', 'Door / Fan', 69),
('Master Bedroom', 'Walls, Ceiling and Trim', 70),
('Master Bedroom', 'Floor', 71),
('Master Bedroom', 'Light Fixtures / Electrical Outlets / Bulbs', 72),
('Master Bedroom', 'Windows / Coverings / Screens / Blinds', 73),
('Master Bedroom', 'Closets / Doors', 74),
('2nd Bedroom', 'Walls, Ceiling and Trim', 80),
('2nd Bedroom', 'Floor', 81),
('2nd Bedroom', 'Light Fixtures / Electrical Outlets / Bulbs', 82),
('2nd Bedroom', 'Windows / Coverings / Screens / Blinds', 83),
('2nd Bedroom', 'Closets / Doors', 84),
('3rd Bedroom', 'Walls, Ceiling and Trim', 90),
('3rd Bedroom', 'Floor', 91),
('3rd Bedroom', 'Light Fixtures / Electrical Outlets / Bulbs', 92),
('3rd Bedroom', 'Windows / Coverings / Screens / Blinds', 93),
('3rd Bedroom', 'Closets / Doors', 94),
('Exterior', 'Patio / Balcony', 100),
('Exterior', 'Doors', 101),
('Exterior', 'Light Fixtures / Electrical Outlets / Bulbs', 102),
('Utility Room', 'Washer / Dryer', 110),
('Utility Room', 'Other', 111);
