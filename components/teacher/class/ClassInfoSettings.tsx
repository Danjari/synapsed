"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ClassInfoSettings({ classId }: { classId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState<string>("");
  const [joinToken, setJoinToken] = useState<string>("");
  const [isPublic, setIsPublic] = useState<boolean>(false); // UI only (schema does not include this yet)

  const detailsDisabled = useMemo(() => saving || loading, [saving, loading]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/class/${classId}`);
        if (!res.ok) throw new Error("Failed to fetch class");
        const data = await res.json();
        setTitle(data.title ?? "");
        setDescription(data.description ?? "");
        setJoinToken(data.joinToken ?? "");
      } catch (e: unknown) {
        toast.error((e as Error)?.message || "Failed to load class details");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [classId]);

  const saveChanges = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/class/${classId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      if (!res.ok) throw new Error("Failed to save changes");
      const data = await res.json();
      setTitle(data.title);
      setDescription(data.description ?? "");
      toast.success("Class details updated");
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const copyToken = async () => {
    try {
      await navigator.clipboard.writeText(joinToken);
      toast.success("Join token copied");
    } catch {
      toast.error("Failed to copy token");
    }
  };

  const regenerateToken = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/class/${classId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerateJoinToken: true }),
      });
      if (!res.ok) throw new Error("Failed to regenerate token");
      const data = await res.json();
      setJoinToken(data.joinToken);
      toast.success("Join token regenerated");
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Failed to regenerate token");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-2 md:p-2">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Class Info & Settings</h1>
        <p className="text-sm text-gray-500">Manage your class information and settings.</p>
      </div>

      {/* Class Details */}
      <section className="">
        <h2 className="text-xl font-semibold">Class Details</h2>
        <p className="text-sm text-gray-500 mb-4">Update your class information visible to students.</p>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="class-name">Class Name</Label>
            <Input id="class-name" value={title} onChange={(e) => setTitle(e.target.value)} disabled={detailsDisabled} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="class-desc">Class Description</Label>
            <Textarea id="class-desc" value={description} onChange={(e) => setDescription(e.target.value)} disabled={detailsDisabled} rows={5} />
          </div>

          <Button onClick={saveChanges} disabled={detailsDisabled} className="mt-2 w-fit">{saving ? "Saving..." : "Save Changes"}</Button>
        </div>
      </section>

      {/* Join Token */}
      <section className="">
        <h2 className="text-xl font-semibold">Join Token</h2>
        <p className="text-sm text-gray-500 mb-4">Share this token with students to join your class.</p>

        <div className="flex gap-2">
          <Input value={joinToken} readOnly className="flex-1" />
          <Button variant="outline" onClick={copyToken} title="Copy">Copy</Button>
          <Button variant="outline" onClick={regenerateToken} disabled={saving} title="Regenerate">Regenerate</Button>
        </div>
      </section>

      {/* Class Visibility (UI only) */}
      <section className="">
        <h2 className="text-xl font-semibold">Class Visibility</h2>
        <p className="text-sm text-gray-500 mb-4">Control who can see and join your class.</p>

        <div className="space-y-1">
          <p className="text-sm font-medium">Public Class</p>
          <p className="text-sm text-gray-500">Your class is visible in the directory and can be joined with the token.</p>
        </div>

        <div className="mt-4">
          <label className="inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              className="sr-only"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${isPublic ? "bg-black" : "bg-gray-300"}`}>
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${isPublic ? "translate-x-6" : "translate-x-1"}`}></span>
            </span>
          </label>
        </div>

        <p className="text-xs text-gray-400 mt-2">Visibility is UI-only for now. Persisting requires adding a field to the database.</p>
      </section>
    </div>
  );
}
