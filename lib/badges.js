export const TIERS = [
  { min: 0,    max: 99,       label: 'Bronze',   className: 'bg-amber-700/20 text-amber-400 border border-amber-700/30' },
  { min: 100,  max: 299,      label: 'Silver',   className: 'bg-gray-400/20 text-gray-200 border border-gray-400/30' },
  { min: 300,  max: 599,      label: 'Gold',     className: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' },
  { min: 600,  max: 999,      label: 'Platinum', className: 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/30' },
  { min: 1000, max: Infinity, label: 'Elite',    className: 'bg-purple-500/20 text-purple-300 border border-purple-500/30' },
];

export function getTier(points) {
  const p = Number(points) || 0;
  return TIERS.find((t) => p >= t.min && p <= t.max) || TIERS[0];
}

export function nextTier(points) {
  const p = Number(points) || 0;
  const idx = TIERS.findIndex((t) => p >= t.min && p <= t.max);
  if (idx === -1 || idx === TIERS.length - 1) return null;
  return TIERS[idx + 1];
}

export const TENURES = [
  { minDays: 365, label: 'Veteran',   className: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' },
  { minDays: 180, label: 'Half Year', className: 'bg-teal-500/20 text-teal-300 border border-teal-500/30' },
  { minDays: 90,  label: 'Quarterly', className: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' },
  { minDays: 30,  label: '1 Month',   className: 'bg-sky-500/20 text-sky-300 border border-sky-500/30' },
  { minDays: 0,   label: 'New',       className: 'bg-gray-500/20 text-gray-300 border border-gray-500/30' },
];

export function getTenure(created_at) {
  if (!created_at) return TENURES[TENURES.length - 1];
  const days = Math.floor(
    (Date.now() - new Date(created_at).getTime()) / (24 * 3600 * 1000)
  );
  return TENURES.find((t) => days >= t.minDays) || TENURES[TENURES.length - 1];
}
