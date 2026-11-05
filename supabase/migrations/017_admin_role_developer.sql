-- Skrytá developerská role nad vlastníkem (neviditelná v týmu).
alter type public.admin_role add value if not exists 'developer';
