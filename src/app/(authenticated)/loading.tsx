export default function Loading() {
  return (
    <div className="w-full space-y-4 animate-pulse">
      <div className="h-6 w-48 bg-muted rounded" />
      <div className="h-4 w-64 bg-muted rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-muted rounded-lg" />
        ))}
      </div>
    </div>
  );
}
