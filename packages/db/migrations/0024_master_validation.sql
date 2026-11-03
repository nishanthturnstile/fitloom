-- Internal validators have no runtime EXECUTE grant. Every publication revalidates in SQL.
CREATE FUNCTION app.master_require(ok boolean, path text[]) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF ok IS DISTINCT FROM true THEN
 RAISE EXCEPTION 'Invalid master configuration' USING ERRCODE='22023', DETAIL=jsonb_build_object('issues',jsonb_build_array(jsonb_build_object('path',path,'message','Invalid master configuration')))::text;
 END IF;
END $$;
CREATE FUNCTION app.master_keys(value jsonb, keys text[], path text[]) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 PERFORM app.master_require(jsonb_typeof(value)='object',path);
 PERFORM app.master_require((SELECT count(*)=cardinality(keys) AND coalesce(bool_and(k=ANY(keys)),false) FROM jsonb_object_keys(value) k),path);
END $$;
CREATE FUNCTION app.master_text(value jsonb, maximum integer, required boolean DEFAULT true) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT jsonb_typeof(value)='string' AND length(value#>>'{}') BETWEEN CASE WHEN required THEN 1 ELSE 0 END AND maximum AND (value#>>'{}')=btrim(value#>>'{}')
$$;
CREATE FUNCTION app.master_uuid(value jsonb) RETURNS uuid LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
BEGIN
 PERFORM app.master_require(jsonb_typeof(value)='string' AND (value#>>'{}') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',ARRAY['identity']);
 RETURN (value#>>'{}')::uuid;
END $$;
CREATE FUNCTION app.master_illustration(value jsonb) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT value='null'::jsonb OR (jsonb_typeof(value)='string' AND value#>>'{}'=ANY(ARRAY['shirt','blouse','trouser','dimension','construction']))
$$;
CREATE FUNCTION app.master_integer(value jsonb, minimum integer, maximum integer) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT CASE WHEN jsonb_typeof(value)='number' AND (value#>>'{}') ~ '^(0|[1-9][0-9]*)$' THEN (value#>>'{}')::numeric BETWEEN minimum AND maximum ELSE false END
$$;
CREATE FUNCTION app.master_rate(value jsonb, nullable boolean) RETURNS numeric LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
BEGIN
 IF nullable AND value='null'::jsonb THEN RETURN NULL; END IF;
 PERFORM app.master_require(jsonb_typeof(value)='string' AND (value#>>'{}') ~ '^(0|[1-9][0-9]{0,17})(\.[0-9]{1,6})?$',ARRAY['rates']);
 RETURN (value#>>'{}')::numeric;
END $$;
CREATE FUNCTION app.master_choices(choices jsonb, required boolean, path text[]) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE c jsonb; n integer:=0; active boolean:=false;
BEGIN
 PERFORM app.master_require(jsonb_typeof(choices)='array',path);
 PERFORM app.master_require(jsonb_array_length(choices) BETWEEN 1 AND 30,path);
 FOR c IN SELECT value FROM jsonb_array_elements(choices) LOOP
 PERFORM app.master_keys(c,ARRAY['id','label','illustrationId','active'],path||n::text);
 PERFORM app.master_uuid(c->'id');
 PERFORM app.master_require(app.master_text(c->'label',100) AND app.master_illustration(c->'illustrationId') AND jsonb_typeof(c->'active')='boolean',path||n::text);
 active:=active OR (c->>'active')::boolean; n:=n+1;
 END LOOP;
 PERFORM app.master_require(NOT required OR active,path);
END $$;
CREATE FUNCTION app.master_validate_definition(d jsonb) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE item jsonb; k text; keys text[]; p text[]; n integer; lo numeric; hi numeric; semantic text; basis text;
BEGIN
 PERFORM app.master_keys(d,ARRAY['formatVersion','label','category','applicability','iconId','help','illustrationId','sections','fields','constructionGroups','services','addons','sourceVersionId'],ARRAY['definition']);
 PERFORM app.master_require(octet_length(d::text)<=65536,ARRAY['definition']);
 PERFORM app.master_require(d->'formatVersion'='1'::jsonb,ARRAY['formatVersion']);
 PERFORM app.master_require(app.master_text(d->'label',100),ARRAY['label']);
 PERFORM app.master_require(app.master_text(d->'category',100),ARRAY['category']);
 PERFORM app.master_require(d->>'applicability'=ANY(ARRAY['masculine','feminine','unisex','unspecified']),ARRAY['applicability']);
 PERFORM app.master_require(app.master_illustration(d->'iconId') AND app.master_illustration(d->'illustrationId') AND app.master_text(d->'help',500,false),ARRAY['help']);
 IF d->'sourceVersionId'<>'null'::jsonb THEN PERFORM app.master_uuid(d->'sourceVersionId'); END IF;
 FOREACH k IN ARRAY ARRAY['sections','fields','constructionGroups','services','addons'] LOOP
 PERFORM app.master_require(jsonb_typeof(d->k)='array',ARRAY[k]);
 PERFORM app.master_require(jsonb_array_length(d->k)<=CASE k WHEN 'sections' THEN 10 WHEN 'fields' THEN 60 WHEN 'constructionGroups' THEN 12 WHEN 'services' THEN 20 ELSE 30 END,ARRAY[k]);
 END LOOP;
 n:=0;
 FOR item IN SELECT value FROM jsonb_array_elements(d->'sections') LOOP
 PERFORM app.master_keys(item,ARRAY['id','label'],ARRAY['sections',n::text]);
 PERFORM app.master_uuid(item->'id'); PERFORM app.master_require(app.master_text(item->'label',100),ARRAY['sections',n::text,'label']); n:=n+1;
 END LOOP;
 n:=0;
 FOR item IN SELECT value FROM jsonb_array_elements(d->'fields') LOOP
 p:=ARRAY['fields',n::text]; k:=item->>'kind';
 keys:=ARRAY['id','label','sectionId','required','semanticId','help','illustrationId','kind'];
 CASE k
 WHEN 'length' THEN keys:=keys||ARRAY['basis','displayUnit','displayPrecision','min','max'];
 WHEN 'number' THEN keys:=keys||ARRAY['unit','decimalPlaces','min','max'];
 WHEN 'text' THEN keys:=keys||ARRAY['maxLength'];
 WHEN 'boolean' THEN NULL;
 WHEN 'select' THEN keys:=keys||ARRAY['choices'];
 ELSE PERFORM app.master_require(false,p||'kind'); END CASE;
 PERFORM app.master_keys(item,keys,p); PERFORM app.master_uuid(item->'id'); PERFORM app.master_uuid(item->'sectionId');
 PERFORM app.master_require(app.master_text(item->'label',100) AND app.master_text(item->'help',500,false) AND app.master_illustration(item->'illustrationId') AND jsonb_typeof(item->'required')='boolean',p);
 PERFORM app.master_require(EXISTS(SELECT FROM jsonb_array_elements(d->'sections') s WHERE app.master_uuid(s->'id')=app.master_uuid(item->'sectionId')),p||'sectionId');
 semantic:=item->>'semanticId';
 IF semantic IS NOT NULL THEN
 PERFORM app.master_require(jsonb_typeof(item->'semanticId')='string' AND k='length' AND semantic=ANY(ARRAY['body.chest.circumference','body.bust.circumference','body.waist.circumference','body.hip.circumference','body.shoulder.width','garment.chest.circumference','garment.sleeve.length','garment.body.length','garment.inseam.length','garment.outseam.length']),p||'semanticId');
 basis:=split_part(semantic,'.',1); PERFORM app.master_require(item->>'basis'=basis,p||'semanticId');
 END IF;
 IF k='length' THEN
 PERFORM app.master_require(item->>'basis'=ANY(ARRAY['body','garment']) AND item->>'displayUnit'=ANY(ARRAY['in','cm']) AND app.master_integer(item->'displayPrecision',0,6),p);
 ELSIF k='number' THEN
 PERFORM app.master_require(item->>'unit'=ANY(ARRAY['count','unitless']) AND app.master_integer(item->'decimalPlaces',0,6),p);
 IF item->>'unit'='count' THEN PERFORM app.master_require(item->'decimalPlaces'='0'::jsonb,p||'decimalPlaces'); END IF;
 ELSIF k='text' THEN PERFORM app.master_require(app.master_integer(item->'maxLength',1,500),p||'maxLength');
 ELSIF k='select' THEN PERFORM app.master_choices(item->'choices',(item->>'required')::boolean,p||'choices'); END IF;
 IF k IN ('length','number') THEN
 FOREACH basis IN ARRAY ARRAY['min','max'] LOOP
 IF item->basis<>'null'::jsonb THEN
 PERFORM app.master_require(jsonb_typeof(item->basis)='string' AND item->>basis ~ '^-?(0|[1-9][0-9]{0,17})(\.[0-9]{1,6})?$',p||basis);
 IF k='length' OR item->>'unit'='count' THEN PERFORM app.master_require(left(item->>basis,1)<>'-',p||basis); END IF;
 IF k='number' AND item->>'unit'='count' THEN PERFORM app.master_require((item->>basis)::numeric=trunc((item->>basis)::numeric),p||basis); END IF;
 END IF;
 END LOOP;
 lo:=(item->>'min')::numeric; hi:=(item->>'max')::numeric;
 PERFORM app.master_require(lo IS NULL OR hi IS NULL OR hi>=lo,p||'max');
 END IF;
 n:=n+1;
 END LOOP;
 n:=0;
 FOR item IN SELECT value FROM jsonb_array_elements(d->'constructionGroups') LOOP
 p:=ARRAY['constructionGroups',n::text];
 PERFORM app.master_keys(item,ARRAY['id','label','kind','required','help','illustrationId','choices'],p);
 PERFORM app.master_uuid(item->'id');
 PERFORM app.master_require(app.master_text(item->'label',100) AND app.master_text(item->'help',500,false) AND app.master_illustration(item->'illustrationId') AND jsonb_typeof(item->'required')='boolean' AND item->>'kind'=ANY(ARRAY['single','multiple']),p);
 PERFORM app.master_choices(item->'choices',(item->>'required')::boolean,p||'choices'); n:=n+1;
 END LOOP;
 FOREACH k IN ARRAY ARRAY['services','addons'] LOOP
 n:=0;
 FOR item IN SELECT value FROM jsonb_array_elements(d->k) LOOP
 basis:=CASE k WHEN 'services' THEN 'serviceId' ELSE 'addonId' END;
 PERFORM app.master_keys(item,ARRAY[basis,'savedLabel'],ARRAY[k,n::text]);
 PERFORM app.master_uuid(item->basis); PERFORM app.master_require(app.master_text(item->'savedLabel',100),ARRAY[k,n::text,'savedLabel']); n:=n+1;
 END LOOP;
 PERFORM app.master_require((SELECT count(*)=count(DISTINCT app.master_uuid(value->basis)) FROM jsonb_array_elements(d->k)),ARRAY[k]);
 END LOOP;
END $$;
CREATE FUNCTION app.master_definition_nodes(d jsonb) RETURNS TABLE(node_id uuid,node_kind text,signature jsonb,owner_node_id uuid)
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT (s->>'id')::uuid,'section',to_jsonb('section'::text),NULL::uuid FROM jsonb_array_elements(d->'sections') s
 UNION ALL SELECT (f->>'id')::uuid,'field',jsonb_build_array('field',f->>'kind',f->'semanticId',CASE WHEN f->>'kind'='length' THEN f->>'basis' END,CASE WHEN f->>'kind'='number' THEN f->>'unit' END),NULL::uuid FROM jsonb_array_elements(d->'fields') f
 UNION ALL SELECT (g->>'id')::uuid,'group',jsonb_build_array('group',g->>'kind'),NULL::uuid FROM jsonb_array_elements(d->'constructionGroups') g
 UNION ALL SELECT (c->>'id')::uuid,'option',jsonb_build_array('option','field',lower(f->>'id')),(f->>'id')::uuid FROM jsonb_array_elements(d->'fields') f CROSS JOIN LATERAL jsonb_array_elements(f->'choices') c WHERE f->>'kind'='select'
 UNION ALL SELECT (c->>'id')::uuid,'option',jsonb_build_array('option','group',lower(g->>'id')),(g->>'id')::uuid FROM jsonb_array_elements(d->'constructionGroups') g CROSS JOIN LATERAL jsonb_array_elements(g->'choices') c
$$;
