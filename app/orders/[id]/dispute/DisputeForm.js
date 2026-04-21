'use client';

import { useActionState } from 'react';
import { raiseDispute } from './actions';

export default function DisputeForm({ orderId }) {
  const [state, action, pending] = useActionState(raiseDispute, null);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="order_id" value={orderId} />

      <div>
        <label className="block text-sm text-gray-400 mb-1">
          Describe the issue
        </label>
        <textarea
          name="reason"
          rows={5}
          required
          minLength={20}
          placeholder="Explain what went wrong and what resolution you are seeking..."
          className="w-full bg-white/5 border border-white/20 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
        />
        <p className="text-xs text-gray-500 mt-1">Minimum 20 characters</p>
      </div>

      {state?.error && (
        <p className="text-red-400 text-sm">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 px-6 py-2 rounded text-sm font-medium"
      >
        {pending ? 'Submitting...' : 'Raise Dispute'}
      </button>
    </form>
  );
}
