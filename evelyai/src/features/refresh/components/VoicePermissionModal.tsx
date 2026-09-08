'use client';

import { createPortal } from 'react-dom';
import { Mic, X, ShieldAlert, Lock, RotateCw } from 'lucide-react';

export type PermissionModalStatus = 'unrequested' | 'denied' | 'unsupported';

interface VoicePermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAllow: () => void;
  status: PermissionModalStatus;
}

export default function VoicePermissionModal({
  isOpen,
  onClose,
  onAllow,
  status,
}: VoicePermissionModalProps) {
  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center p-5 backdrop-blur-sm bg-black/60"
      style={{ animation: 'vpmBackdropIn 0.18s ease both' }}
    >
      <style>{`
        @keyframes vpmBackdropIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes vpmSheetIn {
          from { opacity: 0; transform: translateY(24px) scale(.96) }
          to { opacity: 1; transform: translateY(0) scale(1) }
        }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        className="w-full max-w-[340px] rounded-[28px] border border-border-color bg-card-bg p-6 shadow-soft-xl flex flex-col items-center text-center relative"
        style={{ animation: 'vpmSheetIn 0.26s cubic-bezier(.2,.8,.25,1) both' }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิด"
          className="absolute top-4 right-4 rounded-full p-1.5 text-foreground/40 hover:bg-foreground/10 hover:text-foreground transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Status Icon */}
        <div className="mt-4 mb-4 flex items-center justify-center">
          {status === 'unrequested' && (
            <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Mic size={28} />
            </div>
          )}
          {status === 'denied' && (
            <div className="w-14 h-14 rounded-full bg-incorrect/10 border border-incorrect/20 flex items-center justify-center text-incorrect">
              <Lock size={28} />
            </div>
          )}
          {status === 'unsupported' && (
            <div className="w-14 h-14 rounded-full bg-warning/10 border border-warning/20 flex items-center justify-center text-warning">
              <ShieldAlert size={28} />
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-foreground mb-2">
          {status === 'unrequested' && 'เปิดใช้งานไมโครโฟน'}
          {status === 'denied' && 'สิทธิ์ไมโครโฟนถูกปิดกั้น'}
          {status === 'unsupported' && 'ไม่รองรับการใช้ไมค์'}
        </h3>

        {/* Content Description */}
        <div className="text-sm font-medium text-foreground/70 mb-6 leading-relaxed">
          {status === 'unrequested' && (
            <p>เพื่อเข้าถึงฟีเจอร์การตรวจการพูดและประเมินเสียงโดย AI กรุณากดปุ่มด้านล่างเพื่ออนุญาตให้เข้าใช้งานไมโครโฟน</p>
          )}
          {status === 'denied' && (
            <div className="text-left space-y-2.5">
              <p>คุณได้ปิดกั้น (Block) การใช้ไมค์บนเบราว์เซอร์นี้ กรุณาเปิดสิทธิ์การใช้งานดังนี้:</p>
              <ol className="list-decimal pl-5 space-y-1 text-xs">
                <li>กดที่ไอคอนแม่กุญแจ 🔒 ที่แถบที่อยู่ด้านบนสุดของเว็บเบราว์เซอร์</li>
                <li>เปลี่ยนตัวเลือก <strong>ไมโครโฟน (Microphone)</strong> ให้เป็น <strong>อนุญาต (Allow)</strong></li>
                <li>รีเฟรชหน้านี้และกดลองใหม่อีกครั้ง</li>
              </ol>
            </div>
          )}
          {status === 'unsupported' && (
            <div className="text-left space-y-2">
              <p>เบราว์เซอร์หรือสภาวะแวดล้อมปัจจุบันไม่รองรับการรับเสียงจากไมโครโฟน</p>
              <p className="text-xs text-foreground/50 border-t border-border-color/60 pt-2">
                *ระบบตรวจจับเสียงต้องการความปลอดภัยในการเชื่อมต่อ (ต้องใช้ HTTPS หรือ localhost ในการทำงาน)
              </p>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2 w-full">
          {status === 'unrequested' && (
            <button
              onClick={() => {
                onClose();
                onAllow();
              }}
              className="w-full py-3.5 rounded-2xl bg-primary hover:bg-primary-hover text-white dark:text-gray-900 font-bold text-sm active:scale-95 transition-transform cursor-pointer shadow-soft-sm"
            >
              เริ่มขอสิทธิ์ไมค์
            </button>
          )}
          {status === 'denied' && (
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3.5 rounded-2xl bg-primary hover:bg-primary-hover text-white dark:text-gray-900 font-bold text-sm active:scale-95 transition-transform flex items-center justify-center gap-2 cursor-pointer shadow-soft-sm"
            >
              <RotateCw size={16} />
              โหลดหน้าเว็บใหม่
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl bg-foreground/5 hover:bg-foreground/10 text-foreground/70 font-semibold text-sm transition-colors cursor-pointer"
          >
            {status === 'unrequested' || status === 'denied' ? 'ข้ามโหมดพูด' : 'เข้าใจแล้ว (ฝึกเขียนและจับคู่)'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
