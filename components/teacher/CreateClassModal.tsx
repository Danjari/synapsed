"use client";
import { useState } from "react";

export default function CreateClassModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [className, setClassName] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-lg font-bold mb-4">Create New Class</h2>
        <input
          type="text"
          placeholder="Class Name"
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          className="w-full border p-2 rounded-lg mb-4"
        />
        <div className="flex justify-end space-x-2">
          <button className="px-4 py-2 bg-gray-300 rounded-lg" onClick={onClose}>Cancel</button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" onClick={() => alert(`Creating: ${className}`)}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
}