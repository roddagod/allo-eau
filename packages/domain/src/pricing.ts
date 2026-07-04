/**
 * Calcul de prix — miroir client de la logique DB.
 *
 * Le prix officiel vit en DB (table price_versions).
 * Cette fonction sert à afficher le total au consommateur avant soumission ;
 * le trigger `snapshot_order_price` en DB reste la source de vérité.
 * Aucune majoration (quartier, distance) : cdc §3.
 */

export type PriceTier = {
  volumeLiters: number;
  label: string;
  priceFcfa: number;
};

export function calculateOrderTotal(unitPriceFcfa: number, quantity: number): number {
  if (!Number.isInteger(unitPriceFcfa) || unitPriceFcfa < 0) {
    throw new Error(`unitPriceFcfa invalide : ${unitPriceFcfa}`);
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error(`quantity invalide : ${quantity}`);
  }
  return unitPriceFcfa * quantity;
}

const fcfaFormatter = new Intl.NumberFormat('fr-FR', {
  useGrouping: true,
  maximumFractionDigits: 0,
});

export function formatFcfa(amount: number): string {
  return `${fcfaFormatter.format(amount)} FCFA`;
}
