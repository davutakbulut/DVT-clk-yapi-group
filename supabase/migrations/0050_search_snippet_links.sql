-- 0050 · Arama parçası (K-102): markdown bağlantıları [metin](url) → metin; parçaya URL sızmasın.
create or replace function app_private.search_snippet(p_text text, p_q text) returns text
language plpgsql immutable strict set search_path = '' as $$
declare
  v_pos integer;
  v_start integer;
  v_len constant integer := 150;
  v_plain text := regexp_replace(regexp_replace(coalesce(p_text, ''), '\[([^\]]+)\]\([^)]*\)', '\1', 'g'), E'[#*_>`\\[\\]()|\\n\\r\\t]+', ' ', 'g');
begin
  v_plain := regexp_replace(v_plain, '\s{2,}', ' ', 'g');
  v_pos := position(app_private.search_norm(p_q) in app_private.search_norm(v_plain));
  if v_pos = 0 then return left(v_plain, v_len); end if;
  v_start := greatest(1, v_pos - 60);
  return (case when v_start > 1 then '…' else '' end) || substr(v_plain, v_start, v_len) || (case when v_start + v_len < length(v_plain) then '…' else '' end);
end $$;
