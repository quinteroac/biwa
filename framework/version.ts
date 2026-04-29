export const VN_FRAMEWORK_VERSION = '0.1.0'

export const VN_FRAMEWORK_PACKAGE_ENTRYPOINTS = {
  core: '@biwa/core',
  engine: '@biwa/core/engine',
  react: '@biwa/core/react',
  plugins: '@biwa/plugins',
  manager: '@biwa/manager',
} as const

export const VN_FRAMEWORK_PEER_DEPENDENCIES = {
  inkjs: '^2.3.0',
  react: '^19.2.5',
  'react-dom': '^19.2.5',
} as const
