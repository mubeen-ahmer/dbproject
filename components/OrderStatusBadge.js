import { ORDER_STATUS_STYLES } from '@/lib/constants';

export default function OrderStatusBadge({ status }) {
  const style = ORDER_STATUS_STYLES[status] || 'bg-gray-500/20 text-gray-300';
  return (
    <span className={`${style} px-2 py-1 rounded text-xs font-medium`}>
      {status}
    </span>
  );
}
