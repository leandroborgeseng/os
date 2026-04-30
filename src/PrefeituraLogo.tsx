import { clsx } from 'clsx'

const sizesPx = { sm: 40, md: 48, lg: 56, xl: 72 } as const

export type PrefeituraLogoSize = keyof typeof sizesPx

/** Marca institucional (SVG em /prefeitura-marca.svg) nas cores #0066B3 e #2DBE10. Substitua o arquivo em `public/` pelo brasao oficial quando houver. */
export function PrefeituraLogo({
  size = 'md',
  className,
  alt = 'Prefeitura Municipal',
}: {
  size?: PrefeituraLogoSize
  className?: string
  /** Use texto vazio se o titulo vizinho ja descrever a prefeitura. */
  alt?: string
}) {
  const s = sizesPx[size]

  return (
    <img
      src="/prefeitura-marca.svg"
      width={s}
      height={s}
      alt={alt}
      decoding="async"
      className={clsx('shrink-0 select-none rounded-2xl object-cover shadow-sm', className)}
    />
  )
}
