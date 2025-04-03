import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { Role } from "@prisma/client"

export async function POST(req: Request) {
  const session = await auth()
  const { role } = await req.json()
  
  console.log("Body receive in set-role:",role)

  if (!session?.user?.email || !Object.values(Role).includes(role)) {
    return NextResponse.json({ error: "Unauthorized or invalid role" }, { status: 401 })
  }

  const updatedUser = await prisma.user.update({
    where: { email: session.user.email },
    data: { role },
  })
 
  return NextResponse.json({ success: true, role:updatedUser.role })
}