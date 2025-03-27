// app/api/user/change-role/route.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongoose";
import { User } from "@/models/schemas";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    // Check authorization
    const session = await getServerSession(authOptions);
    
    // Only allow professors to change roles
    if (!session || session.user.role !== "professor") {
      return NextResponse.json(
        { error: "Not authorized" },
        { status: 403 }
      );
    }
    
    // Get request body
    const { userId, newRole } = await request.json();
    
    // Validate newRole
    if (!["professor", "student"].includes(newRole)) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'professor' or 'student'" },
        { status: 400 }
      );
    }
    
    // Connect to database
    await dbConnect();
    
    // Find and update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { role: newRole },
      { new: true, runValidators: true }
    );
    
    if (!updatedUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      message: "Role updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role
      }
    });
    
  } catch (error) {
    console.error("Error changing user role:", error);
    return NextResponse.json(
      { error: "Failed to change user role" },
      { status: 500 }
    );
  }
}