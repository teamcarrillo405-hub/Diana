export type LandingMediaType = "image" | "video" | "cover"

export interface LandingMedia {
  mediaType: LandingMediaType
  src: string
  poster: string
  objectPosition: string
  alt: string
}

export interface HelpMode extends LandingMedia {
  id: string
  title: string
  outcome: string
}

export interface SceneBeat {
  id: "life" | "bring" | "move" | "night"
  start: number
  end: number
  caption: string
}

export interface ProductProof {
  src: string
  width: number
  height: number
  alt: string
}
