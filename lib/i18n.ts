export type Locale = "en" | "fr" | "ar";

export const LOCALES: Locale[] = ["en", "fr", "ar"];
export const DEFAULT_LOCALE: Locale = "fr";
export const RTL_LOCALES: Locale[] = ["ar"];

export const STRINGS: Record<Locale, Record<string, string>> = {
  en: {
    tagline: "Don't overpay.",
    subtitle: "Know the real market price before you buy.",
    checkPrice: "Check a Price",
    exploreDeals: "Explore Deals",
    search: "Search", searchPlaceholder: "Search brand, model, product… (e.g. iPhone 13, ThinkPad)",
    compare: "Compare", watchlist: "Watchlist", alerts: "Alerts", purchases: "Purchases",
    warranties: "Warranties", contribute: "Contribute", dashboard: "Dashboard",
    owner: "Owner", admin: "Admin", profile: "Profile", settings: "Settings",
    login: "Log in", register: "Create account", logout: "Log out",
    insufficientData: "Not enough reliable data yet.",
    marketAnalysis: "Market-based analysis",
    excellent: "Excellent", good: "Good", fair: "Fair", expensive: "Expensive", veryExpensive: "Very Expensive",
    demoBadge: "DEVELOPMENT / DEMO DATA — not real market statistics",
    howItWorks: "How it works", dealScore: "Deal Score", priceHistory: "Price history",
    trust: "Trust & data quality", community: "Community",
    email: "Email", password: "Password", name: "Name",
    targetPrice: "Target price (MAD)", targetScore: "Target Deal Score",
    save: "Save", remove: "Remove", add: "Add", cancel: "Cancel", confirm: "Confirm", delete: "Delete",
    loading: "Loading…", empty: "Nothing here yet.", error: "Something went wrong.",
    allRights: "DEALMAP — Don't overpay.",
  },
  fr: {
    tagline: "Ne payez pas trop cher.",
    subtitle: "Connaissez le vrai prix du marché avant d'acheter.",
    checkPrice: "Vérifier un prix",
    exploreDeals: "Explorer les offres",
    search: "Rechercher", searchPlaceholder: "Rechercher marque, modèle, produit… (ex. iPhone 13, ThinkPad)",
    compare: "Comparer", watchlist: "Favoris", alerts: "Alertes", purchases: "Achats",
    warranties: "Garanties", contribute: "Contribuer", dashboard: "Tableau de bord",
    owner: "Propriétaire", admin: "Admin", profile: "Profil", settings: "Paramètres",
    login: "Se connecter", register: "Créer un compte", logout: "Se déconnecter",
    insufficientData: "Pas encore assez de données fiables.",
    marketAnalysis: "Analyse basée sur le marché",
    excellent: "Excellent", good: "Bonne affaire", fair: "Correct", expensive: "Cher", veryExpensive: "Très cher",
    demoBadge: "DONNÉES DE DÉVELOPPEMENT / DÉMO — pas de vraies statistiques",
    howItWorks: "Comment ça marche", dealScore: "Score d'affaire", priceHistory: "Historique des prix",
    trust: "Confiance & qualité des données", community: "Communauté",
    email: "E-mail", password: "Mot de passe", name: "Nom",
    targetPrice: "Prix cible (MAD)", targetScore: "Score cible",
    save: "Enregistrer", remove: "Retirer", add: "Ajouter", cancel: "Annuler", confirm: "Confirmer", delete: "Supprimer",
    loading: "Chargement…", empty: "Rien ici pour le moment.", error: "Une erreur est survenue.",
    allRights: "DEALMAP — Ne payez pas trop cher.",
  },
  ar: {
    tagline: "لا تدفع أكثر من اللازم.",
    subtitle: "اعرف سعر السوق الحقيقي قبل الشراء.",
    checkPrice: "تحقق من السعر",
    exploreDeals: "استكشف العروض",
    search: "بحث", searchPlaceholder: "ابحث عن العلامة أو الطراز أو المنتج… (مثال iPhone 13)",
    compare: "مقارنة", watchlist: "المفضلة", alerts: "التنبيهات", purchases: "المشتريات",
    warranties: "الضمانات", contribute: "ساهم", dashboard: "لوحة التحكم",
    owner: "المالك", admin: "الإدارة", profile: "الملف", settings: "الإعدادات",
    login: "تسجيل الدخول", register: "إنشاء حساب", logout: "تسجيل الخروج",
    insufficientData: "لا توجد بيانات موثوقة كافية بعد.",
    marketAnalysis: "تحليل مبني على السوق",
    excellent: "ممتاز", good: "جيد", fair: "مقبول", expensive: "غالي", veryExpensive: "غالي جداً",
    demoBadge: "بيانات تطوير / تجريبية — ليست إحصاءات سوق حقيقية",
    howItWorks: "كيف يعمل", dealScore: "نقاط الصفقة", priceHistory: "سجل الأسعار",
    trust: "الثقة وجودة البيانات", community: "المجتمع",
    email: "البريد الإلكتروني", password: "كلمة المرور", name: "الاسم",
    targetPrice: "السعر المستهدف (درهم)", targetScore: "النقاط المستهدفة",
    save: "حفظ", remove: "إزالة", add: "إضافة", cancel: "إلغاء", confirm: "تأكيد", delete: "حذف",
    loading: "جارٍ التحميل…", empty: "لا يوجد شيء هنا بعد.", error: "حدث خطأ ما.",
    allRights: "ديل ماب — لا تدفع أكثر من اللازم.",
  },
};

export function getLocale(lang?: string | null): Locale {
  if (lang === "ar" || lang === "en" || lang === "fr") return lang;
  return DEFAULT_LOCALE;
}
export function t(locale: Locale, key: string): string {
  return STRINGS[locale]?.[key] ?? STRINGS.en[key] ?? key;
}
export function isRTL(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale);
}
