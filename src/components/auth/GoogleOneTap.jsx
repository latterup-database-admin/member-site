import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

async function createNonce() {
  const raw = crypto.getRandomValues(new Uint8Array(32))

  const nonce = btoa(
    String.fromCharCode(...raw)
  )

  const encoded =
    new TextEncoder().encode(nonce)

  const hashBuffer =
    await crypto.subtle.digest(
      'SHA-256',
      encoded
    )

  const hashArray =
    Array.from(
      new Uint8Array(hashBuffer)
    )

  const hashedNonce =
    hashArray
      .map((byte) =>
        byte
          .toString(16)
          .padStart(2, '0')
      )
      .join('')

  return {
    nonce,
    hashedNonce,
  }
}

export default function GoogleOneTap() {
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    let intervalId

    async function startOneTap() {
      const {
        data: { session },
      } =
        await supabase.auth.getSession()

      // Existing Supabase session:
      // no need to show Google One Tap.
      if (session || cancelled) {
        return
      }

      if (
        !window.google?.accounts?.id
      ) {
        return
      }

      const {
        nonce,
        hashedNonce,
      } = await createNonce()

      if (cancelled) return

      window.google.accounts.id.initialize({
        client_id:
          import.meta.env
            .VITE_GOOGLE_CLIENT_ID,

        nonce: hashedNonce,

        auto_select: true,

        // Limits Google's account chooser
        // to your Workspace domain.
        hd: 'latterup.org',

        callback: async (response) => {
          try {
            const {
              error: signInError,
            } =
              await supabase.auth
                .signInWithIdToken({
                  provider: 'google',
                  token:
                    response.credential,
                  nonce,
                })

            if (signInError) {
              throw signInError
            }

            // This is our actual Latter UP
            // authorization gate.
            const {
              error: linkError,
            } =
              await supabase.rpc(
                'link_current_auth_user'
              )

            if (linkError) {
              await supabase.auth
                .signOut()

              throw linkError
            }

            navigate(
              '/dashboard',
              {
                replace: true,
              }
            )
          } catch (error) {
            console.error(
              'Google sign-in failed:',
              error
            )
          }
        },
      })

      window.google.accounts.id.prompt()
    }

    intervalId =
      window.setInterval(() => {
        if (
          window.google?.accounts?.id
        ) {
          window.clearInterval(
            intervalId
          )

          startOneTap()
        }
      }, 100)

    return () => {
      cancelled = true

      if (intervalId) {
        window.clearInterval(
          intervalId
        )
      }

      window.google?.accounts?.id
        ?.cancel()
    }
  }, [navigate])

  return null
}