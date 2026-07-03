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

  function handleSendToToday(text, estimate, inventoryId) {
    todayApi.addTask(text, estimate, { inventoryId })
  }

  // Görev bittiğinde, eğer envanterden geldiyse envanterden de siliyoruz
  // (kitaptaki "tamamlanan işleri envanterden sil" kuralına uygun).
  function handleFinishTask(id) {
    const task = todayApi.tasks.find((t) => t.id === id)
    todayApi.finishTask(id)
    if (task?.inventoryId) inventoryApi.removeItem(task.inventoryId)
  }

  return (
    <div className="min-h-screen bg-pine p-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">
        <div className="bg-cream rounded-3xl px-10 py-10 shadow-2xl text-center lg:sticky lg:top-6">
          <Timer
            activeTask={activeTask}
            onWorkComplete={() => {
              if (todayApi.activeTaskId) todayApi.incrementRealized(todayApi.activeTaskId)
            }}
            onInterruption={(kind) => {
              if (todayApi.activeTaskId) todayApi.addInterruption(todayApi.activeTaskId, kind)
            }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Inventory
            items={inventoryApi.items}
            addItem={inventoryApi.addItem}
            removeItem={inventoryApi.removeItem}
            onSendToToday={handleSendToToday}
          />

          <TodoToday
            tasks={todayApi.tasks}
            activeTaskId={todayApi.activeTaskId}
            setActiveTaskId={todayApi.setActiveTaskId}
            addTask={todayApi.addTask}
            removeTask={todayApi.removeTask}
            finishTask={handleFinishTask}
          />

          <RecordsLog />
          <Reports />
        </div>
      </div>
    </div>
  )
}

export default App
