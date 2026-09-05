CREATE POLICY "Product images are publicly readable"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'product-images');

CREATE POLICY "Anyone can upload a payment receipt"
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'payment-receipts');

CREATE OR REPLACE FUNCTION public.attach_receipt(_reference text, _phone text, _path text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target uuid;
BEGIN
  IF _path IS NULL OR length(_path) = 0 OR length(_path) > 500 THEN
    RETURN false;
  END IF;
  SELECT id INTO target FROM public.orders
   WHERE upper(reference) = upper(trim(_reference))
     AND regexp_replace(phone, '\D', '', 'g') = regexp_replace(coalesce(_phone,''), '\D', '', 'g')
   LIMIT 1;
  IF target IS NULL THEN
    RETURN false;
  END IF;
  UPDATE public.orders
     SET receipt_path = _path,
         receipt_uploaded_at = now(),
         payment_status = 'under_review'
   WHERE id = target;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.attach_receipt(text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.track_order(_reference text, _phone text)
RETURNS TABLE (
  reference text,
  customer_name text,
  items jsonb,
  total numeric,
  status text,
  payment_status text,
  admin_note text,
  receipt_uploaded_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.reference, o.customer_name, o.items, o.total, o.status, o.payment_status,
         o.admin_note, o.receipt_uploaded_at, o.created_at
    FROM public.orders o
   WHERE upper(o.reference) = upper(trim(_reference))
     AND regexp_replace(o.phone, '\D', '', 'g') = regexp_replace(coalesce(_phone,''), '\D', '', 'g')
   LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.track_order(text, text) TO anon, authenticated;