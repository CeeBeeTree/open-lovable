import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { name, description, sandboxUrl, sandboxId, files } = await request.json();

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name,
        description,
        preview_url: sandboxUrl,
        sandbox_id: sandboxId,
      })
      .select()
      .single();

    if (projectError) {
      return NextResponse.json({ error: projectError.message }, { status: 500 });
    }

    if (files && files.length > 0) {
      const uploadPromises = files.map(async (file: { path: string; content: string }) => {
        const filePath = `${user.id}/${project.id}/${file.path}`;
        const blob = new Blob([file.content], { type: 'text/plain' });
        
        return supabase.storage
          .from('projects')
          .upload(filePath, blob);
      });

      await Promise.all(uploadPromises);
    }

    return NextResponse.json({ success: true, project });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
