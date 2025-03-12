"use client";
import { useState } from "react";
import { useParams } from "next/navigation";

export default function ManageClassPage() {
  const { id } = useParams();
  const [email, setEmail] = useState("");

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Manage Class {id}</h1>
      <p className="text-gray-600">Invite students via email.</p>

      <div className="mt-4">
        <input
          type="email"
          placeholder="Enter student email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 rounded-lg mr-2"
        />
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" onClick={() => alert(`Inviting: ${email}`)}>
          Invite
        </button>
      </div>
    </div>
  );
}