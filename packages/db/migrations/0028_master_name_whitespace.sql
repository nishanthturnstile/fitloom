-- Match ECMAScript String.trim at the application boundary. NFC/case policy stays SQL-owned.
CREATE FUNCTION app.master_trim(value text) RETURNS text LANGUAGE sql IMMUTABLE STRICT SET search_path='' AS $$
 SELECT btrim(value,U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')
$$;
CREATE OR REPLACE FUNCTION app.normalize_master_name(value text) RETURNS text LANGUAGE sql IMMUTABLE STRICT SET search_path='' AS $$
 SELECT translate(normalize(app.master_trim(value), NFC),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz')
$$;
CREATE OR REPLACE FUNCTION app.master_text(value jsonb, maximum integer, required boolean DEFAULT true) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT jsonb_typeof(value)='string' AND length(value#>>'{}') BETWEEN CASE WHEN required THEN 1 ELSE 0 END AND maximum AND (value#>>'{}')=app.master_trim(value#>>'{}')
$$;
REVOKE ALL ON FUNCTION app.master_trim(text) FROM PUBLIC;
