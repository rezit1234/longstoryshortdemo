-- Rozšíření rolí týmu: recepce + obsluha+.
alter type public.admin_role add value if not exists 'reception';
alter type public.admin_role add value if not exists 'staff_plus';
