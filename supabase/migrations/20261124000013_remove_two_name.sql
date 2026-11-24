-- Plain name for the "remove two wrong answers" power-up, so the Gem Rewards page matches the in-game button.
update public.store_items
   set name = 'Remove Two Wrong Answers', description = 'Removes two wrong answers from one question.'
 where id = 'eliminate_two';
