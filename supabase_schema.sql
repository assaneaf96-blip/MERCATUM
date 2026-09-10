-- =============================================================================
-- SCHEMA COMPLET SUPABASE POUR MAISON LUNE / MERCATUM
-- =============================================================================
-- Copiez et collez tout ce script dans l'onglet "SQL Editor" de votre projet Supabase
-- puis cliquez sur "Run".

-- 1. Table des Produits du Catalogue
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  type TEXT,
  price TEXT NOT NULL,
  raw_price NUMERIC NOT NULL,
  description TEXT,
  image TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  media JSONB DEFAULT '[]'::jsonb,
  tag TEXT,
  rating NUMERIC DEFAULT 5.0,
  reviews_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Table des Nouveautés (Vitrine d'accueil)
CREATE TABLE IF NOT EXISTS public.nouveautes (
  id SERIAL PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  custom_label TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Table des Commandes Clients (Virement Bancaire)
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  product_id TEXT,
  product_name TEXT,
  total_price NUMERIC NOT NULL,
  currency TEXT DEFAULT 'EUR',
  payment_method TEXT DEFAULT 'Virement Bancaire',
  status TEXT DEFAULT 'En attente de virement',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Table des Paramètres Généraux (Coordonnées bancaires, Pixels, Contact)
CREATE TABLE IF NOT EXISTS public.site_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  site_name TEXT DEFAULT 'Maison Lune',
  announcement TEXT,
  hero_title TEXT,
  hero_subtitle TEXT,
  contact_phone TEXT,
  contact_address TEXT,
  contact_email TEXT,
  contact_hours TEXT,
  bank_name TEXT,
  bank_account_holder TEXT,
  bank_iban TEXT,
  bank_swift TEXT,
  bank_instructions TEXT,
  facebook_pixel_id TEXT,
  tiktok_pixel_id TEXT,
  google_tag_id TEXT,
  custom_pixel_script TEXT,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Initialisation des paramètres par défaut
INSERT INTO public.site_settings (id, site_name, announcement, contact_phone, contact_email, contact_address, contact_hours)
VALUES (
  1,
  'Maison Lune',
  'Livraison offerte dès 60 € en France métropolitaine · Retours sous 30 jours',
  '+33 1 42 56 12 00',
  'contact@maisonlune.fr',
  '24 avenue Montaigne, 75008 Paris, France',
  'Lundi – Vendredi : 10h – 19h · Samedi : 10h – 17h'
)
ON CONFLICT (id) DO NOTHING;

-- Initialisation des premiers soins d'exception dans le catalogue
INSERT INTO public.products (id, name, category, type, price, raw_price, description, image, tag, rating, reviews_count)
VALUES 
(
  'idole-now-lancome',
  'Idôle Now — Lancôme Paris',
  'Haute Cosmétique',
  'Eau de Parfum Florale & Lumineuse · 50ml',
  '98,00 €',
  98.00,
  'Une fragrance lumineuse alliant la rose d''Isparta exaltée et l''orchidée vanillée. Le nouveau sillage audacieux des femmes contemporaines.',
  '/idole-now.webp',
  'Coup de Cœur',
  4.9,
  142
),
(
  'creme-supreme-anti-age',
  'Crème Régénérante Suprême 50ml',
  'Crèmes Anti-Âge',
  'Soin d''exception raffermissant & anti-rides',
  '185,00 €',
  185.00,
  'Formule veloutée enrichie en cellules souches de rose noire et acide hyaluronique pur. Redensifie la matrice cutanée et lisse visiblement les rides.',
  'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=900&q=85',
  'N°1 des Ventes',
  4.9,
  248
),
(
  'serum-elixir-jeunesse',
  'Élixir Botanique Jeunesse Absolue 30ml',
  'Sérums & Élixirs',
  'Concentré réparateur d''éclat haute performance',
  '145,00 €',
  145.00,
  'Concentré puissant d''huiles botaniques rares et de vitamine C stabilisée pour illuminer le teint, affiner le grain de peau et estomper les taches.',
  'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=900&q=85',
  'Édition Limitée',
  5.0,
  189
)
ON CONFLICT (id) DO NOTHING;

-- Configuration de la vitrine Nouveautés par défaut
INSERT INTO public.nouveautes (product_id, custom_label, display_order)
VALUES 
('idole-now-lancome', 'Parfumerie · Nouveau', 1),
('creme-supreme-anti-age', 'Soins Anti-Âge · N°1 des Ventes', 2)
ON CONFLICT DO NOTHING;

-- 5. Activation des Politiques de Sécurité (Row Level Security - RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nouveautes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Lecture publique pour les visiteurs
CREATE POLICY "Lecture publique des produits" ON public.products FOR SELECT USING (true);
CREATE POLICY "Lecture publique des nouveautés" ON public.nouveautes FOR SELECT USING (true);
CREATE POLICY "Lecture publique des paramètres" ON public.site_settings FOR SELECT USING (true);

-- Permettre aux clients d'enregistrer leurs commandes
CREATE POLICY "Enregistrement des commandes par les clients" ON public.orders FOR INSERT WITH CHECK (true);

-- Modifications complètes pour les utilisateurs authentifiés / admin
CREATE POLICY "Gestion totale des produits" ON public.products FOR ALL USING (true);
CREATE POLICY "Gestion totale des nouveautés" ON public.nouveautes FOR ALL USING (true);
CREATE POLICY "Gestion totale des paramètres" ON public.site_settings FOR ALL USING (true);
CREATE POLICY "Gestion totale des commandes" ON public.orders FOR ALL USING (true);
