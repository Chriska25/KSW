export type VideoProvider = 'youtube' | 'vimeo' | 'file';

export interface ResolvedVideoSource {
  provider: VideoProvider;
  embedUrl: string;
  thumbnailUrl?: string;
  videoId?: string;
}

function youtubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function vimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match?.[1] ?? null;
}

export function resolveVideoSource(url: string): ResolvedVideoSource | null {
  const clean = url.trim();
  if (!clean) return null;

  const yt = youtubeId(clean);
  if (yt) {
    return {
      provider: 'youtube',
      videoId: yt,
      embedUrl: `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0&modestbranding=1`,
      thumbnailUrl: `https://img.youtube.com/vi/${yt}/maxresdefault.jpg`,
    };
  }

  const vm = vimeoId(clean);
  if (vm) {
    return {
      provider: 'vimeo',
      videoId: vm,
      embedUrl: `https://player.vimeo.com/video/${vm}?autoplay=1&title=0&byline=0`,
      thumbnailUrl: undefined,
    };
  }

  if (/\.(mp4|webm|ogg)(\?|$)/i.test(clean) || clean.startsWith('/uploads/')) {
    return {
      provider: 'file',
      embedUrl: clean,
    };
  }

  if (/^https?:\/\//i.test(clean)) {
    return {
      provider: 'file',
      embedUrl: clean,
    };
  }

  return null;
}

export function resolveVideoThumbnail(videoUrl: string, customThumbnail?: string): string {
  if (customThumbnail?.trim()) return customThumbnail.trim();
  const resolved = resolveVideoSource(videoUrl);
  if (resolved?.thumbnailUrl) return resolved.thumbnailUrl;
  return 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=1200&auto=format&fit=crop';
}
