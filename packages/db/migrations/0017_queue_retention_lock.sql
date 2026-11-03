-- Serialize pruning with authorized retry, which can recreate a pruned envelope.
CREATE OR REPLACE FUNCTION app.foundation_maintenance() RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 DELETE FROM pgboss.job WHERE name='fitloom-foundation' AND id IN (
  SELECT q.id FROM pgboss.job q JOIN app.foundation_jobs f ON f.id=q.id
  WHERE q.name='fitloom-foundation' AND f.status IN ('succeeded','failed','cancelled')
   AND f.finished_at<now()-interval '7 days' ORDER BY f.finished_at LIMIT 100
   FOR UPDATE OF f SKIP LOCKED
 )
$$;
