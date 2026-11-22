-- Gem Rewards wording: gem history records an unlock, not a purchase. Behaviour is unchanged.
CREATE OR REPLACE FUNCTION public.purchase_item(p_item text, p_idempotency_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_user uuid := auth.uid(); v_item public.store_items; v_applied int; v_balance bigint; v_qty int;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_idempotency_key is null or char_length(p_idempotency_key) < 8 then raise exception 'invalid_idempotency_key'; end if;
  select * into v_item from public.store_items where id = p_item and active;
  if v_item.id is null then raise exception 'item_not_found'; end if;

  -- serialise all purchases for this user
  insert into public.gem_wallets (user_id) values (v_user) on conflict (user_id) do nothing;
  perform 1 from public.gem_wallets where user_id = v_user for update;

  -- replay of the same purchase request: return the original outcome, no second charge
  if exists (select 1 from public.gem_transactions where user_id = v_user and idempotency_key = 'buy:' || p_idempotency_key) then
    select balance into v_balance from public.gem_wallets where user_id = v_user;
    select quantity into v_qty from public.player_inventory where user_id = v_user and item_id = p_item;
    return jsonb_build_object('ok', true, 'replayed', true, 'balance', v_balance, 'quantity', coalesce(v_qty, 0));
  end if;

  if not v_item.consumable and exists (select 1 from public.player_inventory where user_id = v_user and item_id = p_item) then
    raise exception 'already_owned';
  end if;

  select applied, balance into v_applied, v_balance
    from public._apply_gems(v_user, -v_item.price, 'Unlocked ' || v_item.name, 'store_item', p_item, 'buy:' || p_idempotency_key);

  insert into public.player_inventory (user_id, item_id, quantity) values (v_user, p_item, 1)
  on conflict (user_id, item_id) do update set quantity = public.player_inventory.quantity + 1
  returning quantity into v_qty;

  return jsonb_build_object('ok', true, 'replayed', false, 'balance', v_balance, 'quantity', v_qty);
end $function$
;
