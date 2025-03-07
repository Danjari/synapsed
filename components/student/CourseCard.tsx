import React from "react";

interface CourseCardProps {
  title: string;
  professor: string;
  progress: number;
}

const CourseCard: React.FC<CourseCardProps> = ({ title, professor, progress }) => {
  return (
    <div className="bg-white p-5 rounded-xl shadow-md transition hover:shadow-lg">
      <h3 className="font-semibold text-gray-800">{title}</h3>
      <p className="text-sm text-gray-500">{professor}</p>
      <div className="mt-2">
        <p className="text-sm text-gray-600">{progress}% Completed</p>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
          <div
            className="bg-blue-500 h-2.5 rounded-full"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
      <button className="mt-4 w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2 rounded-lg 
                    font-medium transition hover:shadow-lg hover:brightness-110 active:scale-95 
                    focus:ring-2 focus:ring-blue-300">
        Continue
        </button>
    </div>
  );
};

export default CourseCard;