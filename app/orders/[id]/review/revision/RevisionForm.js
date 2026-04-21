'use client';

import { useActionState, useState } from 'react';
import { requestRevision } from './actions';

export default function RevisionForm({ orderId, submissionId }) {
  const [state, formAction, pending] = useActionState(requestRevision, null);
  const [changes, setChanges] = useState('');

  const tooShort = changes.length < 50;

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <input type="hidden" name="order_id" value={orderId} />
      <input type="hidden" name="submission_id" value={submissionId} />

      <div>
        <label className="block text-sm text-gray-400 mb-1">
          Changes requested
        </label>
        <textarea
          name="changes"
          rows={6}
          required
          value={changes}
          onChange={(e) => setChanges(e.target.value)}
          className="w-full bg-gray-800 border border-white/10 rounded px-3 py-2"
          placeholder="Be specific about what needs to change. Minimum 50 characters."
        />
        <div
          className={`text-xs mt-1 ${tooShort ? 'text-red-400' : 'text-gray-500'}`}
        >
          {changes.length} / 50 minimum
        </div>
      </div>

      {state?.error && <div className="text-red-400 text-sm">{state.error}</div>}

      <button
        type="submit"
        disabled={pending || tooShort}
        className="bg-orange-500 hover:bg-orange-400 disabled:opacity-50 px-6 py-2 rounded"
      >
        {pending ? 'Requesting...' : 'Request Revision'}
      </button>
    </form>
  );
}
