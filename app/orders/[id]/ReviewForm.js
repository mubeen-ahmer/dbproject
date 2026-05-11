'use client';

import { useActionState, useState } from 'react';
import { submitReview } from './review/actions';

export default function ReviewForm({ orderId, targetName }) {
  const [state, formAction, pending] = useActionState(submitReview, null);
  const [rating, setRating] = useState(5);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="order_id" value={orderId} />
      <input type="hidden" name="rating" value={rating} />

      <div>
        <label className="block text-sm text-gray-400 mb-2">
          Rate {targetName}
        </label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={`text-3xl transition ${
                n <= rating ? 'text-yellow-400' : 'text-gray-600'
              } hover:scale-110`}
              aria-label={`${n} stars`}
            >
              ★
            </button>
          ))}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {rating} star{rating !== 1 ? 's' : ''} · adds {rating * 10} points to {targetName}
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">
          Comment (optional)
        </label>
        <textarea
          name="text"
          rows={3}
          maxLength={1000}
          className="w-full bg-gray-800 border border-white/10 rounded px-3 py-2"
          placeholder="Share your experience..."
        />
      </div>

      {state?.error && <div className="text-red-400 text-sm">{state.error}</div>}

      <button
        type="submit"
        disabled={pending}
        className="bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 px-6 py-2 rounded"
      >
        {pending ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  );
}
