export const DEFAULT_ADMIN_PATH = '/upload';

export const adminNavigation = [
    { href: '/upload', label: 'Cargar datos' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/administracion', label: 'Administración' },
] as const;

export const isWorkspacePath = (path: string) => adminNavigation.some(({ href }) => path === href || path.startsWith(`${href}/`));
