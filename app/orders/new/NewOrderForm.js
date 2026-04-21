'use client';

import { useActionState, useState } from 'react';
import { ACADEMIC_LEVELS, CITATION_STYLES } from '@/lib/constants';
import { createOrder } from './actions';

export default function NewOrderForm({ subjects, services }) {
  const [state, formAction, pending] = useActionState(createOrder, null);
  const [serviceId, setServiceId] = useState('');
  const [pages, setPages] = useState(1);

  const selectedService = services.find((s) => s.uuid === serviceId);
  const estimatedPrice = selectedService
    ? Number(selectedService.price_of_first_page) +
      Number(selectedService.price_of_additional_page) * Math.max(0, pages - 1)
    : 0;

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-1">Title</label>
        <input
          name="title"
          required
          maxLength={200}
          className="w-full bg-gray-800 border border-white/10 rounded px-3 py-2"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Subject</label>
          <select
            name="subject_id"
            required
            defaultValue=""
            className="w-full bg-gray-800 border border-white/10 rounded px-3 py-2"
          >
            <option value="" disabled>Select subject...</option>
            {subjects.map((s) => (
              <option key={s.uuid} value={s.uuid}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Service</label>
          <select
            name="service_id"
            required
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="w-full bg-gray-800 border border-white/10 rounded px-3 py-2"
          >
            <option value="" disabled>Select service...</option>
            {services.map((s) => (
              <option key={s.uuid} value={s.uuid}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Pages</label>
          <input
            name="pages"
            type="number"
            min={1}
            required
            value={pages}
            onChange={(e) => setPages(Number(e.target.value))}
            className="w-full bg-gray-800 border border-white/10 rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Academic Level</label>
          <select
            name="academic_level"
            required
            defaultValue=""
            className="w-full bg-gray-800 border border-white/10 rounded px-3 py-2"
          >
            <option value="" disabled>Select...</option>
            {ACADEMIC_LEVELS.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Citation Style</label>
          <select
            name="citation_style"
            defaultValue="NONE"
            className="w-full bg-gray-800 border border-white/10 rounded px-3 py-2"
          >
            {CITATION_STYLES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Deadline</label>
        <input
          name="deadline_offered"
          type="datetime-local"
          required
          className="w-full bg-gray-800 border border-white/10 rounded px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Additional Info</label>
        <textarea
          name="additional_info"
          rows={4}
          className="w-full bg-gray-800 border border-white/10 rounded px-3 py-2"
          placeholder="Any additional requirements, formatting notes, etc."
        />
      </div>

      {selectedService && (
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded p-3 text-sm">
          Estimated minimum price: <span className="font-semibold">${estimatedPrice.toFixed(2)}</span>
          <div className="text-xs text-gray-400 mt-1">
            (${Number(selectedService.price_of_first_page).toFixed(2)} first page + $
            {Number(selectedService.price_of_additional_page).toFixed(2)}/additional page)
          </div>
        </div>
      )}

      {state?.error && <div className="text-red-400 text-sm">{state.error}</div>}

      <button
        type="submit"
        disabled={pending}
        className="bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 px-6 py-2 rounded"
      >
        {pending ? 'Creating...' : 'Create Order'}
      </button>
    </form>
  );
}
