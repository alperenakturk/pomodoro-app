import TodoToday from './TodoToday'

// Simple mode's entire Planning tab: just today's task list, redesigned as
// a wider, more spacious single column instead of sharing a half-width grid
// cell with Inventory/Timetable/AvailablePomodoros (all hidden in this
// mode). TodoToday.jsx handles all the data/behavior identically either
// way — this passes variant="simple", which only swaps its own outer card
// (bg/border/shadow) for a plain, open layout that sits directly on the
// page background instead of being boxed in, per the "not boxed" direction
// requested for Simple mode specifically.
//
// Width: a centered reading column (max-w-2xl) rather than literal
// edge-to-edge — per the ui-ux-pro-max skill's line-length-control
// guidance, a raw full-bleed single list reads worse, not better, at
// desktop widths. "Full-width" here means "not squeezed into a half grid
// cell," not literal 100% viewport width.
function PlanningSimple({
  tasks,
  activeTaskId,
  setActiveTaskId,
  addTask,
  removeTask,
  clearFinishedTasks,
  clearAllTasks,
  updateTask,
  reestimateTask,
  finishTask,
  categories,
  onManageCategories,
}) {
  return (
    <div className="w-full max-w-2xl mx-auto py-6">
      <TodoToday
        variant="simple"
        tasks={tasks}
        activeTaskId={activeTaskId}
        setActiveTaskId={setActiveTaskId}
        addTask={addTask}
        removeTask={removeTask}
        clearFinishedTasks={clearFinishedTasks}
        clearAllTasks={clearAllTasks}
        updateTask={updateTask}
        reestimateTask={reestimateTask}
        finishTask={finishTask}
        categories={categories}
        onManageCategories={onManageCategories}
      />
    </div>
  )
}

export default PlanningSimple
