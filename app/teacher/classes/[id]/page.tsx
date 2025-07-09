'use client'
import { StudentManagement } from "@/components/teacher/class/studentManagement"
import ContentManagement from "@/components/teacher/class/contentmanagement/contentManagement"
import { useParams } from "next/navigation"
import { useState } from "react"
import { TeacherDashboard } from "@/components/teacher/class/teacherDashboard"
export default function Page() {
  const params = useParams()
  const classId = params.id as string
  const [activeSection, setActiveSection] = useState("class-info")

  if (!classId) return null;

  const renderContent = () => {
    switch (activeSection) {
      // case "class-info":
      //   return <ClassInfo classId={classId} />
      case "student-management":
        return <StudentManagement classId={classId} />
      case "content-management":
        return <ContentManagement classId={classId} />
      // case "survey-learning-path":
      //   return <SurveyLearningPath classId={classId} />
      // case "quizzes-assessments":
      //   return <QuizzesAssessments classId={classId} />
      // case "analytics":
      //   return <Analytics classId={classId} />
      // default:
      //   return <ClassInfo classId={classId} />
    }
  }

  return (
    <TeacherDashboard activeSection={activeSection} setActiveSection={setActiveSection}>
      {renderContent()}
    </TeacherDashboard>
  )
}