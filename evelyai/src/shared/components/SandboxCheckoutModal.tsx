'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CreditCard, Copy, Check, X, ArrowRight } from 'lucide-react';

interface SandboxCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export default function SandboxCheckoutModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
}: SandboxCheckoutModalProps) {
  const [copiedField, setCopiedField] = useState<'number' | 'exp' | 'cvc' | 'all' | null>(null);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, loading]);

  const copyToClipboard = useCallback(async (text: string, field: 'number' | 'exp' | 'cvc' | 'all') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => {
        setCopiedField((cur) => (cur === field ? null : cur));
      }, 2000);
    } catch {
      // Fallback if clipboard API is restricted
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedField(field);
      setTimeout(() => {
        setCopiedField((cur) => (cur === field ? null : cur));
      }, 2000);
    }
  }, []);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      onClick={() => !loading && onClose()}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 backdrop-blur-sm bg-black/60"
      style={{ animation: 'scmBackdropIn 0.2s ease both' }}
    >
      <style>{`
        @keyframes scmBackdropIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes scmSheetIn {
          from { opacity: 0; transform: translateY(20px) scale(0.96) }
          to { opacity: 1; transform: translateY(0) scale(1) }
        }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sandbox-modal-title"
        className="w-full max-w-md rounded-3xl border border-border-color bg-card-bg p-5 sm:p-6 shadow-soft-xl flex flex-col text-left relative overflow-hidden"
        style={{ animation: 'scmSheetIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) both' }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          aria-label="ปิด"
          className="absolute top-4 right-4 rounded-full p-2 text-foreground/40 hover:bg-foreground/10 hover:text-foreground transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-warning/15 text-warning border border-warning/25">
            <CreditCard size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 id="sandbox-modal-title" className="text-lg font-bold text-foreground">
                ทดสอบการชำระเงิน
              </h3>
              <span className="inline-flex items-center rounded-md bg-warning/15 px-2 py-0.5 text-[11px] font-bold text-warning border border-warning/30">
                Sandbox
              </span>
            </div>
            <p className="text-xs text-foreground/70">
              โหมดทดสอบ • ไม่มีการเรียกเก็บเงินจริง
            </p>
          </div>
        </div>

        {/* Test card details */}
        <div className="mt-4 rounded-2xl border border-border-color bg-background p-4 shadow-soft-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-bg text-primary">
                <CreditCard size={18} />
              </span>
              <div>
                <p className="text-sm font-bold text-foreground">ข้อมูลบัตรทดสอบ</p>
                <p className="text-[11px] text-foreground/55">ใช้สำหรับชำระเงินในหน้า Stripe</p>
              </div>
            </div>
            <span className="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
              Test card
            </span>
          </div>

          {/* Card Number */}
          <div className="mb-3">
            <div className="mb-1 text-[11px] font-semibold text-foreground/55">
              หมายเลขบัตร (Card Number)
            </div>
            <div className="flex items-center justify-between gap-2 rounded-xl border border-border-color bg-card-bg px-3 py-2.5">
              <span className="font-mono text-base font-bold tracking-[0.12em] text-foreground sm:text-lg">
                4242 4242 4242 4242
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard('4242424242424242', 'number')}
                className="flex shrink-0 items-center gap-1 rounded-lg bg-primary-bg px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 cursor-pointer"
                title="คัดลอกหมายเลขบัตร"
              >
                {copiedField === 'number' ? (
                  <>
                    <Check size={13} className="text-correct" />
                    <span className="text-correct">คัดลอกแล้ว</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>คัดลอก</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Card Expiry & CVC */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-1 text-[11px] font-semibold text-foreground/55">
                หมดอายุ (Expires)
              </div>
              <div className="flex items-center justify-between gap-1 rounded-xl border border-border-color bg-card-bg px-3 py-2.5">
                <span className="font-mono text-sm font-bold text-foreground">01/30</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard('01/30', 'exp')}
                  className="rounded-lg bg-primary-bg p-1.5 text-primary transition-colors hover:bg-primary/15 cursor-pointer"
                  title="คัดลอกวันหมดอายุ"
                >
                  {copiedField === 'exp' ? (
                    <Check size={13} className="text-correct" />
                  ) : (
                    <Copy size={13} />
                  )}
                </button>
              </div>
            </div>

            <div>
              <div className="mb-1 text-[11px] font-semibold text-foreground/55">
                CVC / CVV
              </div>
              <div className="flex items-center justify-between gap-1 rounded-xl border border-border-color bg-card-bg px-3 py-2.5">
                <span className="font-mono text-sm font-bold text-foreground">424</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard('424', 'cvc')}
                  className="rounded-lg bg-primary-bg p-1.5 text-primary transition-colors hover:bg-primary/15 cursor-pointer"
                  title="คัดลอกรหัส CVC"
                >
                  {copiedField === 'cvc' ? (
                    <Check size={13} className="text-correct" />
                  ) : (
                    <Copy size={13} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-hover px-4 py-3 text-sm font-bold text-white dark:text-gray-900 shadow-soft-sm transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white dark:border-gray-900 border-t-transparent" />
                <span>กำลังเตรียมหน้าชำระเงิน...</span>
              </>
            ) : (
              <>
                <span>ไปยังหน้าชำระเงิน</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-full rounded-xl bg-foreground/5 hover:bg-foreground/10 px-4 py-2.5 text-xs font-semibold text-foreground/75 transition-colors cursor-pointer disabled:opacity-40"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
