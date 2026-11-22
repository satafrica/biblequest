-- Story Sequencing verse reading (22 Nov 2026).
--   * questions.clue_refs now also holds, for sequence questions, the KJV passage(s) behind each event,
--     in the correct order: [[{ref, text}, ...], ...]. Still not exposed by published_questions.
--   * submit_sequence returns clue_refs after the answer, next to correct_order.
create or replace function public.submit_sequence(p_session uuid, p_question text, p_order jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_q public.questions; v_correct boolean; v_res jsonb;
begin
  select * into v_q from public.questions where id = p_question and status = 'published' and game_mode = 'sequence';
  if v_q.id is null then raise exception 'question_not_found'; end if;
  v_correct := (p_order = v_q.options);
  v_res := public._record_answer(p_session, p_question, v_correct, -1, 100);
  return v_res || jsonb_build_object('correct', v_correct, 'correct_order', v_q.options,
    'explanation', v_q.explanation, 'reference', v_q.reference_label, 'verse_text', v_q.verse_text,
    'clue_refs', v_q.clue_refs,
    'points', case when v_correct then 100 else 0 end);
end $$;
