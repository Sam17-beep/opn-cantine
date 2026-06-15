export interface AnnouncementProduct {
  name: string;
  price: number;
}

export interface Announcement {
  id?: string;
  title: string;
  description: string;
  bannerStart?: string | null;
  bannerEnd?: string | null;
  salesStart?: string | null;
  salesEnd?: string | null;
  product?: AnnouncementProduct | null;
  createdAt?: Date;
  updatedAt?: Date;
}
