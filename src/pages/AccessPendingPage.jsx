import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function AccessPendingPage() {
  const { user, error, signOut } = useAuth()
  return (
    <div className="min-h-screen grid place-items-center bg-stone-50 px-6 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-brand-sand/50 bg-white p-8 shadow-sm">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-junior">Portal access</p>
        <h1 className="brand-title mt-2 text-3xl text-brand-navy">We couldn't link this account yet.</h1>
        <p className="mt-4 leading-relaxed text-brand-taupe">
          {error || 'Your Google sign-in succeeded, but this account is not currently linked to an active Latter UP member record.'}
        </p>
        {user?.email && <p className="mt-4 rounded-lg bg-brand-sand/15 p-3 text-sm font-bold text-brand-navy">Signed in as {user.email}</p>}
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={signOut} className="focus-ring rounded-lg bg-brand-navy px-4 py-2.5 font-bold text-white hover:bg-brand-navy/90">Use another account</button>
          <Link to="/login" className="focus-ring rounded-lg border border-brand-sand px-4 py-2.5 font-bold text-brand-navy hover:bg-brand-sky/15">Back to sign in</Link>
        </div>
      </div>
    </div>
  )
}
