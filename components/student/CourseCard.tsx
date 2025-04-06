import React from "react"
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface CourseCardProps {
  title: string
  professor: string
  progress: number
  link: string
}

const CourseCard: React.FC<CourseCardProps> = ({ title, professor, progress, link }) => {
  return (
    <Card className="transition-all hover:shadow-md hover:border-muted-foreground/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">Prof. {professor}</p>
        <div className="mb-2 text-sm text-muted-foreground">
          {progress}% completed
        </div>
      </CardHeader>

      <CardFooter>
        <Button asChild className="w-full" variant={"outline"}>
          <a href={link}>Continue</a>
        </Button>
      </CardFooter>
    </Card>
  )
}

export default CourseCard