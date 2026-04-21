'use client';

import { useActionState } from 'react';
import { placeBid } from './actions';

export default function BidForm({ orderId, minimumPrice, studentDeadline }) {
  const [state, formAction, pending] = useActionState(placeBid, null);

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <input type="hidden" name="order_id" value={orderId} />

      <div className="bg-indigo-500/10 border border-indigo-500/30 rounded p-3 text-sm">
        Student minimum: <span className="font-semibold">${minimumPrice.toFixed(2)}</span>
        <div className="text-xs text-gray-400 mt-1">
          Student's deadline: {new Date(studentDeadline).toLocaleString()}
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Your offered price</label>
        <input
          name="offered_price"
          type="number"
          step="0.01"
          min={minimumPrice}
          defaultValue={minimumPrice.toFixed(2)}
          required
          className="w-full bg-gray-800 border border-white/10 rounded px-3 py-2"
        />
        <div className="text-xs text-gray-500 mt-1">
          Must be at least ${minimumPrice.toFixed(2)}
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Your delivery deadline</label>
        <input
          name="offered_deadline"
          type="datetime-local"
          required
          className="w-full bg-gray-800 border border-white/10 rounded px-3 py-2"
        />
      </div>

      {state?.error && <div className="text-red-400 text-sm">{state.error}</div>}

      <button
        type="submit"
        disabled={pending}
        className="bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 px-6 py-2 rounded"
      >
        {pending ? 'Placing bid...' : 'Place Bid'}
      </button>
    </form>
  );
}
