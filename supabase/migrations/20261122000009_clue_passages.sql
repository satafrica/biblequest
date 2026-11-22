-- Who Am I? clue passages (22 Nov 2026).
--   * questions.clue_refs: for each clue, the KJV passage(s) behind it: [[{ref, text}, ...], ...].
--   * Returned by submit_answer only after the answer is locked in (like verse_text).
--     The public view published_questions lists its columns explicitly, so clue_refs is not exposed before answering.
alter table public.questions add column if not exists clue_refs jsonb;

create or replace function public.submit_answer(p_session uuid, p_question text, p_choice int, p_clues_used int default 1)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_q public.questions; v_correct boolean; v_points int; v_res jsonb;
begin
  select * into v_q from public.questions where id = p_question and status = 'published';
  if v_q.id is null then raise exception 'question_not_found'; end if;
  if v_q.game_mode = 'sequence' then raise exception 'use_submit_sequence'; end if;
  v_correct := (p_choice = v_q.correct_index);
  v_points := case when v_q.game_mode = 'whoami'
                   then greatest(20, 100 - 20 * (greatest(1, least(coalesce(p_clues_used, 1), 5)) - 1))
                   else 100 end;
  v_res := public._record_answer(p_session, p_question, v_correct, p_choice, v_points);
  return v_res || jsonb_build_object(
    'correct', v_correct, 'correct_index', v_q.correct_index, 'explanation', v_q.explanation,
    'reference', v_q.reference_label, 'translation', v_q.translation_id, 'verse_text', v_q.verse_text,
    'clue_refs', v_q.clue_refs,
    'points', case when v_correct then v_points else 0 end);
end $$;
