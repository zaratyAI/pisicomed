-- Allow deletion on companies
CREATE POLICY "Anyone can delete companies" ON public.companies FOR DELETE TO public USING (true);

-- Allow deletion on evaluations
CREATE POLICY "Anyone can delete evaluations" ON public.evaluations FOR DELETE TO public USING (true);

-- Allow deletion on action_plans
CREATE POLICY "Anyone can delete action_plans" ON public.action_plans FOR DELETE TO public USING (true);

-- Allow deletion on answers
CREATE POLICY "Anyone can delete answers" ON public.answers FOR DELETE TO public USING (true);

-- Allow deletion on journey_stages
CREATE POLICY "Anyone can delete journey_stages" ON public.journey_stages FOR DELETE TO public USING (true);

-- Allow deletion on quote_requests
CREATE POLICY "Anyone can delete quote_requests" ON public.quote_requests FOR DELETE TO public USING (true);

-- Allow deletion on appointments
CREATE POLICY "Anyone can delete appointments" ON public.appointments FOR DELETE TO public USING (true);

-- Allow deletion on email_logs
CREATE POLICY "Anyone can delete email_logs" ON public.email_logs FOR DELETE TO public USING (true);

-- Allow deletion on evaluators
CREATE POLICY "Anyone can delete evaluators" ON public.evaluators FOR DELETE TO public USING (true);