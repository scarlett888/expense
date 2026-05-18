'use client';

import { useState, useEffect } from 'react';
import { getMonthDays, getMonthName, formatDate } from '@/utils/date';
import { Expense } from '@/types/expense';

interface CalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  expenses: Expense[];
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

export default function Calendar({ selectedDate, onSelectDate, expenses }: CalendarProps) {
  const [year, setYear] = useState(selectedDate.getFullYear());
  const [month, setMonth] = useState(selectedDate.getMonth());

  useEffect(() => {
    setYear(selectedDate.getFullYear());
    setMonth(selectedDate.getMonth());
  }, [selectedDate]);

  const days = getMonthDays(year, month);

  const hasExpense = (day: number) => {
    const dateStr = formatDate(new Date(year, month, day));
    return expenses.some(e => e.date === dateStr);
  };

  const isSelected = (day: number) => {
    return (
      day === selectedDate.getDate() &&
      month === selectedDate.getMonth() &&
      year === selectedDate.getFullYear()
    );
  };

  const prevMonth = () => {
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else {
      setMonth(month + 1);
    }
  };

  const selectDay = (day: number) => {
    onSelectDate(new Date(year, month, day));
  };

  return (
    <div className="flex">
      <div className="w-24 border-r bg-gray-50">
        <div className="p-4">
          <div className="text-lg font-bold mb-2">{year}年</div>
          <div className="text-2xl font-bold text-blue-600">{getMonthName(month)}</div>
        </div>
        <div className="flex flex-col items-center justify-center h-32">
          <button onClick={prevMonth} className="text-gray-400 hover:text-gray-600">‹</button>
          <div className="h-16" />
          <button onClick={nextMonth} className="text-gray-400 hover:text-gray-600">›</button>
        </div>
      </div>

      <div className="flex-1 p-4">
        <div className="grid grid-cols-7 gap-2 mb-2">
          {WEEKDAYS.map(day => (
            <div key={day} className="text-center text-sm text-gray-500 font-medium py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map((day, index) => (
            <div key={index} className="aspect-square">
              {day !== null && (
                <button
                  onClick={() => selectDay(day)}
                  className={`w-full h-full flex flex-col items-center justify-center rounded-lg transition-colors ${
                    isSelected(day)
                      ? 'bg-blue-500 text-white'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <span className="text-sm">{day}</span>
                  {hasExpense(day) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1" />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}