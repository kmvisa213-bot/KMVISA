export type CountryGroup =
  | "schengen"
  | "europe"
  | "north_america"
  | "middle_east"
  | "africa"
  | "asia"
  | "oceania"
  | "south_america";

export type CountryOption = {
  code: string; // ISO 3166-1 alpha-2
  nameAr: string;
  nameEn: string;
  group: CountryGroup;
};

export const COUNTRY_GROUP_LABELS: Record<CountryGroup, string> = {
  schengen: "منطقة شنغن",
  europe: "أوروبا (خارج شنغن)",
  north_america: "أمريكا الشمالية",
  middle_east: "الشرق الأوسط والخليج",
  africa: "أفريقيا",
  asia: "آسيا",
  oceania: "أوقيانوسيا",
  south_america: "أمريكا الجنوبية",
};

export const COUNTRIES: CountryOption[] = [
  // Schengen area
  { code: "AT", nameAr: "النمسا", nameEn: "Austria", group: "schengen" },
  { code: "BE", nameAr: "بلجيكا", nameEn: "Belgium", group: "schengen" },
  { code: "BG", nameAr: "بلغاريا", nameEn: "Bulgaria", group: "schengen" },
  { code: "HR", nameAr: "كرواتيا", nameEn: "Croatia", group: "schengen" },
  { code: "CZ", nameAr: "التشيك", nameEn: "Czechia", group: "schengen" },
  { code: "DK", nameAr: "الدنمارك", nameEn: "Denmark", group: "schengen" },
  { code: "EE", nameAr: "إستونيا", nameEn: "Estonia", group: "schengen" },
  { code: "FI", nameAr: "فنلندا", nameEn: "Finland", group: "schengen" },
  { code: "FR", nameAr: "فرنسا", nameEn: "France", group: "schengen" },
  { code: "DE", nameAr: "ألمانيا", nameEn: "Germany", group: "schengen" },
  { code: "GR", nameAr: "اليونان", nameEn: "Greece", group: "schengen" },
  { code: "HU", nameAr: "المجر", nameEn: "Hungary", group: "schengen" },
  { code: "IS", nameAr: "آيسلندا", nameEn: "Iceland", group: "schengen" },
  { code: "IT", nameAr: "إيطاليا", nameEn: "Italy", group: "schengen" },
  { code: "LV", nameAr: "لاتفيا", nameEn: "Latvia", group: "schengen" },
  { code: "LI", nameAr: "ليختنشتاين", nameEn: "Liechtenstein", group: "schengen" },
  { code: "LT", nameAr: "ليتوانيا", nameEn: "Lithuania", group: "schengen" },
  { code: "LU", nameAr: "لوكسمبورغ", nameEn: "Luxembourg", group: "schengen" },
  { code: "MT", nameAr: "مالطا", nameEn: "Malta", group: "schengen" },
  { code: "NL", nameAr: "هولندا", nameEn: "Netherlands", group: "schengen" },
  { code: "NO", nameAr: "النرويج", nameEn: "Norway", group: "schengen" },
  { code: "PL", nameAr: "بولندا", nameEn: "Poland", group: "schengen" },
  { code: "PT", nameAr: "البرتغال", nameEn: "Portugal", group: "schengen" },
  { code: "RO", nameAr: "رومانيا", nameEn: "Romania", group: "schengen" },
  { code: "SK", nameAr: "سلوفاكيا", nameEn: "Slovakia", group: "schengen" },
  { code: "SI", nameAr: "سلوفينيا", nameEn: "Slovenia", group: "schengen" },
  { code: "ES", nameAr: "إسبانيا", nameEn: "Spain", group: "schengen" },
  { code: "SE", nameAr: "السويد", nameEn: "Sweden", group: "schengen" },
  { code: "CH", nameAr: "سويسرا", nameEn: "Switzerland", group: "schengen" },

  // Europe outside Schengen
  { code: "GB", nameAr: "المملكة المتحدة", nameEn: "United Kingdom", group: "europe" },
  { code: "IE", nameAr: "أيرلندا", nameEn: "Ireland", group: "europe" },
  { code: "CY", nameAr: "قبرص", nameEn: "Cyprus", group: "europe" },
  { code: "AL", nameAr: "ألبانيا", nameEn: "Albania", group: "europe" },
  { code: "ME", nameAr: "الجبل الأسود", nameEn: "Montenegro", group: "europe" },
  { code: "RS", nameAr: "صربيا", nameEn: "Serbia", group: "europe" },
  { code: "RU", nameAr: "روسيا", nameEn: "Russia", group: "europe" },
  { code: "TR", nameAr: "تركيا", nameEn: "Turkey", group: "europe" },
  { code: "AZ", nameAr: "أذربيجان", nameEn: "Azerbaijan", group: "europe" },
  { code: "GE", nameAr: "جورجيا", nameEn: "Georgia", group: "europe" },
  { code: "AM", nameAr: "أرمينيا", nameEn: "Armenia", group: "europe" },

  // North America
  { code: "US", nameAr: "الولايات المتحدة", nameEn: "United States", group: "north_america" },
  { code: "CA", nameAr: "كندا", nameEn: "Canada", group: "north_america" },
  { code: "MX", nameAr: "المكسيك", nameEn: "Mexico", group: "north_america" },

  // Middle East and Gulf
  { code: "QA", nameAr: "قطر", nameEn: "Qatar", group: "middle_east" },
  { code: "AE", nameAr: "الإمارات", nameEn: "United Arab Emirates", group: "middle_east" },
  { code: "SA", nameAr: "السعودية", nameEn: "Saudi Arabia", group: "middle_east" },
  { code: "OM", nameAr: "عُمان", nameEn: "Oman", group: "middle_east" },
  { code: "BH", nameAr: "البحرين", nameEn: "Bahrain", group: "middle_east" },
  { code: "KW", nameAr: "الكويت", nameEn: "Kuwait", group: "middle_east" },
  { code: "JO", nameAr: "الأردن", nameEn: "Jordan", group: "middle_east" },
  { code: "LB", nameAr: "لبنان", nameEn: "Lebanon", group: "middle_east" },

  // Africa
  { code: "MA", nameAr: "المغرب", nameEn: "Morocco", group: "africa" },
  { code: "TN", nameAr: "تونس", nameEn: "Tunisia", group: "africa" },
  { code: "EG", nameAr: "مصر", nameEn: "Egypt", group: "africa" },
  { code: "LY", nameAr: "ليبيا", nameEn: "Libya", group: "africa" },
  { code: "MR", nameAr: "موريتانيا", nameEn: "Mauritania", group: "africa" },
  { code: "SN", nameAr: "السنغال", nameEn: "Senegal", group: "africa" },
  { code: "CI", nameAr: "ساحل العاج", nameEn: "Côte d'Ivoire", group: "africa" },
  { code: "GH", nameAr: "غانا", nameEn: "Ghana", group: "africa" },
  { code: "NG", nameAr: "نيجيريا", nameEn: "Nigeria", group: "africa" },
  { code: "KE", nameAr: "كينيا", nameEn: "Kenya", group: "africa" },
  { code: "ET", nameAr: "إثيوبيا", nameEn: "Ethiopia", group: "africa" },
  { code: "ZA", nameAr: "جنوب أفريقيا", nameEn: "South Africa", group: "africa" },
  { code: "MU", nameAr: "موريشيوس", nameEn: "Mauritius", group: "africa" },

  // Asia
  { code: "SG", nameAr: "سنغافورة", nameEn: "Singapore", group: "asia" },
  { code: "MY", nameAr: "ماليزيا", nameEn: "Malaysia", group: "asia" },
  { code: "TH", nameAr: "تايلاند", nameEn: "Thailand", group: "asia" },
  { code: "ID", nameAr: "إندونيسيا", nameEn: "Indonesia", group: "asia" },
  { code: "VN", nameAr: "فيتنام", nameEn: "Vietnam", group: "asia" },
  { code: "PH", nameAr: "الفلبين", nameEn: "Philippines", group: "asia" },
  { code: "JP", nameAr: "اليابان", nameEn: "Japan", group: "asia" },
  { code: "KR", nameAr: "كوريا الجنوبية", nameEn: "South Korea", group: "asia" },
  { code: "CN", nameAr: "الصين", nameEn: "China", group: "asia" },
  { code: "HK", nameAr: "هونغ كونغ", nameEn: "Hong Kong", group: "asia" },
  { code: "IN", nameAr: "الهند", nameEn: "India", group: "asia" },
  { code: "PK", nameAr: "باكستان", nameEn: "Pakistan", group: "asia" },
  { code: "BD", nameAr: "بنغلاديش", nameEn: "Bangladesh", group: "asia" },
  { code: "LK", nameAr: "سريلانكا", nameEn: "Sri Lanka", group: "asia" },
  { code: "MV", nameAr: "المالديف", nameEn: "Maldives", group: "asia" },
  { code: "KZ", nameAr: "كازاخستان", nameEn: "Kazakhstan", group: "asia" },
  { code: "UZ", nameAr: "أوزبكستان", nameEn: "Uzbekistan", group: "asia" },

  // Oceania
  { code: "AU", nameAr: "أستراليا", nameEn: "Australia", group: "oceania" },
  { code: "NZ", nameAr: "نيوزيلندا", nameEn: "New Zealand", group: "oceania" },

  // South America
  { code: "BR", nameAr: "البرازيل", nameEn: "Brazil", group: "south_america" },
  { code: "AR", nameAr: "الأرجنتين", nameEn: "Argentina", group: "south_america" },
  { code: "CL", nameAr: "تشيلي", nameEn: "Chile", group: "south_america" },
  { code: "CO", nameAr: "كولومبيا", nameEn: "Colombia", group: "south_america" },
  { code: "PE", nameAr: "بيرو", nameEn: "Peru", group: "south_america" },
];

export function getCountryByCode(code: string): CountryOption | undefined {
  return COUNTRIES.find((country) => country.code === code);
}
