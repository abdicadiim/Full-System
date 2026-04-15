import React from "react";
import {
  CALENDAR_DAYS_OF_WEEK,
  CALENDAR_MONTHS,
} from "./customerDetailConstants";

type CustomerDetailCalendarProps = {
  calendarMonth: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
};

const getDaysInMonth = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  return { daysInMonth, startingDayOfWeek, year, month };
};

export default function CustomerDetailCalendar({
  calendarMonth,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: CustomerDetailCalendarProps) {
  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(calendarMonth);
  const days: Array<{ day: number; isCurrentMonth: boolean; date: Date }> = [];

  const prevMonth = new Date(year, month, 0);
  const prevMonthDays = prevMonth.getDate();
  for (let i = startingDayOfWeek - 1; i >= 0; i -= 1) {
    days.push({
      day: prevMonthDays - i,
      isCurrentMonth: false,
      date: new Date(year, month - 1, prevMonthDays - i),
    });
  }

  for (let i = 1; i <= daysInMonth; i += 1) {
    days.push({
      day: i,
      isCurrentMonth: true,
      date: new Date(year, month, i),
    });
  }

  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i += 1) {
    days.push({
      day: i,
      isCurrentMonth: false,
      date: new Date(year, month + 1, i),
    });
  }

  const isSelected = (date: Date) =>
    date.getDate() === selectedDate.getDate() &&
    date.getMonth() === selectedDate.getMonth() &&
    date.getFullYear() === selectedDate.getFullYear();

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="w-full rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          className="rounded px-2 py-1 text-gray-600 hover:bg-gray-100"
          onClick={onPrevMonth}
        >
          «
        </button>
        <span className="text-sm font-semibold text-gray-900">
          {CALENDAR_MONTHS[month]} {year}
        </span>
        <button
          type="button"
          className="rounded px-2 py-1 text-gray-600 hover:bg-gray-100"
          onClick={onNextMonth}
        >
          »
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1">
        {CALENDAR_DAYS_OF_WEEK.map((day) => (
          <div key={day} className="py-1 text-center text-xs font-medium text-gray-600">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((dayObj, index) => (
          <button
            key={`${dayObj.date.toISOString()}-${index}`}
            type="button"
            className={`h-8 w-8 rounded text-xs transition-colors ${
              !dayObj.isCurrentMonth ? "text-gray-300" : "text-gray-700 hover:bg-gray-100"
            } ${isSelected(dayObj.date) ? "bg-blue-600 text-white hover:bg-blue-700" : ""} ${
              isToday(dayObj.date) && !isSelected(dayObj.date)
                ? "bg-blue-100 font-semibold text-blue-700"
                : ""
            }`}
            onClick={() => onSelectDate(dayObj.date)}
          >
            {dayObj.day}
          </button>
        ))}
      </div>
    </div>
  );
}
