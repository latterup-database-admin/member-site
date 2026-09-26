import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.797 2.715v2.258h2.909c1.703-1.568 2.684-3.88 2.684-6.614Z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.468-.806 5.956-2.181l-2.91-2.258c-.805.54-1.835.859-3.046.859-2.344 0-4.328-1.584-5.037-3.71H.956v2.332A8.997 8.997 0 0 0 9 18Z"/>
      <path fill="#FBBC05" d="M3.963 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.281-1.71V4.958H.956A8.997 8.997 0 0 0 0 9c0 1.452.347 2.827.956 4.042l3.007-2.332Z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.442 1.346l2.581-2.581C13.464.893 11.427 0 9 0A8.997 8.997 0 0 0 .956 4.958L3.963 7.29C4.672 5.164 6.656 3.58 9 3.58Z"/>
    </svg>
  )
}

export default function LoginPage() {
  const { session, portalContext, loading, error, signInWithGoogle } = useAuth()

  if (!loading && session && portalContext?.linked) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="min-h-screen bg-stone-50 lg:grid lg:grid-cols-[1.05fr_.95fr]">
      <section className="flex min-h-[42vh] items-center bg-brand-navy px-6 py-12 text-white lg:min-h-screen lg:px-14 xl:px-20">
        <div className="mx-auto max-w-xl lg:mx-0">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-brand-gold">Latter UP</p>
          <h1 className="brand-title mt-4 text-4xl leading-tight sm:text-5xl xl:text-6xl">One place for your Latter UP family.</h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/80">
            Classes, registration, contributions, payments, announcements, and member resources—together in one secure portal.
          </p>
          <div className="mt-8 h-1 w-28 rounded-full bg-brand-sky" />
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-md rounded-2xl border border-brand-sand/45 bg-white p-7 shadow-sm sm:p-9">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-junior">Members Portal</p>
          <h2 className="brand-title mt-2 text-3xl text-brand-navy">Welcome back</h2>
          <p className="mt-2 leading-relaxed text-brand-taupe">Sign in with your Latter UP Google Workspace account.</p>

          {error && (
            <div className="mt-5 rounded-lg border border-brand-junior/35 bg-brand-junior/10 p-3 text-sm font-semibold text-brand-navy">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={loading}
            className="focus-ring mt-7 flex w-full items-center justify-center gap-3 rounded-lg border-2 border-brand-navy bg-white px-4 py-3 font-bold text-brand-navy transition hover:bg-brand-navy hover:text-white disabled:cursor-wait disabled:opacity-60"
          >
            <GoogleMark />
            Continue with Google
          </button>

          <p className="mt-6 text-center text-xs leading-relaxed text-brand-taupe/80">
            Portal access is limited to active Latter UP Workspace accounts linked to a member record.
          </p>
        </div>
      </section>
    </div>
  )
}
