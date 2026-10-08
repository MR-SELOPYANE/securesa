
alter function public.mask_doc(text) set search_path = public;
alter function public.audit_block_change() set search_path = public;

revoke execute on all functions in schema public from public, anon;

revoke execute on function public.audit_chain_trg() from authenticated;
revoke execute on function public.audit_block_change() from authenticated;
revoke execute on function public.scans_stamp() from authenticated;
revoke execute on function public.scans_audit() from authenticated;
revoke execute on function public.incidents_stamp() from authenticated;
revoke execute on function public.incidents_after() from authenticated;
revoke execute on function public.breach_audit() from authenticated;
revoke execute on function public.write_audit(text,text,text,jsonb) from authenticated;
revoke execute on function public.audit_payload(public.audit_log) from authenticated;

alter default privileges in schema public revoke execute on functions from public, anon;
