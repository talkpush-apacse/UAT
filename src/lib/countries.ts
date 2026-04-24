export interface Country {
  code: string // ISO 3166-1 alpha-2, uppercase
  name: string
  dialCode: string // without leading +
  flag: string // emoji
}

export const COUNTRIES: Country[] = [
  { code: 'PH', name: 'Philippines', dialCode: '63', flag: '🇵🇭' },
  { code: 'IN', name: 'India', dialCode: '91', flag: '🇮🇳' },
  { code: 'US', name: 'United States', dialCode: '1', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', dialCode: '44', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', dialCode: '1', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', dialCode: '61', flag: '🇦🇺' },
  { code: 'NZ', name: 'New Zealand', dialCode: '64', flag: '🇳🇿' },
  { code: 'SG', name: 'Singapore', dialCode: '65', flag: '🇸🇬' },
  { code: 'MY', name: 'Malaysia', dialCode: '60', flag: '🇲🇾' },
  { code: 'ID', name: 'Indonesia', dialCode: '62', flag: '🇮🇩' },
  { code: 'TH', name: 'Thailand', dialCode: '66', flag: '🇹🇭' },
  { code: 'VN', name: 'Vietnam', dialCode: '84', flag: '🇻🇳' },
  { code: 'HK', name: 'Hong Kong', dialCode: '852', flag: '🇭🇰' },
  { code: 'TW', name: 'Taiwan', dialCode: '886', flag: '🇹🇼' },
  { code: 'JP', name: 'Japan', dialCode: '81', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', dialCode: '82', flag: '🇰🇷' },
  { code: 'CN', name: 'China', dialCode: '86', flag: '🇨🇳' },
  { code: 'PK', name: 'Pakistan', dialCode: '92', flag: '🇵🇰' },
  { code: 'BD', name: 'Bangladesh', dialCode: '880', flag: '🇧🇩' },
  { code: 'LK', name: 'Sri Lanka', dialCode: '94', flag: '🇱🇰' },
  { code: 'NP', name: 'Nepal', dialCode: '977', flag: '🇳🇵' },
  { code: 'AE', name: 'United Arab Emirates', dialCode: '971', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '966', flag: '🇸🇦' },
  { code: 'QA', name: 'Qatar', dialCode: '974', flag: '🇶🇦' },
  { code: 'KW', name: 'Kuwait', dialCode: '965', flag: '🇰🇼' },
  { code: 'BH', name: 'Bahrain', dialCode: '973', flag: '🇧🇭' },
  { code: 'OM', name: 'Oman', dialCode: '968', flag: '🇴🇲' },
  { code: 'IL', name: 'Israel', dialCode: '972', flag: '🇮🇱' },
  { code: 'TR', name: 'Turkey', dialCode: '90', flag: '🇹🇷' },
  { code: 'EG', name: 'Egypt', dialCode: '20', flag: '🇪🇬' },
  { code: 'ZA', name: 'South Africa', dialCode: '27', flag: '🇿🇦' },
  { code: 'NG', name: 'Nigeria', dialCode: '234', flag: '🇳🇬' },
  { code: 'KE', name: 'Kenya', dialCode: '254', flag: '🇰🇪' },
  { code: 'GH', name: 'Ghana', dialCode: '233', flag: '🇬🇭' },
  { code: 'MX', name: 'Mexico', dialCode: '52', flag: '🇲🇽' },
  { code: 'BR', name: 'Brazil', dialCode: '55', flag: '🇧🇷' },
  { code: 'AR', name: 'Argentina', dialCode: '54', flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', dialCode: '56', flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia', dialCode: '57', flag: '🇨🇴' },
  { code: 'PE', name: 'Peru', dialCode: '51', flag: '🇵🇪' },
  { code: 'DO', name: 'Dominican Republic', dialCode: '1', flag: '🇩🇴' },
  { code: 'JM', name: 'Jamaica', dialCode: '1', flag: '🇯🇲' },
  { code: 'IE', name: 'Ireland', dialCode: '353', flag: '🇮🇪' },
  { code: 'DE', name: 'Germany', dialCode: '49', flag: '🇩🇪' },
  { code: 'FR', name: 'France', dialCode: '33', flag: '🇫🇷' },
  { code: 'ES', name: 'Spain', dialCode: '34', flag: '🇪🇸' },
  { code: 'IT', name: 'Italy', dialCode: '39', flag: '🇮🇹' },
  { code: 'NL', name: 'Netherlands', dialCode: '31', flag: '🇳🇱' },
  { code: 'PL', name: 'Poland', dialCode: '48', flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal', dialCode: '351', flag: '🇵🇹' },
]

export const DEFAULT_COUNTRY_CODE = 'PH'

export function getCountryByCode(code: string | null | undefined): Country {
  if (!code) return COUNTRIES[0]
  const match = COUNTRIES.find((c) => c.code === code.toUpperCase())
  return match ?? COUNTRIES[0]
}
