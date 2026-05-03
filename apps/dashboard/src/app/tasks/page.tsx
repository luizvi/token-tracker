import { TaskTable } from "@/components/task-table";

export default function TasksPage() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Tasks</h2>
      <TaskTable />
    </div>
  );
}
