CREATE POLICY "Admins manage product images"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins read payment receipts"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-receipts' AND public.has_role(auth.uid(), 'admin'));

REVOKE EXECUTE ON FUNCTION public.admin_exists() FROM anon;