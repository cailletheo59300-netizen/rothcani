export const STATUSES = [
  "arrivage",
  "tri",
  "preparation",
  "photos",
  "pret",
  "en_ligne",
  "vendu",
  "expedie",
  "ecarte",
] as const;

export type ItemStatus = (typeof STATUSES)[number];
export type CostMode = "egal" | "prorata" | "manuel";

export type Item = {
  id: string;
  ref_number: number;
  title: string;
  brand: string | null;
  category: string | null;
  size: string | null;
  condition: string | null;
  color: string | null;
  lot_id: string | null;
  manual_cost: number | null;
  listed_price: number | null;
  floor_price: number | null;
  status: ItemStatus;
  location_id: string | null;
  sales_account_id: string | null;
  photos: string[];
  notes: string | null;
  listed_at: string | null;
  status_changed_at: string;
  created_at: string;
};

export type Lot = {
  id: string;
  name: string;
  supplier_id: string | null;
  purchased_on: string;
  price: number;
  shipping_cost: number;
  cost_mode: CostMode;
  notes: string | null;
  created_at: string;
};

export type Sale = {
  id: string;
  item_id: string;
  sold_on: string;
  sale_price: number;
  packaging_fee: number;
  shipping_fee: number;
  platform_fee: number;
  sales_account_id: string | null;
  buyer: string | null;
  created_at: string;
};

export type Named = { id: string; name: string };
export type SalesAccount = Named & { platform: string; color: string };
export type Supplier = Named & { kind: string | null; contact: string | null; notes: string | null };

export type Profile = {
  id: string;
  display_name: string | null;
  default_packaging_fee: number;
  default_shipping_fee: number;
  default_platform_fee: number;
  dormant_days: number;
};
