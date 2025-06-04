"use client"

import { Button } from "@/components/ui/button"
import { useEffect, useRef } from "react"

export function HeroSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions to match window size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // Branch node class
    class Node {
      x: number
      y: number
      radius: number
      vx: number
      vy: number
      connections: Node[]
      targetX: number
      targetY: number
      color: string

      constructor(x: number, y: number, radius: number) {
        this.x = x
        this.y = y
        this.radius = radius
        this.vx = (Math.random() - 0.5) * 0.02 // Reduced from 0.05
        this.vy = (Math.random() - 0.5) * 0.02 // Reduced from 0.05
        this.connections = []
        this.targetX = x + (Math.random() - 0.5) * 100
        this.targetY = y + (Math.random() - 0.5) * 100
        this.color = `rgba(120, 80, 160, ${Math.random() * 0.5 + 0.2})`
      }

      update() {
        // Move towards target with reduced speed
        const dx = this.targetX - this.x
        const dy = this.targetY - this.y
        this.x += dx * 0.003 // Reduced from 0.008
        this.y += dy * 0.0005 // Reduced from 0.001

        // Add slight random movement with occasional direction changes
        if (Math.random() < 0.01) {
          this.vx = (Math.random() - 0.5) * 0.02
          this.vy = (Math.random() - 0.5) * 0.02
        }

        this.x += this.vx
        this.y += this.vy

        // Bounce off edges
        if (this.x < this.radius || this.x > canvas!.width - this.radius) {
          this.vx *= -1
          this.targetX = Math.random() * canvas!.width
        }
        if (this.y < this.radius || this.y > canvas!.height - this.radius) {
          this.vy *= -1
          this.targetY = Math.random() * canvas!.height
        }

        // Increase randomness by changing target more frequently
        if (Math.random() < 0.002) {
          // Changed from 0.005
          this.targetX = Math.random() * canvas!.width
          this.targetY = Math.random() * canvas!.height
        }
      }

      draw() {
        if (!ctx) return
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
        ctx.fillStyle = this.color
        ctx.fill()
      }

      connect(node: Node) {
        if (!this.connections.includes(node)) {
          this.connections.push(node)
        }
      }

      drawConnections() {
        if (!ctx) return
        this.connections.forEach((node) => {
          const distance = Math.sqrt(Math.pow(this.x - node.x, 2) + Math.pow(this.y - node.y, 2))

          // Only draw connections within a certain distance
          if (distance < 150) {
            ctx.beginPath()
            ctx.moveTo(this.x, this.y)
            ctx.lineTo(node.x, node.y)
            const opacity = 1 - distance / 150
            ctx.strokeStyle = `rgba(120, 80, 160, ${opacity * 0.2})`
            ctx.lineWidth = 1
            ctx.stroke()
          }
        })
      }
    }

    // Create nodes
    const nodeCount = Math.floor((window.innerWidth * window.innerHeight) / 15000)
    const nodes: Node[] = []

    for (let i = 0; i < nodeCount; i++) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height
      const radius = Math.random() * 2 + 1
      nodes.push(new Node(x, y, radius))
    }

    // Connect nodes
    nodes.forEach((node) => {
      nodes.forEach((otherNode) => {
        if (node !== otherNode) {
          node.connect(otherNode)
        }
      })
    })

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Update and draw nodes
      nodes.forEach((node) => {
        node.update()
        node.draw()
        node.drawConnections()
      })

      requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [])

  return (
    <section className="relative w-full h-screen flex items-center justify-center overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full -z-10" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background opacity-30" />

      <div className="container px-4 md:px-6 flex flex-col items-center text-center z-10 max-w-4xl">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-6 animate-fade-up">
          Personalized Learning. Made Simple.
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-[800px] animate-fade-up animation-delay-100">
          Empowering every learner with AI-generated pathways tailored to how they learn best.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 animate-fade-up animation-delay-200">
          <Button size="lg" className="bg-purple-600 hover:bg-purple-700">
            <a href="/waitlist-page">Request a Demo</a>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href="/waitlist-page">Join the Waitlist</a>
          </Button>
        </div>
      </div>
    </section>
  )
}
