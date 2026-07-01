'use client';

interface AdSlotProps {
  isPremium?: boolean;
}

/**
 * Free-tier ad placeholder.
 *
 * Premium users see nothing. Free users see a styled placeholder.
 * To go live, replace the placeholder <div> with the AdSense unit, e.g.:
 *   <ins className="adsbygoogle" style={{ display: 'block' }}
 *        data-ad-client="ca-pub-XXXX" data-ad-slot="YYYY"
 *        data-ad-format="auto" data-full-width-responsive="true" />
 * and trigger `(window.adsbygoogle = window.adsbygoogle || []).push({})` on mount.
 */
export default function AdSlot({ isPremium = false }: AdSlotProps) {
  if (isPremium) return null;

  return (
    <div className="w-full rounded-xl border border-dashed border-border-color bg-card-bg py-8 text-center text-xs text-foreground/50">
      [โฆษณา]
    </div>
  );
}

