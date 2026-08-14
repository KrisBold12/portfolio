export type Marker = { value: number; label: string; color: string; caption?: string }

export type ReadoutRailProps = {
  title: string
  min: number
  max: number
  markers: Marker[]
  threshold?: { value: number; label: string }
  zones?: { left: string; right: string }
  unit?: string
}
