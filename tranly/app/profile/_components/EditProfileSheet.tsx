"use client";

import { useState } from "react";
import { useStrings } from "@/app/_lib/utils/strings";
import BottomSheet from "./BottomSheet";
import SlothMascot from "./SlothMascot";
import type { UseUserProfileReturn } from "@/app/_lib/hooks/useUserProfile";

interface EditProfileSheetProps {
  open: boolean;
  onClose: () => void;
  profile: UseUserProfileReturn;
  onSaved: () => void;
}

const BIO_MAX = 120;

const fieldClass =
  "w-full rounded-xl border border-gray-250 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 px-3.5 py-3 text-[15px] text-text-primary outline-none transition-all focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-[#131314] focus:shadow-sm";
const labelClass =
  "mb-2 block text-xs font-bold uppercase tracking-wide text-text-secondary";

/** Bottom-sheet form for editing the persisted profile fields. */
export default function EditProfileSheet({
  open,
  onClose,
  profile,
  onSaved,
}: EditProfileSheetProps) {
  const t = useStrings();
  const [name, setName] = useState(profile.displayName);
  const [handle, setHandle] = useState(profile.handle);
  const [role, setRole] = useState(profile.role);
  const [bio, setBio] = useState(profile.bio);
  const [location, setLocation] = useState(profile.location);

  // Seed the form from the latest profile each time the sheet transitions to
  // open. Adjusting state during render (the React-recommended pattern) avoids
  // an effect + cascading render.
  const [wasOpen, setWasOpen] = useState(open);
  if (open && !wasOpen) {
    setWasOpen(true);
    setName(profile.displayName);
    setHandle(profile.handle);
    setRole(profile.role);
    setBio(profile.bio);
    setLocation(profile.location);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  function handleSave() {
    profile.updateProfile({
      displayName: name,
      handle: handle.replace(/^@/, ""),
      role,
      bio,
      location,
    });
    onClose();
    onSaved();
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={t.profile.editProfile}
      ariaLabel={t.profile.editProfile}
      closeAria={t.profile.closeAria}
      heightClass="h-[88%]"
      footer={
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-250 dark:border-gray-800 bg-white dark:bg-[#1e1f20] py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 shadow-sm transition-all hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-98 cursor-pointer"
          >
            {t.profile.cancel}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 py-2.5 text-sm font-bold text-white shadow-sm transition-all active:scale-98 cursor-pointer"
          >
            {t.profile.save}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-5 px-4 py-5">
        {/* Avatar preview */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-pink-100 dark:border-pink-900 bg-pink-50/50 dark:bg-pink-950/20 shadow-sm">
            <SlothMascot size={56} interactive />
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="ef-name">{t.profile.displayNameLabel}</label>
          <input
            id="ef-name"
            className={fieldClass}
            type="text"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="ef-handle">{t.profile.handleLabel}</label>
          <div className="flex items-center rounded-xl border border-gray-250 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 focus-within:border-blue-500 dark:focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-[#131314] transition-all">
            <span className="pl-3.5 font-mono text-[15px] text-text-secondary">@</span>
            <input
              id="ef-handle"
              className="flex-1 bg-transparent px-2 py-3 text-[15px] text-text-primary outline-none"
              type="text"
              value={handle}
              maxLength={20}
              autoCapitalize="none"
              spellCheck={false}
              onChange={(e) => setHandle(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="ef-role">{t.profile.roleLabel}</label>
          <input
            id="ef-role"
            className={fieldClass}
            type="text"
            value={role}
            maxLength={40}
            placeholder={t.profile.rolePlaceholder}
            onChange={(e) => setRole(e.target.value)}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="ef-bio">{t.profile.bioLabel}</label>
          <textarea
            id="ef-bio"
            className={`${fieldClass} min-h-20 resize-none leading-relaxed`}
            value={bio}
            maxLength={BIO_MAX}
            placeholder={t.profile.bioPlaceholder}
            onChange={(e) => setBio(e.target.value)}
          />
          <div className="mt-1.5 text-right font-mono text-xs text-text-meta">
            {bio.length}/{BIO_MAX}
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="ef-loc">{t.profile.locationLabel}</label>
          <input
            id="ef-loc"
            className={fieldClass}
            type="text"
            value={location}
            maxLength={40}
            placeholder={t.profile.locationPlaceholder}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
      </div>
    </BottomSheet>
  );
}
