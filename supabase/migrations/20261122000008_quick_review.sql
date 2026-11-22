-- Quick human review: staff record a reviewer decision on many questions at once.
-- This records the human sign-off in questions.verification; it does not change whether
-- a question is published. Every call is written to content_reviews and the audit log.
create or replace function public.admin_review_questions(
  p_ids text[], p_decision text, p_note text default null
) returns integer language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_decision not in ('approved', 'needs_fix') then raise exception 'invalid_decision'; end if;
  if p_ids is null or cardinality(p_ids) = 0 or cardinality(p_ids) > 100 then raise exception 'invalid_ids'; end if;
  if p_decision = 'needs_fix' and coalesce(btrim(p_note), '') = '' then raise exception 'note_required'; end if;

  update public.questions q
     set verification = coalesce(q.verification, '{}'::jsonb)
           || jsonb_build_object(
                'human_review', p_decision,
                'reviewed_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD'),
                'reviewed_by', auth.uid(),
                'review_method', 'Quick review in admin dashboard: reviewer read the question, answer, KJV text and automated check',
                'review_note', nullif(btrim(coalesce(p_note, '')), '')),
         updated_at = now()
   where q.id = any(p_ids);
  get diagnostics v_count = row_count;

  insert into public.content_reviews (content_type, content_id, reviewer_id, from_status, to_status, note)
  select 'question', q.id, auth.uid(), q.status, q.status, 'human review: ' || p_decision || coalesce(' — ' || nullif(btrim(p_note), ''), '')
    from public.questions q where q.id = any(p_ids);
  perform public._audit('question.human_review', 'question', array_to_string(p_ids, ','),
    jsonb_build_object('decision', p_decision, 'count', v_count, 'note', p_note));
  return v_count;
end $$;

revoke execute on function public.admin_review_questions(text[], text, text) from public, anon;
grant execute on function public.admin_review_questions(text[], text, text) to authenticated;
