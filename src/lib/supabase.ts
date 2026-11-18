import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fkgpelbhefqduvrxpykc.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrZ3BlbGJoZWZxZHV2cnhweWtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ5NjkzNTcsImV4cCI6MjExMDU0NTM1N30.GtbunS8WcPNND3fVK8186keUPDOZ0WkzmGfVyILWN7A';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
