import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/stores/store';
import { toggleResourcesVisible, toggleLeaderboardVisible } from '@/stores/features/uiSlice';
import { BookOpen, Trophy, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  className?: string;
  appearDelay?: number;
}

export function MobileNav({ className, appearDelay = 1000 }: MobileNavProps) {
  const [isVisible, setIsVisible] = useState(false);
  const dispatch = useDispatch();
  const isResourcesVisible = useSelector((state: RootState) => state.ui.isResourcesVisible);
  const isLeaderboardVisible = useSelector((state: RootState) => state.ui.isLeaderboardVisible);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, appearDelay);
    return () => clearTimeout(timer);
  }, [appearDelay]);

  if (!isVisible) {
    return null;
  }

  return (
    <nav className={cn(
      "w-full backdrop-blur-sm border-b border-green-500/20 z-50",
      "flex items-center justify-center px-4",
      "lg:hidden", // Hide on desktop
      className
    )}>
      <div className="flex items-center gap-4">
        <button
          onClick={() => dispatch(toggleResourcesVisible())}
          className={cn(
            "p-2 rounded-lg transition-colors",
            "hover:bg-green-500/20",
            isResourcesVisible && "bg-green-500/20"
          )}
        >
          <BookOpen className="w-6 h-6 text-green-500" />
        </button>
        <button
          onClick={() => dispatch(toggleLeaderboardVisible())}
          className={cn(
            "p-2 rounded-lg transition-colors",
            "hover:bg-green-500/20",
            isLeaderboardVisible && "bg-green-500/20"
          )}
        >
          <Trophy className="w-6 h-6 text-green-500" />
        </button>
        <button className="p-2 rounded-lg hover:bg-green-500/20">
          <Settings className="w-6 h-6 text-green-500" />
        </button>
      </div>
    </nav>
  );
} 