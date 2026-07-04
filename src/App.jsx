import { useState, useEffect } from 'react'
import { useInventory } from './hooks/useInventory'
import { useTodayTasks } from './hooks/useTodayTasks'
import Timer from './components/Timer'
import Inventory from './components/Inventory'
import TodoToday from './components/TodoToday'
import RecordsLog from './components/RecordsLog'
import Reports from './components/Reports'

function App() {
  const inventoryApi = useInventory()
  const todayApi = useTodayTasks()

  const activeTask = todayApi.tasks.find((t) => t.id === todayApi.activeTaskId)

  function handleSendToToday(text, estimate, inventoryId, unplanned, type) {
    // Envanterden normal planlamayla gelen bir görev "urgent" değildir —
    // Unplanned & Urgent bölümü sadece gün içinde aniden çıkan işler için.
    todayApi.addTask(text, estimate, { inventoryId, unplanned, type })
  }

  // Görev bittiğinde, eğer envanterden geldiyse envanterden de siliyoruz
  // (kitaptaki "tamamlanan işleri envanterden sil" kuralına uygun).
  function handleFinishTask(id) {
    const task = todayApi.tasks.find((t) => t.id === id)
    todayApi.finishTask(id)
    if (task?.inventoryId) inventoryApi.removeItem(task.inventoryId)
  }

  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 30 * 1000)
    return () => clearInterval(intervalId)
  }, [])

  const today = now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  const time = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  return (
    <div className="min-h-screen bg-pine">
      <header className="border-b border-cream/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-tomato" />
          <p className="text-sage text-xs font-sans tracking-widest uppercase">
            Pomodoro Technique
          </p>
        </div>
        <p className="text-sage text-xs font-sans">
          {today} · {time}
        </p>
      </header>

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-[380px_1fr_380px] gap-6 items-start">
        <div className="flex flex-col gap-6">
          <Inventory
            items={inventoryApi.items}
            addItem={inventoryApi.addItem}
            removeItem={inventoryApi.removeItem}
            toggleDone={inventoryApi.toggleDone}
            onSendToToday={handleSendToToday}
          />
          <RecordsLog />
        </div>

        <div className="flex justify-center lg:sticky lg:top-6">
          <Timer
            activeTask={activeTask}
            onWorkComplete={() => {
              if (todayApi.activeTaskId) todayApi.incrementRealized(todayApi.activeTaskId)
            }}
            onInterruption={(kind, delta) => {
              if (todayApi.activeTaskId) todayApi.addInterruption(todayApi.activeTaskId, kind, delta)
            }}
          />
        </div>

        <div className="flex flex-col gap-6">
          <TodoToday
            tasks={todayApi.tasks}
            activeTaskId={todayApi.activeTaskId}
            setActiveTaskId={todayApi.setActiveTaskId}
            addTask={todayApi.addTask}
            removeTask={todayApi.removeTask}
            finishTask={handleFinishTask}
          />
          <Reports />
        </div>
      </div>
    </div>
  )
}

export default App
