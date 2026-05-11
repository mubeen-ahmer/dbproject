import { getTier, getTenure } from '@/lib/badges';

export default function UserBadges({ points, created_at, size = 'sm' }) {
  const tier = getTier(points);
  const tenure = getTenure(created_at);
  const text = size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5';

  return (
    <span className="inline-flex gap-1 items-center">
      <span className={`${tier.className} ${text} rounded font-medium`}>
        {tier.label}
      </span>
      <span className={`${tenure.className} ${text} rounded font-medium`}>
        {tenure.label}
      </span>
    </span>
  );
}
