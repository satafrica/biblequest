-- Editorial workflow for images, adventures and adventure chapters (questions use
-- admin_set_question_status). Same rule: draft -> review -> approved -> published.
create or replace function public.admin_set_content_status(
  p_type text, p_id text, p_status public.content_status, p_note text default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_from public.content_status;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_type = 'asset' then select review_status into v_from from public.question_assets where id = p_id for update;
  elsif p_type = 'adventure' then select status into v_from from public.adventures where id = p_id for update;
  elsif p_type = 'chapter' then select status into v_from from public.adventure_chapters where id = p_id for update;
  else raise exception 'invalid_type'; end if;
  if v_from is null then raise exception 'not_found'; end if;
  if not (
       (p_status = 'review' and v_from in ('draft', 'rejected'))
    or (p_status in ('approved', 'rejected') and v_from = 'review')
    or (p_status = 'published' and v_from = 'approved' and public.is_admin())
    or (p_status = 'archived' and v_from = 'published' and public.is_admin())
    or (p_status = 'draft')
  ) then raise exception 'invalid_transition % -> %', v_from, p_status; end if;
  if p_type = 'asset' then update public.question_assets set review_status = p_status where id = p_id;
  elsif p_type = 'adventure' then update public.adventures set status = p_status where id = p_id;
  else update public.adventure_chapters set status = p_status where id = p_id; end if;
  insert into public.content_reviews (content_type, content_id, reviewer_id, from_status, to_status, note)
  values (p_type, p_id, auth.uid(), v_from, p_status, p_note);
  perform public._audit('content.status', p_type, p_id, jsonb_build_object('from', v_from, 'to', p_status, 'note', p_note));
end $$;

revoke execute on function public.admin_set_content_status(text, text, public.content_status, text) from public, anon;
grant execute on function public.admin_set_content_status(text, text, public.content_status, text) to authenticated;

-- Staff can read full question rows (including answers) for review; players cannot.
grant select on public.questions to authenticated;
-- Admin dashboard reads
grant select on public.content_reviews, public.admin_audit_log, public.reports to authenticated;
