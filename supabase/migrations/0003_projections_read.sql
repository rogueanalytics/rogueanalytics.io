-- =====================================================================
-- Rogue Analytics — read access for the Friday and Saturday projections
-- Run once in Supabase: Dashboard > SQL Editor > New query > paste > Run
--
-- projections_cfb_friday and projections_cfb_saturday need the same access
-- rules as projections_cfb_thursday (subscribers only, expires the day after
-- game_date). Thursday's policies were created in the dashboard, so this
-- copies them over verbatim rather than restating them. Tables that don't
-- exist yet are skipped; re-run after creating them. Safe to re-run.
-- =====================================================================

do $$
declare
  t text;
  p record;
begin
  foreach t in array array['projections_cfb_friday', 'projections_cfb_saturday'] loop
    if to_regclass(format('public.%I', t)) is null then
      raise notice 'Skipping %: table does not exist yet', t;
      continue;
    end if;

    execute format('alter table public.%I enable row level security', t);

    for p in
      select policyname, permissive, cmd, roles, qual, with_check
      from pg_policies
      where schemaname = 'public' and tablename = 'projections_cfb_thursday'
    loop
      execute format('drop policy if exists %I on public.%I', p.policyname, t);
      execute format(
        'create policy %I on public.%I as %s for %s to %s%s%s',
        p.policyname,
        t,
        p.permissive,
        p.cmd,
        (select string_agg(quote_ident(r), ', ') from unnest(p.roles) r),
        case when p.qual is not null then format(' using (%s)', p.qual) else '' end,
        case when p.with_check is not null then format(' with check (%s)', p.with_check) else '' end
      );
    end loop;

    execute format('grant select on public.%I to authenticated', t);
  end loop;
end
$$;
