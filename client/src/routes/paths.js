export const routes = {
  landing: '/',
  login: '/login',
  viewer: (token = ':token') => `/vault/${token}`,
  adminRoot: '/dv-control',
  dashboard: '/dv-control',
  collections: '/dv-control/collections',
  collection: (id = ':id') => `/dv-control/collections/${id}`,
  qrcodes: '/dv-control/qrcodes',
  qrcode: (id = ':id') => `/dv-control/qrcodes/${id}`,
  recycleBin: '/dv-control/recycle-bin',
  settings: '/dv-control/settings'
};
