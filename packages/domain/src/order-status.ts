/**
 * Cycle de vie d'une commande — miroir de l'enum order_status en DB.
 * Transitions valides : cdc §12.3 étendu.
 */

export const ORDER_STATUSES = [
  'pending',
  'accepted',
  'refused',
  'slot_confirmed',
  'driver_assigned',
  'driver_en_route',
  'arrived_nearby',
  'delivered',
  'cancelled',
  'incident',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending:         'Commande transmise',
  accepted:        'Commande acceptée',
  refused:         'Commande refusée',
  slot_confirmed:  'Créneau confirmé',
  driver_assigned: 'Livreur affecté',
  driver_en_route: 'Livreur en route',
  arrived_nearby:  'Arrivé à proximité',
  delivered:       'Livraison effectuée',
  cancelled:       'Commande annulée',
  incident:        'Incident signalé',
};

const TRANSITIONS: Record<OrderStatus, ReadonlyArray<OrderStatus>> = {
  pending:         ['accepted', 'refused', 'cancelled'],
  accepted:        ['slot_confirmed', 'cancelled', 'incident'],
  refused:         [],
  slot_confirmed:  ['driver_assigned', 'cancelled', 'incident'],
  driver_assigned: ['driver_en_route', 'cancelled', 'incident'],
  driver_en_route: ['arrived_nearby', 'incident'],
  arrived_nearby:  ['delivered', 'incident'],
  delivered:       [],
  cancelled:       [],
  incident:        ['cancelled', 'accepted'],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function nextStatuses(from: OrderStatus): ReadonlyArray<OrderStatus> {
  return TRANSITIONS[from];
}
