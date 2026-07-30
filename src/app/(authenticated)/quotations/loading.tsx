export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-6 w-40 bg-muted rounded" />
          <div className="h-4 w-24 bg-muted rounded mt-1" />
        </div>
        <div className="h-8 w-32 bg-muted rounded" />
      </div>
      <div className="flex gap-2">
        <div className="flex-1 h-9 bg-muted rounded" />
        <div className="h-9 w-36 bg-muted rounded" />
        <div className="h-9 w-36 bg-muted rounded" />
      </div>
      <div className="h-96 bg-muted rounded-lg" />
    </div>
  );
}
