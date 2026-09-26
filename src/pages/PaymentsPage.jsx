import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  History,
  Loader2,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react'

import { getPaymentsData } from '../data/payments'


function formatMoney(value) {
  return new Intl.NumberFormat(
    'en-US',
    {
      style: 'currency',
      currency: 'USD',
    }
  ).format(Number(value ?? 0))
}


function formatDate(value) {
  if (!value) return ''

  return new Date(value).toLocaleDateString(
    undefined,
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }
  )
}


function formatPeriod(value) {
  const labels = {
    fall: 'Fall',
    spring: 'Spring',
    year_long: 'Year Long',
    fall_session_1: 'Fall Session 1',
    fall_session_2: 'Fall Session 2',
    spring_session_1: 'Spring Session 1',
    spring_session_2: 'Spring Session 2',
  }

  return labels[value] ?? value
}


function StatusBadge({ status }) {
  const normalized =
    String(status ?? '').toLowerCase()

  const styles = {
    paid:
      'bg-emerald-50 text-emerald-800',

    succeeded:
      'bg-emerald-50 text-emerald-800',

    waived:
      'bg-brand-sky/20 text-brand-navy',

    unpaid:
      'bg-amber-50 text-amber-800',

    partially_paid:
      'bg-brand-gold/15 text-amber-900',

    pending:
      'bg-brand-gold/15 text-amber-900',

    refunded:
      'bg-stone-100 text-brand-taupe',
  }

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider ${
        styles[normalized] ??
        'bg-stone-100 text-brand-taupe'
      }`}
    >
      {normalized.replaceAll('_', ' ')}
    </span>
  )
}


export default function PaymentsPage() {
  const [data, setData] = useState({
    balance_due: 0,
    charges: [],
    payments: [],
  })

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')


  useEffect(() => {
    let active = true

    async function load() {
      try {
        setLoading(true)
        setError('')

        const next =
          await getPaymentsData()

        if (active) {
          setData(next)
        }
      } catch (err) {
        if (active) {
          setError(
            err?.message ??
              'Unable to load payments.'
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      active = false
    }
  }, [])


  const openCharges = useMemo(
    () =>
      data.charges.filter(
        (charge) =>
          Number(
            charge.balance_due ?? 0
          ) > 0 &&
          ![
            'waived',
            'cancelled',
          ].includes(charge.status)
      ),
    [data.charges]
  )


  const settledCharges = useMemo(
    () =>
      data.charges.filter(
        (charge) =>
          Number(
            charge.balance_due ?? 0
          ) <= 0 ||
          [
            'paid',
            'waived',
            'refunded',
          ].includes(charge.status)
      ),
    [data.charges]
  )


  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2
          className="animate-spin text-brand-navy"
          size={28}
        />
      </div>
    )
  }


  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-junior">
          Family account
        </p>

        <h1 className="brand-title mt-1 text-3xl text-brand-navy">
          Payments
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-taupe">
          Review membership dues,
          class fees, outstanding
          balances, and payment history.
        </p>
      </header>


      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          {error}
        </div>
      )}


      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-brand-sand/45 bg-brand-navy p-5 text-white shadow-sm">
          <div className="flex items-center gap-2 text-brand-gold">
            <CircleDollarSign size={18} />

            <span className="text-xs font-extrabold uppercase tracking-wider">
              Balance due
            </span>
          </div>

          <p className="brand-title mt-3 text-4xl">
            {formatMoney(
              data.balance_due
            )}
          </p>

          <p className="mt-2 text-sm text-white/70">
            Across all outstanding
            household charges.
          </p>
        </div>


        <div className="rounded-2xl border border-brand-sand/45 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-brand-navy">
            <ReceiptText size={18} />

            <span className="text-xs font-extrabold uppercase tracking-wider">
              Open charges
            </span>
          </div>

          <p className="brand-title mt-3 text-3xl text-brand-navy">
            {openCharges.length}
          </p>

          <p className="mt-2 text-sm text-brand-taupe">
            Membership or class fees
            still needing payment.
          </p>
        </div>


        <div className="rounded-2xl border border-brand-sand/45 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-brand-navy">
            <ShieldCheck size={18} />

            <span className="text-xs font-extrabold uppercase tracking-wider">
              Payment method
            </span>
          </div>

          <p className="mt-3 font-extrabold text-brand-navy">
            Online payment coming next
          </p>

          <p className="mt-2 text-sm text-brand-taupe">
            Stripe checkout will be
            connected after we verify the
            account experience.
          </p>
        </div>
      </section>


      <section className="overflow-hidden rounded-2xl border border-brand-sand/45 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-sand/25 p-5 sm:p-6">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-sky">
              Outstanding
            </p>

            <h2 className="brand-title mt-1 text-2xl text-brand-navy">
              Charges to pay
            </h2>
          </div>

          {openCharges.length > 0 && (
            <button
              type="button"
              disabled
              title="Stripe checkout will be connected next."
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-brand-navy px-4 py-2.5 text-sm font-extrabold text-white opacity-60"
            >
              <CreditCard size={17} />
              Pay now
            </button>
          )}
        </div>


        {openCharges.length === 0 ? (
          <div className="p-6">
            <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <CheckCircle2
                className="shrink-0 text-emerald-700"
              />

              <div>
                <p className="font-extrabold text-emerald-900">
                  You're all caught up
                </p>

                <p className="mt-1 text-sm text-emerald-800">
                  There are no outstanding
                  household charges.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-brand-sand/25">
            {openCharges.map(
              (charge) => (
                <div
                  key={charge.id}
                  className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-extrabold text-brand-navy">
                        {charge.course_title ??
                          charge.description}
                      </p>

                      <StatusBadge
                        status={charge.status}
                      />
                    </div>

                    {charge.student_name && (
                      <p className="mt-1 text-sm font-semibold text-brand-taupe">
                        {charge.student_name}
                        {charge.offering_period &&
                          ` · ${formatPeriod(
                            charge.offering_period
                          )}`}
                      </p>
                    )}

                    {charge.type ===
                      'membership_dues' && (
                      <p className="mt-1 text-sm text-brand-taupe">
                        Annual household
                        membership
                      </p>
                    )}
                  </div>


                  <div className="text-left sm:text-right">
                    <p className="brand-title text-xl text-brand-navy">
                      {formatMoney(
                        charge.balance_due
                      )}
                    </p>

                    {Number(
                      charge.paid_amount ?? 0
                    ) > 0 && (
                      <p className="text-xs font-semibold text-brand-taupe">
                        {formatMoney(
                          charge.paid_amount
                        )}{' '}
                        paid
                      </p>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>


      <section className="grid gap-6 xl:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-brand-sand/45 bg-white shadow-sm">
          <div className="border-b border-brand-sand/25 p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2
                size={18}
                className="text-brand-sky"
              />

              <h2 className="brand-title text-xl text-brand-navy">
                Settled charges
              </h2>
            </div>
          </div>

          {settledCharges.length === 0 ? (
            <p className="p-5 text-sm text-brand-taupe">
              No settled charges yet.
            </p>
          ) : (
            <div className="divide-y divide-brand-sand/25">
              {settledCharges.map(
                (charge) => (
                  <div
                    key={charge.id}
                    className="flex items-center justify-between gap-4 p-4"
                  >
                    <div>
                      <p className="font-bold text-brand-navy">
                        {charge.course_title ??
                          charge.description}
                      </p>

                      {charge.student_name && (
                        <p className="text-xs font-semibold text-brand-taupe">
                          {charge.student_name}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <StatusBadge
                        status={charge.status}
                      />

                      <p className="mt-1 text-sm font-extrabold text-brand-navy">
                        {formatMoney(
                          charge.amount
                        )}
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>


        <div className="overflow-hidden rounded-2xl border border-brand-sand/45 bg-white shadow-sm">
          <div className="border-b border-brand-sand/25 p-5">
            <div className="flex items-center gap-2">
              <History
                size={18}
                className="text-brand-gold"
              />

              <h2 className="brand-title text-xl text-brand-navy">
                Payment history
              </h2>
            </div>
          </div>

          {data.payments.length === 0 ? (
            <p className="p-5 text-sm text-brand-taupe">
              No payments have been
              recorded yet.
            </p>
          ) : (
            <div className="divide-y divide-brand-sand/25">
              {data.payments.map(
                (payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between gap-4 p-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        {payment.status ===
                        'refunded' ? (
                          <RotateCcw
                            size={15}
                            className="text-brand-taupe"
                          />
                        ) : (
                          <Clock3
                            size={15}
                            className="text-brand-sky"
                          />
                        )}

                        <p className="font-bold text-brand-navy">
                          {payment.provider ===
                          'stripe'
                            ? 'Online payment'
                            : 'Payment'}
                        </p>
                      </div>

                      <p className="mt-1 text-xs font-semibold text-brand-taupe">
                        {formatDate(
                          payment.paid_at ??
                            payment.created_at
                        )}
                      </p>
                    </div>


                    <div className="text-right">
                      <p className="font-extrabold text-brand-navy">
                        {formatMoney(
                          payment.amount
                        )}
                      </p>

                      <StatusBadge
                        status={payment.status}
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}