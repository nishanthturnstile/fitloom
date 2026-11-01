-- Qualify the mail kind against the function output parameter.
CREATE OR REPLACE FUNCTION app.mail_claim() RETURNS TABLE(id uuid,kind text,encrypted_payload text,attempt integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  UPDATE app.auth_mail SET state='expired',encrypted_payload=NULL WHERE state IN ('pending','running') AND (expires_at<=now() OR consumed_at IS NOT NULL OR (auth_mail.kind='invitation' AND NOT app.invitation_current(auth_mail.invitation_id)));
  RETURN QUERY UPDATE app.auth_mail m SET state='running',attempts=m.attempts+1,locked_at=now()
    WHERE m.id=(SELECT q.id FROM app.auth_mail q WHERE q.expires_at>now() AND q.consumed_at IS NULL AND q.attempts<5
      AND ((q.state='pending' AND q.next_attempt_at<=now()) OR (q.state='running' AND q.locked_at<now()-interval '2 minutes'))
      ORDER BY q.next_attempt_at,q.id LIMIT 1 FOR UPDATE SKIP LOCKED)
    RETURNING m.id,m.kind,m.encrypted_payload,m.attempts;
  UPDATE app.auth_mail SET state='failed',last_error='worker_interrupted',encrypted_payload=NULL WHERE state='running' AND attempts>=5 AND locked_at<now()-interval '2 minutes';
END $$;
