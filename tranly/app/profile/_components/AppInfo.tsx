import { version } from "@/package.json";

export default function AppInfo() {
  return (
    <div className="text-center py-6">
      <p className="text-sm font-bold text-text-secondary">
        Tarnly
      </p>
      <p className="text-xs text-text-secondary mt-0.5">
        v{version}
      </p>
    </div>
  );
}
