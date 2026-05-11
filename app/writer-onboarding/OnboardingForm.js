'use client';
import { useActionState, useState } from 'react';
import { submitApplication } from './actions';

export default function OnboardingForm({ subjects, services }) {
  const [state, formAction, isPending] = useActionState(submitApplication, null);
  const [selectedSubjects, setSelectedSubjects] = useState(new Set());
  const [selectedServices, setSelectedServices] = useState(new Set());

  const toggle = (set, setter, id) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    setter(next);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <form action={formAction} className="max-w-3xl mx-auto flex flex-col gap-6">
        <h1 className="text-3xl font-bold">Writer Application</h1>
        <p className="text-gray-400">Tell us about yourself. Once submitted, an admin will review your application.</p>

        <div>
          <label className="block text-sm font-medium mb-2">Qualification</label>
          <input name="qualification" type="text" required placeholder="e.g. MSc in English Literature"
            className="w-full rounded-md bg-white/5 px-3 py-2 outline outline-white/10 focus:outline-indigo-500"/>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Bio</label>
          <textarea name="bio" required rows={4} placeholder="Brief introduction and experience..."
            className="w-full rounded-md bg-white/5 px-3 py-2 outline outline-white/10 focus:outline-indigo-500"/>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Subjects ({selectedSubjects.size} selected)
          </label>
          <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto p-2 bg-white/5 rounded-md">
            {subjects.map(s => (
              <button key={s.uuid} type="button"
                onClick={() => toggle(selectedSubjects, setSelectedSubjects, s.uuid)}
                className={`px-3 py-1 rounded-full text-sm transition ${
                  selectedSubjects.has(s.uuid)
                    ? 'bg-indigo-500 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}>
                {s.name}
              </button>
            ))}
          </div>
          <input type="hidden" name="subjects" value={[...selectedSubjects].join(',')} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Services ({selectedServices.size} selected)
          </label>
          <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto p-2 bg-white/5 rounded-md">
            {services.map(s => (
              <button key={s.uuid} type="button"
                onClick={() => toggle(selectedServices, setSelectedServices, s.uuid)}
                className={`px-3 py-1 rounded-full text-sm transition ${
                  selectedServices.has(s.uuid)
                    ? 'bg-indigo-500 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}>
                {s.name}
              </button>
            ))}
          </div>
          <input type="hidden" name="services" value={[...selectedServices].join(',')} />
        </div>

        {state?.error && <div className="text-red-500 text-sm">{state.error}</div>}

        <button type="submit" disabled={isPending || selectedSubjects.size === 0 || selectedServices.size === 0}
          className="w-full rounded-md bg-indigo-500 py-3 font-semibold hover:bg-indigo-400 disabled:opacity-50">
          {isPending ? 'Submitting...' : 'Submit Application'}
        </button>
      </form>
    </div>
  );
}
