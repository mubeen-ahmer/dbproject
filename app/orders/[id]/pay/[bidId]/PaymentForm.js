'use client';

import { useActionState } from 'react';
import { confirmPayment } from './actions';

export default function PaymentForm({ orderId, bidId, amount }) {
  const [state, formAction, pending] = useActionState(confirmPayment, null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="order_id" value={orderId} />
      <input type="hidden" name="bid_id" value={bidId} />

      <div>
        <label className="block text-sm text-gray-400 mb-1">Card number</label>
        <input
          defaultValue="4242 4242 4242 4242"
          className="w-full bg-gray-800 border border-white/10 rounded px-3 py-2 font-mono"
          readOnly
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Expiry</label>
          <input
            defaultValue="12/30"
            className="w-full bg-gray-800 border border-white/10 rounded px-3 py-2 font-mono"
            readOnly
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">CVC</label>
          <input
            defaultValue="123"
            className="w-full bg-gray-800 border border-white/10 rounded px-3 py-2 font-mono"
            readOnly
          />
        </div>
      </div>

      <div className="text-xs text-gray-500">
        This is a simulated payment for demo purposes.
      </div>

      {state?.error && <div className="text-red-400 text-sm">{state.error}</div>}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 px-6 py-3 rounded font-semibold"
      >
        {pending ? 'Processing...' : `Pay $${amount.toFixed(2)} (Escrow)`}
      </button>
    </form>
  );
}
