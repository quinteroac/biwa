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
  | 'remove'
  | 'search'
  | 'filter'
  | 'more'
  | 'rename'
  | 'move'
  | 'duplicate'
  | 'file'
  | 'add'

interface StudioIconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: StudioIconName
  size?: number
}

const paths: Record<Exclude<StudioIconName, 'app-logo'>, ReactElement> = {
  settings: (
    <>
      <path d="M9.9 3.2h4.4l.45 2.7 2.25.95 2.25-1.55 2.2 3.8-2.55 1.15.05 2.65 2.4 1.25-2.2 3.85-2.1-1.35-2.35 1.25-.4 2.7H9.85l-.5-2.65-2.3-1.05-2.2 1.35-2.15-3.8 2.35-1.35-.05-2.55-2.3-1.25L4.8 5.45l2.25 1.4L9.4 5.8l.5-2.6Z" />
      <path d="M8.9 12.05a3.15 3.15 0 1 0 6.3 0 3.15 3.15 0 0 0-6.3 0Z" />
    </>
  ),
  project: (
    <>
      <path d="M4.3 5.2h10.5l4.9 5v9.2H4.3V5.2Z" />
      <path d="M14.8 5.2v5h4.9" />
    </>
  ),
  dropdown: <path d="m6.3 9.1 5.7 5.8 5.7-5.8" />,
  'new-project': (
    <>
      <path d="M5.2 3.8h9.1l4.3 4.5v11.9H5.2V3.8Z" />
      <path d="M14.3 3.8v4.7h4.3" />
      <path d="M9.4 15.1h6.3" />
      <path d="M12.55 12v6.25" />
    </>
  ),
  preview: (
    <>
      <path d="M3.2 12.15c2.35-3.8 5.25-5.7 8.7-5.7 3.55 0 6.52 1.9 8.9 5.7-2.38 3.55-5.35 5.35-8.9 5.35-3.45 0-6.35-1.8-8.7-5.35Z" />
      <path d="M9.2 12a2.85 2.85 0 1 0 5.7 0 2.85 2.85 0 0 0-5.7 0Z" />
      <path d="M12.05 10.55h.1" />
    </>
  ),
  build: (
    <>
      <path d="m12.1 2.8 7.8 4.3-.05 9.55-7.75 4.55-7.9-4.5V7.25l7.9-4.45Z" />
      <path d="m4.65 7.55 7.45 4.25 7.25-4.3" />
      <path d="m12.1 11.8-.1 8.6" />
      <path d="m8.25 5.45 7.45 4.25" />
    </>
  ),
  overview: (
    <>
      <path d="M7.2 4.3h9.6v2.6H7.2V4.3Z" />
      <path d="M5.5 6.9h13v13.2h-13V6.9Z" />
      <path d="M8.2 10h7.6" />
      <path d="M8.2 13.1h7.6" />
      <path d="M8.2 16.2h5.4" />
    </>
  ),
  story: (
    <>
      <path d="M3.4 5.4c3-.9 5.9-.5 8.6 1.3v13c-2.65-1.65-5.55-2.15-8.6-1.25V5.4Z" />
      <path d="M20.6 5.4c-3-.9-5.9-.5-8.6 1.3v13c2.65-1.65 5.55-2.15 8.6-1.25V5.4Z" />
      <path d="M6.1 8.85c1.25-.18 2.35.02 3.35.6" />
      <path d="M14.55 9.45c1-.58 2.1-.78 3.35-.6" />
      <path d="M6.1 12.2c1.22-.15 2.25.05 3.15.55" />
      <path d="M14.75 12.75c.9-.5 1.95-.7 3.15-.55" />
    </>
  ),
  characters: (
    <>
      <path d="M8.3 7.5c.35-2.55 1.85-3.85 3.85-3.85s3.45 1.3 3.75 3.85c.28 2.45-1.32 4.15-3.8 4.15-2.35 0-4.15-1.7-3.8-4.15Z" />
      <path d="M8.55 7.45c1.25-.9 2.05-1.9 2.35-3" />
      <path d="M11.3 4.5c1.05 1.35 2.55 2.15 4.45 2.45" />
      <path d="M7 20c.55-4.2 2.25-6.25 5.1-6.25s4.62 2.05 5.32 6.25" />
      <path d="M9.7 14.8v-1.65" />
      <path d="M14.45 14.85v-1.7" />
    </>
  ),
  scenes: (
    <>
      <path d="M4 8.3h16v10.9H4V8.3Z" />
      <path d="M4 8.3 5.65 4.4l3.05-.65L7.05 8.3" />
      <path d="M8.7 8.3 10.35 4l3.05-.35-1.65 4.65" />
      <path d="M13.4 8.3 15.05 4l3.05-.35-1.65 4.65" />
      <path d="M18.05 8.3 20 4.45" />
      <path d="M7.2 13.1h9.6" />
      <path d="M7.2 16h6.4" />
    </>
  ),
  assets: (
    <>
      <path d="M3.6 7.4h6.25l1.45 2h9.1v10.25H3.6V7.4Z" />
      <path d="M3.6 7.4 5 4.9h5.1l1.2 2.5" />
      <path d="M5.75 10.95h12.5" />
    </>
  ),
  plugins: (
    <>
      <path d="M9.35 3.4h5.45v3.75c1.85-.45 3.55.45 3.55 2.15 0 1.8-1.75 2.75-3.55 2.25v2.35h2.2c1.7 0 2.85 1.05 2.85 2.55 0 1.6-1.15 2.75-2.85 2.75h-2.2v1.4H9.35v-4.05H6.9c-1.55 0-2.7-1.05-2.7-2.55 0-1.58 1.15-2.65 2.7-2.65h2.45v-2.2H6.9c-1.55 0-2.7-1.05-2.7-2.55 0-1.58 1.15-2.65 2.7-2.65h2.45V3.4Z" />
    </>
  ),
  'run-doctor': (
    <>
      <path d="M12 3.4c2.55 0 4 1.35 4 3.95v5.2c0 2.65-1.45 4-4 4s-4-1.35-4-4v-5.2c0-2.6 1.45-3.95 4-3.95Z" />
      <path d="M7.85 7.9h8.3" />
      <path d="M10.1 2.1v2.2" />
      <path d="M13.9 2.1v2.2" />
      <path d="M12 16.55v4" />
      <path d="M8.8 20.55h6.4" />
    </>
  ),
  error: (
    <>
      <path d="M3.6 12.1c0-5.15 3.3-8.5 8.35-8.5 5.2 0 8.45 3.35 8.45 8.5 0 5.1-3.25 8.3-8.45 8.3-5.05 0-8.35-3.2-8.35-8.3Z" />
      <path d="m8.85 8.95 6.3 6.25" />
      <path d="m15.2 8.9-6.35 6.35" />
    </>
  ),
  warning: (
    <>
      <path d="m12.1 3.4 9.1 16.65H2.9L12.1 3.4Z" />
      <path d="M12 8.75v5.35" />
      <path d="M12 17.1h.1" />
    </>
  ),
  info: (
    <>
      <path d="M3.8 12c0-5 3.3-8.25 8.25-8.25 5.05 0 8.15 3.25 8.15 8.25s-3.1 8.25-8.15 8.25C7.1 20.25 3.8 17 3.8 12Z" />
      <path d="M12 10.5v6.25" />
      <path d="M12 7.2h.1" />
    </>
  ),
  remove: (
    <>
      <path d="M6.2 7.2h11.6" />
      <path d="M9.3 7.2V4.6h5.35v2.6" />
      <path d="m7.65 9.35.65 10.05h7.4l.7-10.05" />
      <path d="M10.65 11.8v5.05M13.35 11.8v5.05" />
    </>
  ),
  search: (
    <>
      <path d="M4.2 10.8a6.6 6.6 0 1 0 13.2 0 6.6 6.6 0 0 0-13.2 0Z" />
      <path d="m15.65 15.7 4.25 4.2" />
    </>
  ),
  filter: (
    <>
      <path d="M4.6 5.4h14.8l-5.7 6.55v5.1l-3.4 1.55v-6.65L4.6 5.4Z" />
    </>
  ),
  more: (
    <>
      <path d="M12 5.3h.1" />
      <path d="M12 12h.1" />
      <path d="M12 18.7h.1" />
    </>
  ),
  rename: (
    <>
      <path d="m5.4 16.9-.8 3.1 3.1-.85L18.45 8.4l-2.3-2.3L5.4 16.9Z" />
      <path d="m14.75 7.5 2.3 2.3" />
    </>
  ),
  move: (
    <>
      <path d="M4.2 7.2h6.1l1.8 2h7.7v9.6H4.2V7.2Z" />
      <path d="M13.1 14.1h6.4" />
      <path d="m16.8 11.4 2.9 2.7-2.9 2.8" />
    </>
  ),
  duplicate: (
    <>
      <path d="M8 8.4h10.8v11H8V8.4Z" />
      <path d="M5.2 15.6V5.2h10.5" />
    </>
  ),
  file: (
    <>
      <path d="M6 3.8h8.5l3.5 3.75V20.2H6V3.8Z" />
      <path d="M14.5 3.8v3.75H18" />
      <path d="M8.8 12.2h6.4" />
      <path d="M8.8 15.6h5.1" />
    </>
  ),
  add: (
    <>
      <path d="M12 4.7v14.6" />
      <path d="M4.7 12h14.6" />
    </>
  ),
}

export function StudioIcon({ name, size = 22, ...props }: StudioIconProps) {
  if (name === 'app-logo') {
    return (
      <svg aria-hidden="true" height={size} viewBox="0 0 40 40" width={size} {...props}>
        <rect fill="#1b1c19" height="34" rx="5" width="34" x="3" y="3" />
        <path d="M8.5 5.5c7.8-.65 14.8-.45 23 .25M5.8 9c-.45 7.2-.25 14.2.2 21.5M34.5 8.8c.45 7.4.3 14.2-.35 22M8.2 34.3c7.7.6 15.1.45 23.6-.15" fill="none" stroke="#F2EFE8" strokeLinecap="round" strokeWidth="1.1" />
        <text
          fill="#F2EFE8"
          fontFamily="Plus Jakarta Sans, Inter, system-ui, sans-serif"
          fontSize="14.4"
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
      strokeWidth="1.75"
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      {paths[name]}
    </svg>
  )
}
