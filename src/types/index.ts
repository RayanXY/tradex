export interface TradexCard {
  id: string,
  tcg_card_id: string,
  name: string,
  set_name: string,
  image_url: string,
  price: number | null,
  quantity: number,
  active: boolean,
  type: 'sell' | 'want',
  condition: string,
  language: string,
  rarity?: string | null
}

export interface Seller {
  id: string,
  name: string,
  phone: string,
  slug: string
}

export interface SetItem {
  id: string,
  name: string,
  serie: string,
  release_date: string | null,
  ptcgo_code: string | null,
  logo_url?: string | null,
  total?: number | null,
  official_count?: number | null
}
