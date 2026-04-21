'use client';

import { useActionState } from 'react';
import { submitPaper } from './actions';

export default function SubmitForm({ orderId }) {
  const [state, formAction, pending] = useActionState(submitPaper, null);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <input type="hidden" name="order_id" value={orderId} />

      <div>
        <label className="block text-sm text-gray-400 mb-1">Original file path</label>
        <input
          name="file_path"
          required
          maxLength={500}
          defaultValue={`/stub/order-${orderId.slice(0, 8)}/original.pdf`}
          className="w-full bg-gray-800 border border-white/10 rounded px-3 py-2 font-mono text-sm"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Watermarked file path</label>
        <input
          name="watermarked_file_path"
          required
          maxLength={500}
          defaultValue={`/stub/order-${orderId.slice(0, 8)}/watermarked.pdf`}
          className="w-full bg-gray-800 border border-white/10 rounded px-3 py-2 font-mono text-sm"
        />
        <div className="text-xs text-gray-500 mt-1">
          Student sees this version until they accept and pay.
        </div>
      </div>

      {state?.error && <div className="text-red-400 text-sm">{state.error}</div>}

      <button
        type="submit"
        disabled={pending}
        className="bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 px-6 py-2 rounded"
      >
        {pending ? 'Submitting...' : 'Submit Work'}
      </button>
    </form>
  );
}
