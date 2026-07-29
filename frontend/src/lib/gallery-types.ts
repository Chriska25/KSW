export interface PhotoItem {
  id: string;
  title: string;
  cat?: string;
  url: string;
  albumId?: string;
  albumName?: string;
  isFavorite?: boolean;
  isCover?: boolean;
  isPrivate?: boolean;
  exif?: {
    camera: string;
    lens: string;
    iso: number;
    aperture: string;
  };
}

export interface AlbumItem {
  id: string;
  name: string;
  photosCount: number;
  isPrivate?: boolean;
  password?: string;
}

export interface GalleryAdminItem {
  id: string;
  title: string;
  clientName: string;
  clientEmail?: string;
  category: string;
  isPrivate: boolean;
  accessKey: string;
  password?: string;
  expiresAt?: string;
  coverUrl: string;
  albums: AlbumItem[];
  photos: PhotoItem[];
}
