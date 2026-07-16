-- ============================================================
-- MIGRATION: delete_own_account also removes the user's avatar
-- ============================================================
-- FINDING (GDPR issue #72, right-to-erasure completeness):
-- The existing public.delete_own_account() RPC only runs
--   DELETE FROM auth.users WHERE id = auth.uid();
-- and relies on cascading deletes. However, storage.objects has NO
-- foreign key to auth.users (its only FK is objects_bucketId_fkey ->
-- storage.buckets), so deleting the user does NOT remove the files they
-- uploaded to the `avatars` bucket. Their profile picture is left
-- orphaned in storage after account deletion.
--
-- Avatars are uploaded at path `{user_id}/{timestamp}.{ext}` (see
-- ProfileContent.handleAvatarUpload), so the top-level folder equals the
-- user id. This migration redefines the RPC to first delete every object
-- the user owns in the `avatars` bucket (matching either the storage
-- `owner` column or the id-named folder, for robustness), then delete the
-- auth user as before.
--
-- Idempotent: uses CREATE OR REPLACE. Behaviour is otherwise unchanged.
--
-- NOTE: This migration was authored but NOT applied to the live database
-- automatically. Review and apply it deliberately.
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_own_account()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Remove the user's avatar files from Storage so nothing is left orphaned.
  DELETE FROM storage.objects
  WHERE bucket_id = 'avatars'
    AND (
      owner = _uid
      OR (storage.foldername(name))[1] = _uid::text
    );

  -- Remove the auth user (cascades to public.* rows via existing FKs).
  DELETE FROM auth.users WHERE id = _uid;
END;
$function$;
