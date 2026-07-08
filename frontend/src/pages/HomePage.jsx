function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
      <h1 className="text-4xl font-bold text-primary-700">
        AI Study Assistant
      </h1>
      <p className="text-lg text-gray-500 max-w-md text-center">
        Загружайте учебные материалы и задавайте вопросы — AI ответит
        со ссылкой на источник.
      </p>
      <div className="flex gap-4">
        <button className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition">
          Загрузить материал
        </button>
        <button className="px-6 py-3 border border-primary-600 text-primary-600 rounded-xl hover:bg-primary-50 transition">
          Задать вопрос
        </button>
      </div>
    </main>
  )
}

export default HomePage
