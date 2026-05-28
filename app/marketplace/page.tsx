import Link from "next/link";

export default function Marketplace() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#1a1560] to-[#24243e]">
      
      {/* Навигация */}
      <nav className="flex items-center justify-between px-8 py-6">
        <Link href="/" className="text-white text-2xl font-bold tracking-tight">
          Adver<span className="text-purple-400">Link</span>
        </Link>
        <Link href="/add-channel" className="bg-purple-600 hover:bg-purple-500 transition text-white px-5 py-2 rounded-full text-sm font-medium">
          Добавить канал
        </Link>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12">
        
        {/* Заголовок */}
        <h1 className="text-4xl font-bold text-white mb-2">Каталог каналов</h1>
        <p className="text-white/50 mb-10">Найди подходящий Telegram-канал для рекламы</p>

        {/* Фильтры */}
        <div className="flex gap-3 mb-10 flex-wrap">
          {["Все", "Новости", "Технологии", "Бизнес", "Спорт", "Lifestyle", "Юмор"].map((cat) => (
            <button
              key={cat}
              className="px-4 py-2 rounded-full text-sm border border-white/20 text-white/70 hover:border-purple-500 hover:text-white transition"
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Карточки каналов */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Пример карточки */}
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-purple-500/50 transition">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-lg">
                  A
                </div>
                <div>
                  <div className="text-white font-semibold">Армянский канал {i}</div>
                  <div className="text-white/40 text-sm">@channel_{i}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-white/5 rounded-xl p-2 text-center">
                  <div className="text-white text-sm font-semibold">12K</div>
                  <div className="text-white/40 text-xs">подписчиков</div>
                </div>
                <div className="bg-white/5 rounded-xl p-2 text-center">
                  <div className="text-white text-sm font-semibold">3K</div>
                  <div className="text-white/40 text-xs">охваты</div>
                </div>
                <div className="bg-white/5 rounded-xl p-2 text-center">
                  <div className="text-white text-sm font-semibold">25%</div>
                  <div className="text-white/40 text-xs">вовлечённость</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-purple-400 font-semibold">от $50</div>
                <button className="bg-purple-600 hover:bg-purple-500 transition text-white px-4 py-1.5 rounded-full text-sm">
                  Запросить рекламу
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}