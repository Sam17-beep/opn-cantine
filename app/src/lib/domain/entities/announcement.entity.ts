/** @deprecated Single-ticket shape stored by older events; read as one option. */
export interface AnnouncementProduct {
  name: string;
  price: number;
}

/** One purchasable ticket tier of an event (e.g. "Adulte", "Enfant"). */
export interface TicketOption {
  id: string;
  name: string;
  price: number;
  description?: string | null;
}

export interface Announcement {
  id?: string;
  title: string;
  description: string;
  bannerStart?: string | null;
  bannerEnd?: string | null;
  salesStart?: string | null;
  salesEnd?: string | null;
  /** Ticket tiers on sale; empty when the event sells nothing. */
  options: TicketOption[];
  /** Max tickets one employee may buy for this event, all options combined. */
  maxPerEmployee?: number | null;
  /** @deprecated Legacy single product, folded into `options` on read. */
  product?: AnnouncementProduct | null;
  createdAt?: Date;
  updatedAt?: Date;
}
