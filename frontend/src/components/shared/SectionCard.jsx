// Titled card wrapper for dashboard-style sections (Needs Attention,
// Recent Activity, Program Performance, ...) — an optional action link
// sits top-right, matching the "View all" pattern used across the app.
export default function SectionCard({ title, action, children }) {
  return <div className="card-k p-6">
    <div className="flex items-center justify-between gap-3"><h2 className="font-display text-lg font-bold text-kInk">{title}</h2>{action}</div>
    <div className="mt-4">{children}</div>
  </div>
}
