export default function RollupDetailsLoading() {
  return (
    <div className="p-6">
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-1/3 rounded bg-gray-200"></div>
        <div className="h-4 w-2/3 rounded bg-gray-200"></div>
        <div className="h-32 rounded bg-gray-100"></div>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded bg-gray-100"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
