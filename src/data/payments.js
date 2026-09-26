import { supabase } from '../lib/supabase'

const DEV_PREVIEW =
  import.meta.env.DEV &&
  import.meta.env.VITE_DEV_PREVIEW === 'true'

const previewData = {
  balance_due: 185,

  charges: [
    {
      id: 'preview-dues',
      type: 'membership_dues',
      description: 'Annual Latter UP Membership Dues',
      amount: 100,
      status: 'paid',
      paid_amount: 100,
      refunded_amount: 0,
      balance_due: 0,
      student_name: null,
      course_title: null,
      offering_period: null,
    },

    {
      id: 'preview-class-1',
      type: 'class_fee',
      description: 'Youth Chemistry',
      amount: 120,
      status: 'unpaid',
      paid_amount: 0,
      refunded_amount: 0,
      balance_due: 120,
      student_name: 'Sample Youth',
      course_title: 'Youth Chemistry',
      offering_period: 'fall',
    },

    {
      id: 'preview-class-2',
      type: 'class_fee',
      description: 'Junior Art',
      amount: 65,
      status: 'unpaid',
      paid_amount: 0,
      refunded_amount: 0,
      balance_due: 65,
      student_name: 'Sample Junior',
      course_title: 'Junior Art',
      offering_period: 'fall_session_1',
    },

    {
      id: 'preview-waived',
      type: 'class_fee',
      description: 'Junior Science',
      amount: 50,
      status: 'waived',
      paid_amount: 0,
      refunded_amount: 0,
      balance_due: 50,
      student_name: 'Sample Junior',
      course_title: 'Junior Science',
      offering_period: 'fall_session_1',
    },
  ],

  payments: [
    {
      id: 'preview-payment',
      provider: 'manual',
      amount: 100,
      status: 'succeeded',
      paid_at: new Date().toISOString(),
      notes: 'Annual membership dues',
    },
  ],
}

export async function getPaymentsData() {
  if (DEV_PREVIEW) {
    return previewData
  }

  const { data, error } =
    await supabase.rpc('get_my_payments')

  if (error) throw error

  return {
    balance_due: Number(
      data?.balance_due ?? 0
    ),

    charges: data?.charges ?? [],
    payments: data?.payments ?? [],
  }
}