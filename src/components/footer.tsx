'use client';

import { ThemeToggle } from '@/components/ThemeToggle';
import { Github, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { open } from '@tauri-apps/plugin-shell';

export default function Footer() {
  const handleGithubClick = async () => {
    try {
      await open('https://github.com/ExpTechTW/StorViz');
    } catch (error) {
      console.error('Failed to open URL:', error);
    }
  };

  return (
    <footer>
      <div className="fixed bottom-4 right-4 z-50">
        <div className="border shadow-lg border-border rounded-lg p-2 flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleGithubClick}
            className="rounded-lg"
          >
            <Github className="h-[1.2rem] w-[1.2rem]" />
          </Button>
          <ThemeToggle />
        </div>
      </div>
      <div className="fixed bottom-4 left-4 z-50">
        <div className="border shadow-lg border-border rounded-lg p-2 flex gap-2">
          <Info className="h-[1.2rem] w-[1.2rem]" />
          <p className="text-sm text-muted-foreground">
            Version 0.1.0
          </p>
        </div>
      </div>
    </footer>
  )
}