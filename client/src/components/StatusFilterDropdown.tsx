import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { PROJECT_STATUSES } from "@/lib/utils";

interface StatusFilterDropdownProps {
  selectedStatuses: string[];
  onStatusChange: (statuses: string[]) => void;
}

export function StatusFilterDropdown({
  selectedStatuses,
  onStatusChange,
}: StatusFilterDropdownProps) {
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

  const handleStatusToggle = (status: string) => {
    setSelectedStatuses((prev) => {
      if (prev.includes(status)) {
        return prev.filter((s) => s !== status);
      } else {
        return [...prev, status];
      }
    });
  };

  const setSelectedStatuses = (statuses: string[]) => {
    onStatusChange(statuses);
  };

  const displayText =
    selectedStatuses.length === 0
      ? "All"
      : selectedStatuses.length === 1
        ? selectedStatuses[0]
        : `${selectedStatuses.length} selected`;

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
        <div className="absolute top-full left-0 mt-1 bg-white border border-border rounded shadow-lg z-50 min-w-[150px]">
          {/* "All" option */}
          <label className="flex items-center gap-2 px-3 py-2 hover:bg-red-600 hover:text-white cursor-pointer transition-colors border-b border-border">
            <input
              type="checkbox"
              checked={selectedStatuses.length === 0}
              onChange={() => onStatusChange([])}
              className="w-4 h-4 cursor-pointer"
            />
            <span className="text-xs font-medium">All</span>
          </label>

          {/* Status options */}
          {PROJECT_STATUSES.map((status) => (
            <label
              key={status}
              className="flex items-center gap-2 px-3 py-2 hover:bg-red-600 hover:text-white cursor-pointer transition-colors border-b border-border last:border-b-0"
            >
              <input
                type="checkbox"
                checked={selectedStatuses.includes(status)}
                onChange={() => handleStatusToggle(status)}
                className="w-4 h-4 cursor-pointer"
              />
              <span className="text-xs font-medium">{status}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
