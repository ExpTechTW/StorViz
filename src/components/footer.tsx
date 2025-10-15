'use client';

import { ThemeToggle } from '@/components/ThemeToggle';
import { Github, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { open } from '@tauri-apps/plugin-shell';
import { getVersion } from '@tauri-apps/api/app';
import { useState, useEffect } from 'react';

export default function Footer() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [version, setVersion] = useState('v0.1.0');

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const appVersion = await getVersion();
        setVersion(`v${appVersion}`);
      } catch (error) {
        console.error('Failed to fetch app version:', error);
      }
    };

    fetchVersion();
  }, []);

  const handleGithubClick = async () => {
    try {
      await open('https://github.com/ExpTechTW/StorViz');
    } catch (error) {
      console.error('Failed to open URL:', error);
    }
  };

  return (
    <footer>
      <div className="fixed bottom-4 left-4 z-50">
        <div className="border shadow-lg border-border rounded-lg p-2 flex items-center gap-2">
          {isExpanded ? (
            <>
              <div className="flex gap-1.5">
                <Button
                  variant="outline" 
                  size="icon"
                  onClick={handleGithubClick}
                  className="rounded-lg h-7 w-7"
                >
                  <Github className="h-4 w-4" />
                </Button>
                <ThemeToggle />
              </div>
              <div className="w-px h-3 bg-border" />
              <div className="flex items-center">
                <p className="text-xs text-muted-foreground">
                  {version}
                </p>
              </div>
              <div className="w-px h-3 bg-border" />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(false)}
                className="rounded-lg h-5 w-5"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center">
                <p className="text-xs text-muted-foreground">
                  {version}
                </p>
              </div>
              <div className="w-px h-3 bg-border" />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(true)}
                className="rounded-lg h-5 w-5"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>
    </footer>
  )
}