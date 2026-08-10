/** Construit l'URL de connexion avec redirect et mode admin cohérents. */
export function buildLoginUrl(options?: { redirect?: string | null; admin?: boolean }): string {
  const redirect = (options?.redirect || '').trim();
  const isAdmin = options?.admin ?? redirect.startsWith('/admin');
  const params = new URLSearchParams();
  if (redirect) params.set('redirect', redirect);
  if (isAdmin) params.set('admin', '1');
  const query = params.toString();
  return query ? `/login?${query}` : '/login';
}

export function isAdminLoginContext(searchParams: {
  get: (key: string) => string | null;
}): boolean {
  const redirect = searchParams.get('redirect');
  return searchParams.get('admin') === '1' || Boolean(redirect?.startsWith('/admin'));
}
