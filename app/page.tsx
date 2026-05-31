import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#1a1560] to-[#24243e] flex flex-col">
      <nav className="flex items-center justify-between px-8 py-6">
        <div className="text-white text-2xl font-bold tracking-tight">
          Adver<span className="text-purple-400">Link</span>
        </div>
        <div className="flex gap-4">
          <Link href="/marketplace" className="text-white/70 hover:text-white transition px-4 py-2 text-sm">
            Каталог каналов
          </Link>
          <Link href="/auth/login" className="bg-purple-600 hover:bg-purple-500 transition text-white px-5 py-2 rounded-full text-sm font-medium">
            Добавить канал
          </Link>
        </div>
      </nav>

      <main className="flex flex-col items-center justify-center flex-1 text-center px-6 py-24">
        <div className="inline-block bg-purple-500/20 text-purple-300 text-sm px-4 py-1.5 rounded-full mb-6 border border-purple-500/30">
          Армянский рынок Telegram-рекламы
        </div>
        <h1 className="text-5xl font-bold text-white max-w-2xl leading-tight mb-6">
          Найди нужный канал. Купи рекламу.
        </h1>
        <p className="text-white/60 text-lg max-w-xl mb-10">
          AdverLink — маркетплейс Telegram-каналов Армении. Рекламодатели находят каналы, владельцы каналов получают клиентов.
        </p>
        <div className="flex gap-4">
          <Link href="/marketplace" className="bg-purple-600 hover:bg-purple-500 transition text-white px-8 py-3 rounded-full font-medium text-base">
            Смотреть каналы
          </Link>
          <Link href="/auth/login" className="border border-white/20 hover:border-white/40 transition text-white px-8 py-3 rounded-full font-medium text-base">
            Добавить свой канал
          </Link>
        </div>
      </main>

      <section className="grid grid-cols-3 gap-6 max-w-2xl mx-auto pb-24 px-6">
        {[
          { number: "100+", label: "Telegram каналов" },
          { number: "500+", label: "Рекламодателей" },
          { number: "AM", label: "Фокус на Армению" },
        ].map((item) => (
          <div key={item.label} className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
            <div className="text-3xl font-bold text-white mb-1">{item.number}</div>
            <div className="text-white/50 text-sm">{item.label}</div>
          </div>
        ))}
      </section>
    </div>
  );
}