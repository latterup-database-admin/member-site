export default function LoadingScreen() {
  return (
    <div className="min-h-screen grid place-items-center bg-stone-50 px-6">
      <div className="text-center">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-brand-sand border-t-brand-navy" />
        <p className="mt-4 font-semibold text-brand-taupe">Loading your member portal…</p>
      </div>
    </div>
  )
}
