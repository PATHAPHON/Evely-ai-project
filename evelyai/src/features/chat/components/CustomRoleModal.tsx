'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bot, X } from 'lucide-react';

export interface CustomRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPrompt: string;
  onSave: (prompt: string) => void;
  onClear: () => void;
}

export function CustomRoleModal({
  isOpen,
  onClose,
  currentPrompt,
  onSave,
  onClear,
}: CustomRoleModalProps) {
  const [draft, setDraft] = useState(currentPrompt);

  // Sync draft text whenever modal opens or currentPrompt changes
  useEffect(() => {
    if (isOpen) {
      setDraft(currentPrompt);
    }
  }, [isOpen, currentPrompt]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const hasCurrentPrompt = Boolean(currentPrompt && currentPrompt.trim().length > 0);

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-role-modal-title"
        className="relative w-full max-w-lg rounded-[28px] bg-card-bg border border-border-color p-6 shadow-soft-lg flex flex-col gap-4 animate-bubble-pop-in"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Bot className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="custom-role-modal-title"
                className="text-lg font-bold text-foreground leading-tight"
              >
                ตั้งค่าบทบาท AI
              </h2>
              <span className="text-xs text-foreground/50 font-medium">
                Custom Persona / Role
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="rounded-full p-2 text-foreground/50 hover:text-foreground hover:bg-foreground/10 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40 -mr-1 -mt-1"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Description */}
        <p className="text-sm text-foreground/75 leading-relaxed">
          กำหนดบทบาท บุคลิก หรือสถานการณ์ให้ AI (เช่น ครูสอนภาษาใจดี, เพื่อนร่วมงาน, พนักงานร้านกาแฟ) เพื่อให้ AI ตอบตามบริบทที่ต้องการ
        </p>

        {/* Textarea & Counter */}
        <div className="flex flex-col gap-1.5">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="เช่น คุณคือครูสอนภาษาอังกฤษใจดีที่คอยช่วยแนะนำคำศัพท์และแก้ประโยคให้เข้าใจง่าย..."
            maxLength={1000}
            rows={5}
            aria-label="กำหนดบทบาท AI"
            className="w-full rounded-2xl border border-border-color bg-background/60 p-4 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-sans resize-none"
          />
          <div className="flex justify-end">
            <span className="text-xs text-foreground/50 tabular-nums">
              {draft.length}/1000
            </span>
          </div>
        </div>

        {/* Footer / Buttons row */}
        <div className="flex items-center justify-between pt-1">
          <div>
            {hasCurrentPrompt && (
              <button
                type="button"
                onClick={() => {
                  onClear();
                  onClose();
                }}
                className="px-3.5 py-2 text-sm font-medium text-incorrect hover:text-red-700 dark:hover:text-red-300 hover:bg-incorrect/10 rounded-full transition-colors cursor-pointer"
              >
                ล้างค่าบทบาท
              </button>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-foreground/70 hover:text-foreground hover:bg-foreground/10 rounded-full transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={() => {
                onSave(draft);
                onClose();
              }}
              className="bg-primary hover:bg-primary-hover text-white rounded-full px-5 py-2.5 font-bold text-sm shadow-sm transition-all cursor-pointer active:scale-95"
            >
              บันทึกบทบาท
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default CustomRoleModal;
