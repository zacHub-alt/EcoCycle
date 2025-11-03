// src/MainApp.jsx
import { useState, useEffect, useRef } from "react";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";
import { db, auth } from "./firebase";
import EcoCycle from "./EcoCycle";
import Map from "./components/Map";
// use the production-friendly PWA icon from public/ so bundler doesn't need to import binary
const logo = "/logo512.png";
import { 
  FaRecycle, FaCoins, FaUsers, FaMapMarkedAlt, 
  FaGlobe, FaLeaf, FaTrophy, FaCircle 
} from "react-icons/fa";

// Small local component for the spinning logo used in the hero.
function SpinningLogo({ size = 80, alt = "EcoCycle", className = "" }) {
  return (
    <img
      src={logo}
      alt={alt}
      style={{ width: size, height: size }}
      className={`mx-auto mb-6 animate-spin-slow ${className}`}
    />
  );
}

const LANGUAGES = [
  { code: "en", name: "English", flag: "GB" },
  { code: "yo", name: "Yoruba", flag: "NG" },
  { code: "ig", name: "Igbo", flag: "NG" },
  { code: "ha", name: "Hausa", flag: "NG" },
];

const TRANSLATIONS = {
  en: {
    title: "Transforming Waste into Wealth",
    subtitle: "EcoCycle empowers communities in Ogun State to recycle waste, earn cash, and track illegal dumps all in one tap.",
    stats: "500 tons recycled. ₦37,200 paid. 1,247 active users.",
    tagline: "Powered by innovation. Driven by impact.",
    wallet: "Your Wallet",
    recycled: "Recycled",
    earned: "Total Earned",
    users: "Active Users",
    dumps: "Dump Reports",
    scan: "Scan & Earn",
    map: "Live Drop-Off & Dump Map",
    live: "Live",
    carbon: "CO₂ Saved",
    online: "Online Now",
    greentech: "Transforming waste into income and sustainability across Ogun State.",
  },
  yo: {
    title: "Sísọ Ìdọ̀tí Di Owó",
    subtitle: "EcoCycle fún àwọn ará Ogun lágbára láti ṣe atunlo ìdọ̀tí, gba owó, kí wọ́n sì tọ́jú àwọn ibi ìdọ̀tí tí kò tọ̀nà.",
    stats: "500 tọ́ọ̀nù ìdọ̀tí ni a tún ṣe. ₦37,200 ni a san. 1,247 olùmúlò.",
    tagline: "Agbára ìmọ̀-ẹ̀rọ. Ìtòlẹ́sẹẹsẹ ìpìlẹ̀.",
    wallet: "Apamọ́wọ́ Rẹ",
    recycled: "Tún Ṣe",
    earned: "Owó Gba",
    users: "Olùmúlò",
    dumps: "Ìròyìn Ìdọ̀tí",
    scan: "Wò & Gba",
    map: "Ìròyìn Ìdọ̀tí Láàyè",
    live: "Láàyè",
    carbon: "CO₂ Ti Fipamọ́",
    online: "Lórí Ayélujára",
    greentech: "Ìdíje Greentech Ogun",
  },
  ig: {
    title: "Gbanwee Ihe Mkpochapu Bụrụ Ego",
    subtitle: "EcoCycle na-enye ndị obodo Ogun ike ịmegharị ihe mkpofu, nweta ego, na soro ebe mkpofu iwu na-akwadoghị.",
    stats: "500 tọ́nụ̀ ihe mkpofu emegharịrị. ₦37,200 kwụrụ ụgwọ. Ndị ọrụ 1,247.",
    tagline: "Mee site na nkà na ụzụ. Mee ka mmetụta dị.",
    wallet: "Obere Akpa Gị",
    recycled: "Emegharịrị",
    earned: "Ego Enwetara",
    users: "Ndị Ọrụ",
    dumps: "Akụkọ Mkpochapu",
    scan: "Nyochaa & Nweta",
    map: "Akụkọ Mkpochapu Dị Ndụ",
    live: "Dị Ndụ",
    carbon: "CO₂ Echekwara",
    online: "Na Ntanetị",
    greentech: "Asọmpi Greentech Ogun",
  },
  ha: {
    title: "Juya Datti Zuwa Arziki",
    subtitle: "EcoCycle yana baiwa al'ummar Ogun damar sake amfani da datti, samun kuɗi, da kuma bin diddigin shara mara izini.",
    stats: "Tons 500 na sake amfani da datti. ₦37,200 aka aka. Masu amfani 1,247.",
    tagline: "Ƙirƙiri ta hanyar fasaha. Ƙarfafa tasiri.",
    wallet: "Walat ɗinka",
    recycled: "Sake Amfani",
    earned: "Kuɗin Samu",
    users: "Masu Amfani",
    dumps: "Rahoton Datti",
    scan: "Duba & Samu",
    map: "Rahoton Datti Kai Tsaye",
    live: "Kai Tsaye",
    carbon: "CO₂ An Ceci",
    online: "A Kan Layi",
    greentech: "Gasar Greentech ta Ogun",
  },
};

