import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── Types ───
export interface Poll {
  id: string
  user_id: string
  title: string
  description: string | null
  duration: string
  location: string | null
  timezone: string
  dates: string[]
  slot_keys: string[]
  grid_data: Record<string, string[]>
  deadline:string | null
  created_at: string
}

export interface Vote {
  id: string
  poll_id: string
  voter_name: string
  voter_timezone: string
  choices: Record<string, 'yes' | 'maybe' | 'no'>
  created_at: string
}

// ─── Auth ───
export async function signUpWithEmail(email: string, password: string) {
  return supabase.auth.signUp({ email, password })
}

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: 'https://rendezvous-phi.vercel.app/dashboard' }
  })
}

export async function signOut() {
  return supabase.auth.signOut()
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// ─── Poll CRUD ───
export async function createPoll(poll: Omit<Poll, 'id' | 'created_at'>): Promise<Poll | null> {
  const { data, error } = await supabase.from('polls').insert(poll).select().single()
  if (error) { console.error('Create poll error:', error); return null }
  return data
}

export async function getMyPolls(): Promise<Poll[]> {
  const { data, error } = await supabase
    .from('polls').select('*').order('created_at', { ascending: false })
  if (error) return []
  return data || []
}

export async function getPoll(id: string): Promise<Poll | null> {
  const { data, error } = await supabase.from('polls').select('*').eq('id', id).single()
  if (error) return null
  return data
}

export async function deletePoll(id: string) {
  return supabase.from('polls').delete().eq('id', id)
}

// ─── Vote CRUD ───
export async function submitVote(vote: Omit<Vote, 'id' | 'created_at'>): Promise<Vote | null> {
  const { data, error } = await supabase.from('votes').insert(vote).select().single()
  if (error) { console.error('Submit vote error:', error); return null }
  return data
}

export async function getVotes(pollId: string): Promise<Vote[]> {
  const { data, error } = await supabase
    .from('votes').select('*').eq('poll_id', pollId).order('created_at', { ascending: true })
  if (error) return []
  return data || []
}
