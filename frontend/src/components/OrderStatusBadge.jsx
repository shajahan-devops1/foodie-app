import React from 'react';

const LABELS = {
  placed: 'Placed',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
};

const STYLES = {
  placed: 'bg-stone/10 text-stone',
  confirmed: 'bg-pine/10 text-pine',
  preparing: 'bg-marigold/15 text-marigold',
  out_for_delivery: 'bg-marigold/15 text-marigold',
  delivered: 'bg-pine/10 text-pine',
  cancelled: 'bg-brick/10 text-brick'
};

export default function OrderStatusBadge({ status }) {
  return (
    <span className={`inline-block rounded-sm px-2.5 py-1 text-xs font-medium ${STYLES[status] || STYLES.placed}`}>
      {LABELS[status] || status}
    </span>
  );
}
