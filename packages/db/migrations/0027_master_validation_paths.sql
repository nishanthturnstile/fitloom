-- Disambiguate scalar path segments from array concatenation. Retain applied history.
CREATE OR REPLACE FUNCTION app.master_validate_definition(d jsonb) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
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
 ELSE PERFORM app.master_require(false,p||ARRAY['kind']); END CASE;
 PERFORM app.master_keys(item,keys,p); PERFORM app.master_uuid(item->'id'); PERFORM app.master_uuid(item->'sectionId');
 PERFORM app.master_require(app.master_text(item->'label',100) AND app.master_text(item->'help',500,false) AND app.master_illustration(item->'illustrationId') AND jsonb_typeof(item->'required')='boolean',p);
 PERFORM app.master_require(EXISTS(SELECT FROM jsonb_array_elements(d->'sections') s WHERE app.master_uuid(s->'id')=app.master_uuid(item->'sectionId')),p||ARRAY['sectionId']);
 semantic:=item->>'semanticId';
 IF semantic IS NOT NULL THEN
 PERFORM app.master_require(jsonb_typeof(item->'semanticId')='string' AND k='length' AND semantic=ANY(ARRAY['body.chest.circumference','body.bust.circumference','body.waist.circumference','body.hip.circumference','body.shoulder.width','garment.chest.circumference','garment.sleeve.length','garment.body.length','garment.inseam.length','garment.outseam.length']),p||ARRAY['semanticId']);
 basis:=split_part(semantic,'.',1); PERFORM app.master_require(item->>'basis'=basis,p||ARRAY['semanticId']);
 END IF;
 IF k='length' THEN
 PERFORM app.master_require(item->>'basis'=ANY(ARRAY['body','garment']) AND item->>'displayUnit'=ANY(ARRAY['in','cm']) AND app.master_integer(item->'displayPrecision',0,6),p);
 ELSIF k='number' THEN
 PERFORM app.master_require(item->>'unit'=ANY(ARRAY['count','unitless']) AND app.master_integer(item->'decimalPlaces',0,6),p);
 IF item->>'unit'='count' THEN PERFORM app.master_require(item->'decimalPlaces'='0'::jsonb,p||ARRAY['decimalPlaces']); END IF;
 ELSIF k='text' THEN PERFORM app.master_require(app.master_integer(item->'maxLength',1,500),p||ARRAY['maxLength']);
 ELSIF k='select' THEN PERFORM app.master_choices(item->'choices',(item->>'required')::boolean,p||ARRAY['choices']); END IF;
 IF k IN ('length','number') THEN
 FOREACH basis IN ARRAY ARRAY['min','max'] LOOP
 IF item->basis<>'null'::jsonb THEN
 PERFORM app.master_require(jsonb_typeof(item->basis)='string' AND item->>basis ~ '^-?(0|[1-9][0-9]{0,17})(\.[0-9]{1,6})?$',p||basis);
 IF k='length' OR item->>'unit'='count' THEN PERFORM app.master_require(left(item->>basis,1)<>'-',p||basis); END IF;
 IF k='number' AND item->>'unit'='count' THEN PERFORM app.master_require((item->>basis)::numeric=trunc((item->>basis)::numeric),p||basis); END IF;
 END IF;
 END LOOP;
 lo:=(item->>'min')::numeric; hi:=(item->>'max')::numeric;
 PERFORM app.master_require(lo IS NULL OR hi IS NULL OR hi>=lo,p||ARRAY['max']);
 END IF;
 n:=n+1;
 END LOOP;
 n:=0;
 FOR item IN SELECT value FROM jsonb_array_elements(d->'constructionGroups') LOOP
 p:=ARRAY['constructionGroups',n::text];
 PERFORM app.master_keys(item,ARRAY['id','label','kind','required','help','illustrationId','choices'],p);
 PERFORM app.master_uuid(item->'id');
 PERFORM app.master_require(app.master_text(item->'label',100) AND app.master_text(item->'help',500,false) AND app.master_illustration(item->'illustrationId') AND jsonb_typeof(item->'required')='boolean' AND item->>'kind'=ANY(ARRAY['single','multiple']),p);
 PERFORM app.master_choices(item->'choices',(item->>'required')::boolean,p||ARRAY['choices']); n:=n+1;
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
