import { z } from 'zod';

/**
 * Schémas Zod partagés — validation entrées API et formulaires.
 * Correspondent aux tables/enums Supabase (cdc §11).
 */

// Enums miroirs
export const roleSchema = z.enum([
  'client',
  'company_owner',
  'company_operator',
  'call_center',
  'driver',
  'supervisor',
  'admin',
  'super_admin',
]);

export const paymentMethodSchema = z.enum([
  'cash',
  'airtel_money',
  'moov_money',
  'clickpay',
]);

export const volumeLitersSchema = z.union([
  z.literal(100),
  z.literal(200),
  z.literal(500),
  z.literal(1000),
]);

// Téléphone gabonais — permet séparateurs (espaces, tirets, points, parenthèses)
// La normalisation stricte se fait par `normalizeGabonPhone` côté server action.
export const phoneSchema = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s().-]/g, ''))
  .refine(
    (s) => /^(\+?241)?0?[67]\d{7}$/.test(s),
    'Numéro invalide (format Gabon)',
  );

// Inscription client — version simplifiée (v1, sans OTP)
export const clientSignUpSchema = z.object({
  firstName:     z.string().min(1, 'Prénom requis').max(80),
  lastName:      z.string().min(1, 'Nom requis').max(80),
  phone:         phoneSchema,
  email:         z.string().email('Email invalide'),
  password:      z.string().min(8, 'Au moins 8 caractères'),
  primaryZoneId: z.string().uuid('Sélectionnez un quartier'),
});
export type ClientSignUpInput = z.infer<typeof clientSignUpSchema>;

// Création de commande (client connecté)
export const createOrderSchema = z.object({
  zoneId:                  z.string().uuid(),
  address:                 z.string().min(1).max(500),
  deliveryLandmark:        z.string().max(500).optional(),
  deliveryPoint:           z
    .object({
      longitude: z.number().min(-180).max(180),
      latitude:  z.number().min(-90).max(90),
    })
    .optional(),
  volumeLiters:            volumeLitersSchema,
  quantity:                z.number().int().positive().max(50),
  paymentMethod:           paymentMethodSchema,
  preferredDeliveryDate:   z.string().date().optional(),
  preferredDeliveryTime:   z.string().time().optional(),
  clientInstructions:      z.string().max(500).optional(),
  onBehalfOfClientId:      z.string().uuid().optional(),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

// Point GPS (WGS84)
export const geoPointSchema = z.object({
  latitude:  z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type GeoPoint = z.infer<typeof geoPointSchema>;

// Création de commande — parcours guest (sans compte)
// Anonymisation : aucun nom/prénom, seul le numéro identifie le citoyen.
export const guestOrderDraftSchema = z.object({
  phone:                phoneSchema,
  zoneId:               z.string().uuid('Sélectionnez un quartier'),
  address:              z.string().min(1, 'Adresse requise').max(500),
  deliveryLandmark:     z.string().max(500).optional(),
  clientInstructions:   z.string().max(500).optional(),
  deliveryPoint:        geoPointSchema.optional(),
  volumeLiters:         volumeLitersSchema,
  quantity:             z.number().int().positive().max(50),
  paymentMethod:        paymentMethodSchema,
  preferredDeliveryDate:z.string().date().optional(),
  preferredDeliveryTime:z.string().time().optional(),
});
export type GuestOrderDraft = z.infer<typeof guestOrderDraftSchema>;

export const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Code à 6 chiffres');

// Mise à jour statut par livreur (cdc §6.2)
export const driverStatusUpdateSchema = z.object({
  orderId: z.string().uuid(),
  status:  z.enum([
    'driver_en_route',
    'arrived_nearby',
    'delivered',
    'incident',
  ]),
  incidentType:    z.string().max(80).optional(),
  incidentDetails: z.string().max(1000).optional(),
});
export type DriverStatusUpdateInput = z.infer<typeof driverStatusUpdateSchema>;

// Position GPS livreur (cdc §6.3)
export const driverPositionSchema = z.object({
  longitude:  z.number().min(-180).max(180),
  latitude:   z.number().min(-90).max(90),
  accuracyM:  z.number().nonnegative().optional(),
  source:     z.enum(['gps', 'simulated', 'manual']).default('gps'),
});
export type DriverPositionInput = z.infer<typeof driverPositionSchema>;

// Nouvelle version tarifaire (super admin uniquement)
export const priceVersionSchema = z.object({
  tierId:       z.string().uuid(),
  priceFcfa:    z.number().int().nonnegative(),
  validFrom:    z.string().datetime(),
  reason:       z.string().min(10, 'Motif requis (min 10 caractères)'),
  referenceDoc: z.string().url().optional(),
});
export type PriceVersionInput = z.infer<typeof priceVersionSchema>;
