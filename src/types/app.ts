export type Locale = 'en-us' | 'zh-tw'

export type Platform = 'windows' | 'kubuntu'

export interface LocalizedText {
  'en-us': string
  'zh-tw': string
}

export interface AppEntry {
  id: string
  name: string
  url: string
  icon?: string
  tags?: string[]
  platforms: Platform[]
  description: LocalizedText
  category: LocalizedText
}