export default function MainApp() {
  const [lang, setLang] = useState("en");
  const [stats, setStats] = useState({ recycled: 0, earnings: 0, users: 0, carbon: 0 });
  const [wallet, setWallet] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [walletFlash, setWalletFlash] = useState(false);
  const prevWalletRef = useRef(wallet);
  const t = TRANSLATIONS[lang];

  // Real-time Firestore data
  useEffect(() => {
    const unsubs = [];

    // Global stats
    const statsRef = doc(db, "global", "stats");
    unsubs.push(onSnapshot(statsRef, (doc) => {
      if (doc.exists()) {
        setStats(doc.data());
      }
    }));

    // User wallet
    if (auth.currentUser) {
      const userRef = doc(db, "users", auth.currentUser.uid);
      unsubs.push(onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
          setWallet(doc.data().wallet || 0);
        }
      }));
    }

    // Online users (last 5 mins)
    const now = Date.now();
    const fiveMinsAgo = now - 5 * 60 * 1000;
    const onlineQuery = query(
      collection(db, "users"),
      where("lastActive", ">=", fiveMinsAgo)
    );
    unsubs.push(onSnapshot(onlineQuery, (snap) => {
      setOnlineUsers(snap.size);
    }));

    setLoading(false);
    return () => unsubs.forEach(u => u());
  }, []);

  // flash wallet UI briefly when wallet value changes (not on initial load)
  useEffect(() => {
    if (prevWalletRef.current !== wallet) {
      // ignore initial value change from 0 -> stored value
      if (prevWalletRef.current !== 0) {
        setWalletFlash(true);
        const tId = setTimeout(() => setWalletFlash(false), 900);
        return () => clearTimeout(tId);
      }
      prevWalletRef.current = wallet;
    }
  }, [wallet]);

  // Colored stat cards (each provides a gentle gradient background + matching text/icon color)
  const cards = [
    {
      icon: <FaRecycle />,
      value: `${stats.recycled} tons`,
      label: t.recycled,
      bg: "bg-gradient-to-br from-green-50 to-green-100",
      text: "text-green-800",
    },
    {
      icon: <FaCoins />,
      value: `₦${stats.earnings.toLocaleString()}`,
      label: t.earned,
      bg: "bg-gradient-to-br from-yellow-50 to-yellow-100",
      text: "text-yellow-800",
    },
    {
      icon: <FaUsers />,
      value: stats.users.toLocaleString(),
      label: t.users,
      bg: "bg-gradient-to-br from-blue-50 to-blue-100",
      text: "text-blue-800",
    },
    {
      icon: <FaMapMarkedAlt />,
      value: t.live,
      label: t.dumps,
      bg: "bg-gradient-to-br from-red-50 to-red-100",
      text: "text-red-800",
    },
  ];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-gray-900">
        <div className="animate-spin h-12 w-12 border-4 border-primary rounded-full border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-green-50 dark:from-gray-900 dark:to-gray-800">
      {/* Greentech Badge */}
      <div className="bg-gradient-to-r from-yellow-400 to-green-500 text-white py-2 px-6 text-center font-bold text-sm">
        <FaTrophy className="inline mr-2" /> {t.greentech}
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">

        {/* Language Selector */}
        <div className="flex justify-end mb-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-2 flex gap-1">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                  lang === l.code 
                    ? "bg-primary text-white" 
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                {l.flag === "GB" ? "EN" : l.name}
              </button>
            ))}
          </div>
        </div>

        {/* Hero */}
        <div className="text-center mb-12">
          <SpinningLogo size={80} alt="EcoCycle" className="mx-auto mb-6" />
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 animate-fadeIn">
            <span className="bg-gradient-to-r from-green-600 via-teal-500 to-cyan-400 bg-clip-text text-transparent">{t.title}</span>
          </h1>
          <p className="text-xl md:text-2xl leading-relaxed animate-fadeIn delay-300 max-w-4xl mx-auto text-gray-700">
            <strong className="text-primary">EcoCycle</strong>
            <span className="ml-2 text-gray-800">{t.subtitle}</span>
          </p>
          <div className="flex flex-wrap gap-3 justify-center mt-6 animate-fadeIn delay-600">
            {/* show real stats (pulled from Firestore `global/stats`) */}
            <span className="px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap bg-green-50 text-green-700 shadow-sm">
              {stats.recycled} tons
            </span>
            <span className="px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap bg-yellow-50 text-yellow-700 shadow-sm">
              ₦{(stats.earnings || 0).toLocaleString()}
            </span>
            <span className="px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap bg-blue-50 text-blue-700 shadow-sm">
              {stats.users.toLocaleString()} active users
            </span>
          </div>
          <p className="text-base md:text-lg text-gray-500 mt-8 italic animate-fadeIn delay-900">
            {t.tagline}
          </p>
        </div>

        {/* Wallet + Online */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 max-w-md mx-auto">
          <div className={`bg-primary text-white p-6 rounded-xl shadow-lg hover-lift text-center transition-transform duration-300 ${walletFlash ? 'scale-105 ring-4 ring-green-300' : ''}`}>
            <p className="text-sm opacity-90">{t.wallet}</p>
            <p className="text-4xl font-bold">₦{wallet.toLocaleString()}</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-teal-600 text-white p-6 rounded-xl shadow-lg hover-lift text-center flex items-center justify-center gap-3">
            <FaCircle className="text-green-300 animate-pulse" />
            <div>
              <p className="text-sm opacity-90">{t.online}</p>
              <p className="text-2xl font-bold">{onlineUsers}</p>
            </div>
          </div>
        </div>

        {/* Stats + Carbon */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
          {cards.map((card, i) => (
            <div
              key={i}
              className={`${card.bg} ${card.text} p-5 rounded-xl shadow-md hover:shadow-xl transition transform hover:-translate-y-1 animate-fadeIn text-center`}
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="text-3xl mb-2">{card.icon}</div>
              <p className="text-lg font-bold">{card.value}</p>
              <p className="text-xs opacity-80">{card.label}</p>
            </div>
          ))}
          <div className="bg-teal-100 p-5 rounded-xl shadow-md hover:shadow-xl transition transform hover:-translate-y-1 animate-fadeIn text-center">
            <FaLeaf className="text-teal-600 text-3xl mb-2 mx-auto" />
            <p className="text-lg font-bold text-gray-800">{(stats.carbon || 0).toFixed(1)}t</p>
            <p className="text-xs text-gray-600">{t.carbon}</p>
          </div>
        </div>

        {/* Scan + Map */}
        <div className="grid lg:grid-cols-12 gap-8 mb-12">
          <div className="lg:col-span-7 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-primary mb-4">{t.scan}</h2>
            <EcoCycle />
          </div>
          <div className="lg:col-span-5 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-primary mb-4">{t.map}</h2>
            <div className="h-96 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <Map />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
