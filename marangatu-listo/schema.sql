-- Tabela de Usuários (Estende a auth.users do Supabase ou cria uma nova independente se não usar triggers)
-- Neste caso, vamos criar uma tabela pública que referencia o auth.users se possível, ou apenas armazena dados extras.
-- Como o código usa supabase.table('users'), estamos assumindo uma tabela pública 'users'.

create table public.users (
  id uuid references auth.users not null primary key,
  email text,
  nombre text,
  ruc text,
  rol text default 'usuario',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabela de Facturas
create table public.facturas (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id),
  fecha_factura text, -- Pode ser date, mas o OCR retorna string as vezes
  local text,
  valor decimal,
  ruc_emisor text,
  image_url text,
  confirmado boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS (Row Level Security) é uma boa prática
alter table public.users enable row level security;
alter table public.facturas enable row level security;

-- Políticas de acesso (Exemplo simples: todos podem ler/criar por enquanto para teste)
-- O ideal é: users podem ler/editar apenas seus próprios dados.
create policy "Users can insert their own profile"
  on public.users for insert
  with check ( auth.uid() = id );

create policy "Users can view their own profile"
  on public.users for select
  using ( auth.uid() = id );

create policy "Users can insert their own invoices"
  on public.facturas for insert
  with check ( auth.uid() = user_id );

create policy "Users can view their own invoices"
  on public.facturas for select
  using ( auth.uid() = user_id );

-- Bucket para imagens
-- Você precisará criar um bucket chamado 'facturas' no menu Storage do Supabase e torná-lo público ou configurar políticas.
