import type { ReactElement, SVGProps } from 'react'

export type StudioIconName =
  | 'app-logo'
  | 'settings'
  | 'project'
  | 'dropdown'
  | 'new-project'
  | 'preview'
  | 'build'
  | 'overview'
  | 'story'
  | 'characters'
  | 'scenes'
  | 'assets'
  | 'plugins'
  | 'run-doctor'
  | 'error'
  | 'warning'
  | 'info'

interface StudioIconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: StudioIconName
  size?: number
}

const paths: Record<Exclude<StudioIconName, 'app-logo'>, ReactElement> = {
  settings: (
    <>
      <path d="M12 15.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z" />
      <path d="M19.4 13.5a7.8 7.8 0 0 0 .05-3l2-1.45-2-3.45-2.4 1a8 8 0 0 0-2.6-1.5L14.15 2h-4.3l-.3 3.1a8 8 0 0 0-2.6 1.5l-2.4-1-2 3.45 2 1.45a7.8 7.8 0 0 0 .05 3l-2.05 1.5 2 3.45 2.5-1.05a8 8 0 0 0 2.5 1.45l.3 3.15h4.3l.3-3.15a8 8 0 0 0 2.5-1.45l2.5 1.05 2-3.45-2.05-1.5Z" />
    </>
  ),
  project: <path d="M3.5 7.5h6l1.8 2H20.5v9.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-11.5Z" />,
  dropdown: <path d="m6 9 6 6 6-6" />,
  'new-project': (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  preview: <path d="M8 5.5v13l11-6.5-11-6.5Z" />,
  build: (
    <>
      <path d="m12 2.8 8 4.6v9.2l-8 4.6-8-4.6V7.4l8-4.6Z" />
      <path d="m4.5 7.7 7.5 4.4 7.5-4.4" />
      <path d="M12 12.1v8.4" />
    </>
  ),
  overview: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1.4" />
      <rect x="14" y="4" width="6" height="6" rx="1.4" />
      <rect x="4" y="14" width="6" height="6" rx="1.4" />
      <rect x="14" y="14" width="6" height="6" rx="1.4" />
    </>
  ),
  story: (
    <>
      <path d="M4 5.5c2.9-.8 5.5-.35 8 1.35v13c-2.5-1.7-5.1-2.15-8-1.35v-13Z" />
      <path d="M20 5.5c-2.9-.8-5.5-.35-8 1.35v13c2.5-1.7 5.1-2.15 8-1.35v-13Z" />
    </>
  ),
  characters: (
    <>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M3.8 19c.65-3.4 2.4-5.1 5.2-5.1s4.55 1.7 5.2 5.1" />
      <path d="M14.4 14.5c2.8.1 4.65 1.55 5.8 4.5" />
    </>
  ),
  scenes: (
    <>
      <path d="M5 8.5h14v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-10Z" />
      <path d="M5 8.5 7.2 4l3.2 4.5L12.7 4l3.2 4.5L18.2 4 19 8.5" />
      <path d="M9 13h6" />
    </>
  ),
  assets: <path d="M3.5 7.5h6l1.8 2H20.5v9.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-11.5Z" />,
  plugins: (
    <>
      <path d="M9 3h6v4h2.5a2.5 2.5 0 0 1 0 5H15v2h2.5a2.5 2.5 0 0 1 0 5H15v2H9v-4H6.5a2.5 2.5 0 0 1 0-5H9v-2H6.5a2.5 2.5 0 0 1 0-5H9V3Z" />
    </>
  ),
  'run-doctor': (
    <>
      <path d="M8 3v5.5a4 4 0 0 0 8 0V3" />
      <path d="M6 3h4" />
      <path d="M14 3h4" />
      <path d="M12 12.5v2.25A4.25 4.25 0 0 0 16.25 19H17" />
      <circle cx="19" cy="19" r="2" />
    </>
  ),
  error: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6" />
      <path d="m15 9-6 6" />
    </>
  ),
  warning: (
    <>
      <path d="m12 3 10 18H2L12 3Z" />
      <path d="M12 9v5" />
      <path d="M12 17.5h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6" />
      <path d="M12 7h.01" />
    </>
  ),
}

export function StudioIcon({ name, size = 22, ...props }: StudioIconProps) {
  if (name === 'app-logo') {
    return (
      <svg aria-hidden="true" height={size} viewBox="0 0 40 40" width={size} {...props}>
        <circle cx="20" cy="20" fill="#ffffff" r="20" />
        <text
          fill="#000"
          fontFamily="Inter, system-ui, sans-serif"
          fontSize="12"
          fontWeight="800"
          textAnchor="middle"
          x="20"
          y="24"
        >
          VN
        </text>
      </svg>
    )
  }

  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      {paths[name]}
    </svg>
  )
}
