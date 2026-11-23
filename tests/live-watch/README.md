Daily 9 AM ET watch on mybiblegem.com.
- assets: sorted, unique assets/*.js|css names from https://mybiblegem.com/ raw HTML.
- questions fingerprint SQL:
  select count(*) n, count(*) filter (where status='published') pub, md5(string_agg(md5(q::text), '' order by q.id)) fp from questions q
If either differs from baseline.json: run tests/e2e/draft-rewrites.spec.ts against the live site, clean up the test guests, then update baseline.json.
