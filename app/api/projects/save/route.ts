import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { name, description } = await request.json();

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create ZIP from sandbox
    const zipResponse = await fetch(`${request.nextUrl.origin}/api/create-zip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!zipResponse.ok) {
      throw new Error('Failed to create ZIP');
    }

    const zipData = await zipResponse.json();
    
    if (!zipData.success) {
      throw new Error(zipData.error || 'Failed to create ZIP');
    }

    // Convert base64 to blob
    const base64Data = zipData.dataUrl.split(',')[1];
    const binaryData = Buffer.from(base64Data, 'base64');
    
    // Create project record
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name,
        description,
      })
      .select()
      .single();

    if (projectError) {
      return NextResponse.json({ error: projectError.message }, { status: 500 });
    }

    // Upload ZIP to storage
    const zipPath = `${user.id}/${project.id}/project.zip`;
    const { error: uploadError } = await supabase.storage
      .from('projects')
      .upload(zipPath, binaryData, {
        contentType: 'application/zip',
        upsert: false
      });

    if (uploadError) {
      // Cleanup project if upload fails
      await supabase.from('projects').delete().eq('id', project.id);
      throw uploadError;
    }

    return NextResponse.json({ success: true, project });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
