-- Test ZADA Database Setup
-- Run this AFTER the simple_setup.sql to verify everything works

-- Test 1: Check if tables exist
SELECT 
  'customers' as table_name,
  COUNT(*) as record_count
FROM public.customers
UNION ALL
SELECT 
  'orders' as table_name,
  COUNT(*) as record_count  
FROM public.orders
UNION ALL
SELECT 
  'messages' as table_name,
  COUNT(*) as record_count
FROM public.messages;

-- Test 2: Check if we can insert a test message
INSERT INTO public.messages (order_id, type, sender_role, sender_id, content)
VALUES (null, 'support', 'admin', 'admin@zada.com', 'Database test message')
ON CONFLICT DO NOTHING;

-- Test 3: Show recent messages
SELECT 
  type,
  sender_role,
  sender_id,
  content,
  created_at
FROM public.messages
ORDER BY created_at DESC
LIMIT 5;

-- Test 4: Check if Realtime is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('customers', 'orders', 'messages');

SELECT 'All tests completed! Check the results above.' as status;
