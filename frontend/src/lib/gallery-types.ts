export interface PhotoItem {
  id: string;
  title: string;
  cat?: string;
  url: string;
  /** Fichier HD pleine résolution (téléchargement / lightbox). */
  hdUrl?: string;
  /** Original sans filigrane — sert à appliquer les paramètres admin à la livraison. */
  originalUrl?: string;
  /** Miniature légère pour grilles (/uploads/…_thumb.webp). */
  thumbUrl?: string;
  /** Filigrane déjà gravé dans le fichier local (évite double filigrane à la livraison). */
  watermarked?: boolean;
  albumId?: string;
  albumName?: string;
  isFavorite?: boolean;
  isCover?: boolean;
  isPrivate?: boolean;
  /** Date ISO — photo dans la corbeille si renseigné. */
  deletedAt?: string | null;
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
  /** Date ISO — album dans la corbeille si renseigné. */
  deletedAt?: string | null;
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
  /** Indique qu'un mot de passe est déjà enregistré côté serveur (sans exposer la valeur). */
  hasPassword?: boolean;
  expiresAt?: string;
  coverUrl: string;
  albums: AlbumItem[];
  photos: PhotoItem[];
  bookingId?: string;
  /** Nombre de photos (liste client sans médias). */
  photosCount?: number;
  /** Nombre d'albums (liste client sans médias). */
  albumsCount?: number;
  /** Date ISO — galerie dans la corbeille si renseigné. */
  deletedAt?: string | null;
}
