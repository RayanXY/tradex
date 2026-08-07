export interface TradexCard {
  id: string,
  tcg_card_id: string,
  name: string,
  name_pt: string,
  set_name: string,
  image_url: string,
  price: number | null,
  quantity: number,
  active: boolean,
  type: 'sell' | 'want',
  condition: string,
  language: string,
  rarity?: string | null,
  variant: string,
  types?: string[] | null
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
  name_pt: string | null,
  serie: string,
  serie_id: string | null,
  release_date: string | null,
  ptcgo_code: string | null,
  logo_url: string | null,
  logo_url_pt: string | null,
  symbol_url: string | null,
  order_index: number | null,
  enabled: boolean,
  total: number | null,
  official_count: number | null,
}
