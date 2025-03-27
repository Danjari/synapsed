import React from "react";

interface CourseCardProps {
  title: string;
  professor: string;
  progress: number;
  link: string;
}

const CourseCard: React.FC<CourseCardProps> = ({ title, professor, progress, link }) => {
  return (
    <div className="bg-white-50 p-5 rounded-lg border border-emerald-50 hover:bg-emerald-50 transition-colors duration-200">
      <h3 className="font-semibold text-cyan-900 text-lg mb-1">{title}</h3>
      <p className="text-sm text-grey-600">{professor}</p>
      <div className="mt-3">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm text-cyan-700">{progress}% Completed</p>
        </div>
        <div className="w-full bg-emerald-50 rounded-full h-1.5">
          <div
            className="bg-cyan-700 h-1.5 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
      <a href={link} className="mt-6 block text-center w-full bg-sky-950 text-purple-950 py-3 px-4 rounded-lg
                 font-semibold transition-colors hover:bg-sky-900
                 focus:outline-none focus:ring-2 focus:ring-sky-700 focus:ring-offset-2
                 ">
        Continue
      </a>

    </div>
  );
};

export default CourseCard;