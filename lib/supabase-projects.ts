import { supabase } from './supabase';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  preview_url?: string;
  sandbox_id?: string;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export async function getUserProjects(options?: {
  status?: 'active' | 'archived';
  limit?: number;
}): Promise<Project[]> {
  let query = supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function saveProject(project: {
  name: string;
  description?: string;
  sandboxUrl?: string;
  sandboxId?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      name: project.name,
      description: project.description,
      preview_url: project.sandboxUrl,
      sandbox_id: project.sandboxId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
