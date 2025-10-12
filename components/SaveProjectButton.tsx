'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface SaveProjectButtonProps {
  sandboxData: any;
  disabled?: boolean;
}

export default function SaveProjectButton({ sandboxData, disabled }: SaveProjectButtonProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const saveProject = async () => {
    if (!user) {
      alert('Войдите в аккаунт чтобы сохранить проект');
      return;
    }

    if (!sandboxData) {
      alert('Нет активного проекта для сохранения');
      return;
    }

    const projectName = prompt('Название проекта:');
    if (!projectName) return;

    setSaving(true);
    try {
      const response = await fetch('/api/projects/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName,
          sandboxUrl: sandboxData.url,
          sandboxId: sandboxData.sandboxId
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Проект сохранен в личном кабинете!');
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      alert(`Ошибка: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Button 
      variant="code"
      onClick={saveProject}
      disabled={disabled || saving}
      size="sm"
      title="Сохранить в кабинет"
    >
      {saving ? (
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
      )}
    </Button>
  );
}
