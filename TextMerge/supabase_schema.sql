-- Create a table for storing merged files
create table public.merged_files (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users not null,
  filename text not null,
  content text not null
);

-- Enable Row Level Security (RLS)
alter table public.merged_files enable row level security;

-- Create a policy that allows users to view their own files
create policy "Users can view their own files"
  on public.merged_files for select
  using ( auth.uid() = user_id );

-- Create a policy that allows users to insert their own files
create policy "Users can insert their own files"
  on public.merged_files for insert
  with check ( auth.uid() = user_id );
