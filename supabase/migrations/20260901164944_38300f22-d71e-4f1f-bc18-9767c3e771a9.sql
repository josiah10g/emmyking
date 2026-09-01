CREATE TYPE public.app_role AS ENUM ('admin','user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  brand text,
  category text NOT NULL DEFAULT 'Phones',
  description text,
  specifications text,
  price numeric(12,2),
  image_url text,
  in_stock boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products are publicly viewable" ON public.products FOR SELECT USING (true);
CREATE POLICY "Admins manage products" ON public.products FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE DEFAULT ('EK-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  customer_name text NOT NULL,
  phone text NOT NULL,
  email text,
  address text,
  notes text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric(12,2),
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can place an order" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins read orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete orders" ON public.orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.products (name, slug, brand, category, description, specifications, image_url, sort_order) VALUES
('Samsung Galaxy S23 8GB RAM 128GB ROM','samsung-galaxy-s23-8-128','Samsung','Phones','Flagship Galaxy S23 in Phantom Black with a 6.1-inch Dynamic AMOLED display and pro-grade triple camera system.','Display: 6.1" Dynamic AMOLED 2X, 120Hz
Memory: 8GB RAM
Storage: 128GB
Rear camera: 50MP + 12MP + 10MP
Front camera: 12MP
Battery: 3900mAh with fast charging
SIM: Dual SIM, 5G','/__l5e/assets-v1/4cc4ba5c-a935-407e-9b48-54d87464c31b/p1.png',1),
('Samsung Galaxy S21','samsung-galaxy-s21','Samsung','Phones','Samsung Galaxy S21 in Phantom Grey — smooth 120Hz display and a versatile triple camera in a compact body.','Display: 6.2" Dynamic AMOLED 2X, 120Hz
Memory: 8GB RAM
Storage: 128GB
Rear camera: 12MP + 12MP + 64MP
Front camera: 10MP
Battery: 4000mAh
SIM: Dual SIM, 5G','/__l5e/assets-v1/62bedbb1-7219-4aef-a603-676d958a09b9/p2.png',2),
('iPhone 11 64GB ROM','iphone-11-64gb','Apple','Phones','iPhone 11 in White with the dual-camera system and all-day battery life. A dependable everyday iPhone.','Display: 6.1" Liquid Retina HD
Storage: 64GB
Rear camera: 12MP Wide + 12MP Ultra Wide
Front camera: 12MP TrueDepth
Chip: A13 Bionic
Face ID','/__l5e/assets-v1/20f25be6-a582-4a56-b2c5-64b61abe7a44/p3.png',3),
('iPhone 11 Pro 256GB ROM','iphone-11-pro-256gb','Apple','Phones','iPhone 11 Pro in Gold with a Super Retina XDR display and the Pro triple-camera system.','Display: 5.8" Super Retina XDR OLED
Storage: 256GB
Rear camera: 12MP Wide + Ultra Wide + Telephoto
Front camera: 12MP TrueDepth
Chip: A13 Bionic
Stainless steel frame','/__l5e/assets-v1/b77a29bb-fc97-4c8f-beb7-b1afc75e7a57/p4.png',4),
('iPhone 16 Pro 256GB ROM','iphone-16-pro-256gb','Apple','Phones','iPhone 16 Pro in Black Titanium — the latest Pro camera system, Camera Control and a titanium build.','Display: 6.3" Super Retina XDR, ProMotion
Storage: 256GB
Rear camera: 48MP Fusion + 48MP Ultra Wide + 12MP Telephoto
Front camera: 12MP TrueDepth
Chip: A18 Pro
Build: Grade 5 titanium','/__l5e/assets-v1/cefb48e4-7e07-42ba-b093-6aa9cdeb1def/p5.png',5),
('HP EliteBook 840 G6','hp-elitebook-840-g6','HP','Laptops','Business-class HP EliteBook 840 G6 — slim aluminium chassis, full keyboard and enterprise durability.','Display: 14" Full HD
Processor: Intel Core i5/i7 (8th Gen)
Memory: 8GB/16GB RAM
Storage: 256GB/512GB SSD
Ports: USB-C, USB-A, HDMI, RJ-45
OS: Windows','/__l5e/assets-v1/d38a9316-6bd9-4685-a3e3-87d882e2309e/p6.png',6),
('Google Pixel 9 Pro XL 16GB RAM 128GB ROM','google-pixel-9-pro-xl-16-128','Google','Phones','Google Pixel 9 Pro XL in Porcelain with the Tensor chip and Google''s computational photography.','Display: 6.8" Super Actua LTPO OLED
Memory: 16GB RAM
Storage: 128GB
Rear camera: 50MP + 48MP Ultra Wide + 48MP Telephoto
Front camera: 42MP
Chip: Google Tensor G4','/__l5e/assets-v1/0515dae3-ba53-4031-9227-096502e8340e/p7.png',7);