-- Store settings (single row)
CREATE TABLE public.store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name text NOT NULL DEFAULT '',
  account_name text NOT NULL DEFAULT '',
  account_number text NOT NULL DEFAULT '',
  payment_instructions text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT '',
  whatsapp_number text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.store_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.store_settings TO authenticated;
GRANT ALL ON public.store_settings TO service_role;

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store settings are publicly viewable"
  ON public.store_settings FOR SELECT USING (true);

CREATE POLICY "Admins manage store settings"
  ON public.store_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER store_settings_updated_at
  BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.store_settings
  (bank_name, account_name, account_number, payment_instructions, contact_phone, whatsapp_number, contact_email)
VALUES
  ('', '', '', 'Transfer the exact total to the account above, then upload a clear photo or PDF of your receipt. We confirm payment within 24-48 hours and email you the result.',
   '+234 703 089 8561', '+234 703 089 8561', 'emmanuelonyedikachi866@gmail.com');

-- Orders: payment review workflow
ALTER TABLE public.orders
  ADD COLUMN user_id uuid,
  ADD COLUMN receipt_path text,
  ADD COLUMN receipt_uploaded_at timestamptz,
  ADD COLUMN payment_status text NOT NULL DEFAULT 'awaiting_receipt',
  ADD COLUMN admin_note text,
  ADD COLUMN reviewed_at timestamptz,
  ADD COLUMN reviewed_by uuid;

CREATE INDEX orders_user_id_idx ON public.orders (user_id);
CREATE INDEX orders_reference_idx ON public.orders (reference);

CREATE POLICY "Users can read own orders"
  ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Bootstrap: first authenticated user may claim admin when nobody is admin yet
CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_exists boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO admin_exists;
  IF admin_exists THEN
    RETURN public.has_role(auth.uid(), 'admin');
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_exists()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin')
$$;

GRANT EXECUTE ON FUNCTION public.admin_exists() TO authenticated, anon;

-- Admins grant staff access by email
CREATE OR REPLACE FUNCTION public.grant_admin_by_email(_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can grant access';
  END IF;
  SELECT id INTO target FROM auth.users WHERE lower(email) = lower(trim(_email)) LIMIT 1;
  IF target IS NULL THEN
    RETURN false;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (target, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_admin_by_email(text) TO authenticated;