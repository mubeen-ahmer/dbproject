'use client';

import { useActionState } from 'react';
import { submitPaper } from './actions';

export default function SubmitForm({ orderId }) {
  const [state, formAction, pending] = useActionState(submitPaper, null);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <input type="hidden" name="order_id" value={orderId} />

      <div>
        <label className="block text-sm text-gray-400 mb-1">
          Upload PDF <span className="text-gray-600">(max 10 MB)</span>
        </label>
        <input
          name="pdf_file"
          type="file"
          accept="application/pdf"
          required
          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-gray-200
                     file:mr-3 file:py-1 file:px-3 file:rounded file:border-0
                     file:bg-indigo-500 file:text-white file:text-sm file:cursor-pointer
                     hover:file:bg-indigo-400"
        />
        <p className="text-xs text-gray-500 mt-1">
          A watermarked preview is auto-generated and shown to the student until they accept.
        </p>
      </div>

      {state?.error && <div className="text-red-400 text-sm">{state.error}</div>}

      <button
        type="submit"
        disabled={pending}
        className="bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 px-6 py-2 rounded"
      >
        {pending ? 'Uploading & submitting...' : 'Submit Work'}
      </button>
    </form>
  );
}
