/** Three staggered bouncing dots used in the feed's loading states. */
export default function LoadingDots() {
  return (
    <div className="flex items-center gap-1.5">
      <span className="loading-dot h-2 w-2 rounded-full bg-accent-blue" style={{ animationDelay: "0ms" }} />
      <span className="loading-dot h-2 w-2 rounded-full bg-accent-blue" style={{ animationDelay: "200ms" }} />
      <span className="loading-dot h-2 w-2 rounded-full bg-accent-blue" style={{ animationDelay: "400ms" }} />
    </div>
  );
}
