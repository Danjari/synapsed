
import { useParams } from "next/navigation"
import { useState } from "react"
export default function Page() {
  const { id: classId } = useParams()
  const [activeSection, setActiveSection] = useState("class-info")

  const renderContent = () => {
    switch (activeSection) {
      case "class-info":
        return <ClassInfo classId={classId} />
      case "student-management":
        return <StudentManagement classId={classId} />
      case "content-management":
        return <ContentManagement classId={classId} />
      case "survey-learning-path":
        return <SurveyLearningPath classId={classId} />
      case "quizzes-assessments":
        return <QuizzesAssessments classId={classId} />
      case "analytics":
        return <Analytics classId={classId} />
      default:
        return <ClassInfo classId={classId} />
    }
  }

  return (
    <TeacherDashboard activeSection={activeSection} setActiveSection={setActiveSection}>
      {renderContent()}
    </TeacherDashboard>
  )
}