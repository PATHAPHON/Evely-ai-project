"use client";

import { useState, useRef, useCallback } from "react";
import { useUserProfile } from "../_lib/useUserProfile";

/**
 * UserHeader displays the user's avatar (64px circle with neobrutalist border)
 * and display name. Tapping the name switches to an inline text input for editing.
 * Saves on Enter key or blur event.
 */
export default function UserHeader() {
  const { displayName, setDisplayName, avatarInitial } = useUserProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(displayName);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing = useCallback(() => {
    setEditValue(displayName);
    setIsEditing(true);
    // Focus the input after render
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [displayName]);

  const saveEdit = useCallback(() => {
    setDisplayName(editValue);
    setIsEditing(false);
  }, [editValue, setDisplayName]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        saveEdit();
      }
    },
    [saveEdit]
  );

  return (
    <div className="flex items-center gap-4">
      {/* Avatar circle */}
      <div
        className="w-16 h-16 rounded-full border-3 border-border-color bg-accent-pink-bg flex items-center justify-center shrink-0 shadow-nb-md"
      >
        <span className="text-2xl font-bold text-text-primary select-none">
          {avatarInitial}
        </span>
      </div>

      {/* Display name / edit input */}
      <div className="flex flex-col">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={handleKeyDown}
            className="text-xl font-bold text-text-primary bg-transparent border-b-3 border-border-color outline-none px-0 py-1"
            maxLength={30}
            aria-label="Edit display name"
          />
        ) : (
          <button
            type="button"
            onClick={startEditing}
            className="text-xl font-bold text-text-primary text-left cursor-pointer hover:underline decoration-2 underline-offset-4"
            aria-label="Tap to edit display name"
          >
            {displayName}
          </button>
        )}
      </div>
    </div>
  );
}
