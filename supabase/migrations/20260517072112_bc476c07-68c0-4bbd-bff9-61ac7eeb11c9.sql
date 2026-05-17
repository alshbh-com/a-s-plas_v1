
-- 1) Add helper function to get user's office_id
CREATE OR REPLACE FUNCTION public.user_office_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT office_id FROM public.profiles WHERE id = _user_id LIMIT 1 $$;

-- 2) Add missing order statuses
INSERT INTO public.order_statuses (name, color, sort_order)
SELECT v.name, v.color, v.sort_order
FROM (VALUES
  ('تهرب', '#f59e0b', 100),
  ('استلام جزئي', '#3b82f6', 101),
  ('رفض ودفع شحن', '#ef4444', 102),
  ('رفض بدون دفع شحن', '#dc2626', 103)
) AS v(name, color, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.order_statuses os WHERE os.name = v.name);

-- 3) Allow couriers to update their own orders
DROP POLICY IF EXISTS courier_update_own_orders ON public.orders;
CREATE POLICY courier_update_own_orders ON public.orders
FOR UPDATE TO authenticated
USING (courier_id = auth.uid())
WITH CHECK (courier_id = auth.uid());

-- 4) Allow offices to insert orders for their office
DROP POLICY IF EXISTS office_insert_orders ON public.orders;
CREATE POLICY office_insert_orders ON public.orders
FOR INSERT TO authenticated
WITH CHECK (office_id IS NOT NULL AND office_id = public.user_office_id(auth.uid()));

-- 5) Allow offices to update their own orders
DROP POLICY IF EXISTS office_update_own_orders ON public.orders;
CREATE POLICY office_update_own_orders ON public.orders
FOR UPDATE TO authenticated
USING (office_id = public.user_office_id(auth.uid()))
WITH CHECK (office_id = public.user_office_id(auth.uid()));

-- 6) Allow any authenticated user to insert their own order notes
DROP POLICY IF EXISTS auth_insert_order_notes ON public.order_notes;
CREATE POLICY auth_insert_order_notes ON public.order_notes
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- 7) Allow couriers to insert collections for themselves
DROP POLICY IF EXISTS courier_insert_collections ON public.courier_collections;
CREATE POLICY courier_insert_collections ON public.courier_collections
FOR INSERT TO authenticated
WITH CHECK (courier_id = auth.uid());

DROP POLICY IF EXISTS courier_delete_own_collections ON public.courier_collections;
CREATE POLICY courier_delete_own_collections ON public.courier_collections
FOR DELETE TO authenticated
USING (courier_id = auth.uid());
