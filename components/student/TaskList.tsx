"use client"; // Required for App Router hooks

import React, { useState } from "react";

interface Task {
  id: number;
  title: string;
  completed: boolean;
  progress?: string;
}

interface TaskListProps {
  tasks: Task[];
}

const TaskList: React.FC<TaskListProps> = ({ tasks }) => {
  const [taskList, setTaskList] = useState(tasks); // ✅ State to track tasks

  const toggleTask = (taskId: number) => {
    setTaskList((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  };

  return (
    <div className="bg-white p-6 shadow-md rounded-xl">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Tasks</h2>
      <ul className="space-y-4">
        {taskList.map((task) => (
          <li
            key={task.id}
            className={`flex items-center justify-between p-3 rounded-md transition ${
              task.completed ? "bg-green-100" : "bg-gray-50 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => toggleTask(task.id)} // ✅ Toggle task state
                className="mr-3 accent-blue-500 w-5 h-5 cursor-pointer"
              />
              <span
                className={`text-gray-700 transition ${
                  task.completed ? "line-through text-gray-400" : ""
                }`}
              >
                {task.title}
              </span>
            </div>
            {task.progress && <span className="text-gray-500 text-sm">{task.progress}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TaskList;