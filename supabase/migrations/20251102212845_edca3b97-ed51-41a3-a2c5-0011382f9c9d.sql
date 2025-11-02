-- Drop the old policy that only allows professionals to manage their own availability
DROP POLICY IF EXISTS "Professionals can manage own availability" ON availability;

-- Create new policy that allows authenticated users to manage all availability
CREATE POLICY "Authenticated users can manage availability"
  ON availability
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');