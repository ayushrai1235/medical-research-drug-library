-- Seed approved 7 categories and 19 drugs
-- Preserve project-provided grouping exactly

INSERT INTO public.categories (name, slug, sort_order) VALUES
  ('Biguanides', 'biguanides', 1),
  ('DPP-4 Inhibitors', 'dpp-4-inhibitors', 2),
  ('TZDs (Thiazolidinediones)', 'tzd-thiazolidinediones', 3),
  ('Sulfonylureas', 'sulfonylureas', 4),
  ('Alpha-glucosidase Inhibitors', 'alpha-glucosidase-inhibitors', 5),
  ('SGLT-2 Inhibitors', 'sglt-2-inhibitors', 6),
  ('Non-Sulphonylureas', 'non-sulphonylureas', 7)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

-- Biguanides (1)
INSERT INTO public.drugs (category_id, name, slug, sort_order, pdf_status)
SELECT id, 'Metformin', 'metformin', 1, 'missing'
FROM public.categories WHERE slug = 'biguanides'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

-- DPP-4 Inhibitors (4)
INSERT INTO public.drugs (category_id, name, slug, sort_order, pdf_status)
SELECT id, 'Sitagliptin', 'sitagliptin', 1, 'missing'
FROM public.categories WHERE slug = 'dpp-4-inhibitors'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

INSERT INTO public.drugs (category_id, name, slug, sort_order, pdf_status)
SELECT id, 'Vildagliptin', 'vildagliptin', 2, 'missing'
FROM public.categories WHERE slug = 'dpp-4-inhibitors'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

INSERT INTO public.drugs (category_id, name, slug, sort_order, pdf_status)
SELECT id, 'Linagliptin', 'linagliptin', 3, 'missing'
FROM public.categories WHERE slug = 'dpp-4-inhibitors'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

INSERT INTO public.drugs (category_id, name, slug, sort_order, pdf_status)
SELECT id, 'Saxagliptin', 'saxagliptin', 4, 'missing'
FROM public.categories WHERE slug = 'dpp-4-inhibitors'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

-- TZDs (Thiazolidinediones) (1)
INSERT INTO public.drugs (category_id, name, slug, sort_order, pdf_status)
SELECT id, 'Pioglitazone', 'pioglitazone', 1, 'missing'
FROM public.categories WHERE slug = 'tzd-thiazolidinediones'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

-- Sulfonylureas (4)
INSERT INTO public.drugs (category_id, name, slug, sort_order, pdf_status)
SELECT id, 'Glimepiride', 'glimepiride', 1, 'missing'
FROM public.categories WHERE slug = 'sulfonylureas'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

INSERT INTO public.drugs (category_id, name, slug, sort_order, pdf_status)
SELECT id, 'Glipizide', 'glipizide', 2, 'missing'
FROM public.categories WHERE slug = 'sulfonylureas'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

INSERT INTO public.drugs (category_id, name, slug, sort_order, pdf_status)
SELECT id, 'Glibenclamide', 'glibenclamide', 3, 'missing'
FROM public.categories WHERE slug = 'sulfonylureas'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

INSERT INTO public.drugs (category_id, name, slug, sort_order, pdf_status)
SELECT id, 'Gliclazide', 'gliclazide', 4, 'missing'
FROM public.categories WHERE slug = 'sulfonylureas'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

-- Alpha-glucosidase Inhibitors (3)
INSERT INTO public.drugs (category_id, name, slug, sort_order, pdf_status)
SELECT id, 'Acarbose', 'acarbose', 1, 'missing'
FROM public.categories WHERE slug = 'alpha-glucosidase-inhibitors'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

INSERT INTO public.drugs (category_id, name, slug, sort_order, pdf_status)
SELECT id, 'Miglitol', 'miglitol', 2, 'missing'
FROM public.categories WHERE slug = 'alpha-glucosidase-inhibitors'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

INSERT INTO public.drugs (category_id, name, slug, sort_order, pdf_status)
SELECT id, 'Voglibose', 'voglibose', 3, 'missing'
FROM public.categories WHERE slug = 'alpha-glucosidase-inhibitors'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

-- SGLT-2 Inhibitors (3)
INSERT INTO public.drugs (category_id, name, slug, sort_order, pdf_status)
SELECT id, 'Empagliflozin', 'empagliflozin', 1, 'missing'
FROM public.categories WHERE slug = 'sglt-2-inhibitors'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

INSERT INTO public.drugs (category_id, name, slug, sort_order, pdf_status)
SELECT id, 'Canagliflozin', 'canagliflozin', 2, 'missing'
FROM public.categories WHERE slug = 'sglt-2-inhibitors'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

INSERT INTO public.drugs (category_id, name, slug, sort_order, pdf_status)
SELECT id, 'Dapagliflozin', 'dapagliflozin', 3, 'missing'
FROM public.categories WHERE slug = 'sglt-2-inhibitors'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

-- Non-Sulphonylureas (3)
INSERT INTO public.drugs (category_id, name, slug, sort_order, pdf_status)
SELECT id, 'Nateglinide', 'nateglinide', 1, 'missing'
FROM public.categories WHERE slug = 'non-sulphonylureas'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

INSERT INTO public.drugs (category_id, name, slug, sort_order, pdf_status)
SELECT id, 'Repaglinide', 'repaglinide', 2, 'missing'
FROM public.categories WHERE slug = 'non-sulphonylureas'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

INSERT INTO public.drugs (category_id, name, slug, sort_order, pdf_status)
SELECT id, 'Semaglutide', 'semaglutide', 3, 'missing'
FROM public.categories WHERE slug = 'non-sulphonylureas'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

