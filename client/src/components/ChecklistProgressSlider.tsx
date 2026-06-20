import { useEffect, useState } from "react";
import { Slider } from "@/components/ui/slider";

interface ChecklistProgressSliderProps {
  /** Current saved progress 0-100. */
  value: number;
  /** Disable interaction (e.g. for users without permission). */
  disabled?: boolean;
  /** Called with the final value when the user releases the slider. */
  onCommit: (value: number) => void;
}

/**
 * Manual 0-100% work-progress slider for a single checklist item.
 * Shows the value live while dragging and only persists on release (onValueCommit).
 */
export function ChecklistProgressSlider({ value, disabled, onCommit }: ChecklistProgressSliderProps) {
  const [live, setLive] = useState(value);

  // Sync when the saved value changes (e.g. after refetch), but not mid-drag.
  useEffect(() => {
    setLive(value);
  }, [value]);

  return (
    <div className="flex items-center gap-3">
      <Slider
        value={[live]}
        min={0}
        max={100}
        step={5}
        disabled={disabled}
        onValueChange={([v]) => setLive(v)}
        onValueCommit={([v]) => onCommit(v)}
        className="flex-1"
        aria-label="Work progress"
      />
      <span className="w-10 text-right text-xs font-medium tabular-nums text-gray-600">{live}%</span>
    </div>
  );
}
