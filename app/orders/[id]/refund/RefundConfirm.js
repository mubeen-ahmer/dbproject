'use client';

import { useActionState } from 'react';
import { requestRefund } from './actions';

export default function RefundConfirm({ orderId }) {
  const [state, formAction, pending] = useActionState(requestRefund, null);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="order_id" value={orderId} />

      {state?.error && <div className="text-red-400 text-sm">{state.error}</div>}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 px-6 py-3 rounded font-semibold"
      >
        {pending ? 'Processing refund...' : 'Confirm Refund'}
      </button>
    </form>
  );
}
