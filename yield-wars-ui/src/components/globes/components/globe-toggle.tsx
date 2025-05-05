import { cn } from "@/lib/utils";
import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/stores/store';
import { setWorldFlat, setInitialLoad } from '@/stores/features/uiSlice';

interface GlobeToggleProps {
  className?: string;
  appearDelay?: number;
}

export function GlobeToggle({ className, appearDelay = 1000 }: GlobeToggleProps) {
  const [isVisible, setIsVisible] = useState(false);
  const isWorldFlat = useSelector((state: RootState) => state.ui.isWorldFlat);
  const isInitialLoad = useSelector((state: RootState) => state.ui.isInitialLoad);
  const dispatch = useDispatch();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, appearDelay);

    return () => clearTimeout(timer);
  }, [appearDelay]);

  const handleSetFlat = (value: boolean) => {
    if (isInitialLoad) {
      dispatch(setInitialLoad(false));
    }
    dispatch(setWorldFlat(value));
  }

  return (
    <div className={cn(
      "z-[800] p-4 bg-black/80 border border-green-500 rounded-lg text-white flex flex-row items-center justify-center gap-2 transition-opacity duration-1000",
      isVisible ? "opacity-100" : "opacity-0",
      className
    )}>
      <p className="text-sm ">Is the world flat?</p>
      <div className="flex gap-2">
        <button
          onClick={() => handleSetFlat(true)}
          className={cn(
            "px-3 rounded",
            isWorldFlat ? "bg-green-500 text-black" : "bg-black/50 text-green-500 "
          )}
        >
          Yes
        </button>
        <button
          onClick={() => handleSetFlat(false)}
          className={cn(
            "px-3 py-1 rounded",
            !isWorldFlat ? "bg-green-500 text-black" : "bg-black/50 text-green-500 border border-green-500"
          )}
        >
          No
        </button>
      </div>
    </div>
  );
} 