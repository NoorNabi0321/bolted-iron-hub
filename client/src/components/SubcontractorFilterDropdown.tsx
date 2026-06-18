import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface Subcontractor {
  id: number;
  companyName: string;
}

interface SubcontractorFilterDropdownProps {
  subcontractors: Subcontractor[];
  selectedSubIds: number[];
  onSubcontractorChange: (subIds: number[]) => void;
}

export function SubcontractorFilterDropdown({
  subcontractors,
  selectedSubIds,
  onSubcontractorChange,
}: SubcontractorFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubcontractorToggle = (subId: number) => {
    if (selectedSubIds.includes(subId)) {
      onSubcontractorChange(selectedSubIds.filter((id) => id !== subId));
    } else {
      onSubcontractorChange([...selectedSubIds, subId]);
    }
  };

  const displayText =
    selectedSubIds.length === 0
      ? "All"
      : selectedSubIds.length === 1
        ? subcontractors.find((s) => s.id === selectedSubIds[0])?.companyName || "All"
        : `${selectedSubIds.length} selected`;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 text-xs rounded border border-border bg-white hover:bg-red-50 transition-colors flex items-center gap-2 whitespace-nowrap"
      >
        <span>{displayText}</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-border rounded shadow-lg z-50 min-w-[150px] max-h-[300px] overflow-y-auto">
          {/* "All" option */}
          <label className="flex items-center gap-2 px-3 py-2 hover:bg-red-600 hover:text-white cursor-pointer transition-colors border-b border-border">
            <input
              type="checkbox"
              checked={selectedSubIds.length === 0}
              onChange={() => onSubcontractorChange([])}
              className="w-4 h-4 cursor-pointer"
            />
            <span className="text-xs font-medium">All</span>
          </label>

          {/* Subcontractor options */}
          {subcontractors.map((sub) => (
            <label
              key={sub.id}
              className="flex items-center gap-2 px-3 py-2 hover:bg-red-600 hover:text-white cursor-pointer transition-colors border-b border-border last:border-b-0"
            >
              <input
                type="checkbox"
                checked={selectedSubIds.includes(sub.id)}
                onChange={() => handleSubcontractorToggle(sub.id)}
                className="w-4 h-4 cursor-pointer"
              />
              <span className="text-xs font-medium">{sub.companyName}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
