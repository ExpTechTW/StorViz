'use client';

import { ThemeToggle } from '@/components/ThemeToggle';
import { Github, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { open } from '@tauri-apps/plugin-shell';
import { getVersion } from '@tauri-apps/api/app';
import { useState, useEffect } from 'react';

export default function Footer() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [version, setVersion] = useState('loading...');

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
        <div className={`border shadow-lg border-border rounded-lg p-2 flex items-center ${isExpanded ? 'gap-2' : ''} h-11 transition-all duration-300 ease-in-out`}>
          <div className="flex items-center">
            <p className="text-xs text-muted-foreground">
              {version}
            </p>
          </div>
          <div 
            className={`flex gap-1.5 transition-all duration-300 ease-in-out overflow-hidden ${
              isExpanded 
                ? 'max-w-[200px] opacity-100 translate-x-0' 
                : 'max-w-0 opacity-0 -translate-x-4'
            }`}
          >
            <div className="w-px h-auto bg-border" />
            <Button
              variant="outline" 
              size="icon"
              onClick={handleGithubClick}
              className="rounded-lg h-7 w-7 shrink-0"
            >
              <Github className="h-4 w-4" />
            </Button>
            <div className="shrink-0">
              <ThemeToggle />
            </div>
          </div>
          {!isExpanded ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(true)}
              className="rounded-lg h-5 w-5 transition-transform duration-200 hover:scale-110"
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(false)}
              className="rounded-lg h-5 w-5 transition-transform duration-200 hover:scale-110"
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </footer>
  )
}