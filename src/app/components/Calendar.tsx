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
  const today = new Date();

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

  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
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

  // Get expense amount for a specific day
  const getDayExpenseAmount = (day: number) => {
    const dateStr = formatDate(new Date(year, month, day));
    const dayExpenses = expenses.filter(e => e.date === dateStr);
    return dayExpenses.reduce((sum, e) => sum + e.amount, 0);
  };

  return (
    <div>
      {/* Month Header with navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={prevMonth}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-gray-100"
            style={{ color: 'var(--color-ink-light)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div className="text-center">
            <div className="text-sm sidenote">{year}年</div>
            <div className="header-title text-2xl" style={{ color: 'var(--color-vermilion)' }}>
              {getMonthName(month)}
            </div>
          </div>

          <button
            onClick={nextMonth}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-gray-100"
            style={{ color: 'var(--color-ink-light)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        <button
          onClick={() => {
            setYear(today.getFullYear());
            setMonth(today.getMonth());
            onSelectDate(today);
          }}
          className="btn-secondary text-sm"
        >
          今天
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map((day, i) => (
          <div
            key={day}
            className="text-center py-2 sidenote"
            style={{
              color: i === 5 || i === 6 ? 'var(--color-vermilion)' : 'var(--color-ink-light)'
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => (
          <div key={index} className="aspect-square p-1">
            {day !== null && (
              <button
                onClick={() => selectDay(day)}
                className={`
                  w-full h-full flex flex-col items-center justify-center rounded-lg transition-all relative
                  ${isSelected(day) ? 'selected' : ''}
                  ${isToday(day) && !isSelected(day) ? 'today' : ''}
                  ${hasExpense(day) ? 'has-expense' : ''}
                `}
                style={{
                  background: isSelected(day) ? 'var(--color-vermilion)' : 'transparent',
                  color: isSelected(day) ? 'white' : 'var(--color-ink)'
                }}
              >
                <span className="text-sm font-medium">{day}</span>
                {hasExpense(day) && !isSelected(day) && (
                  <span
                    className="absolute bottom-1 w-1 h-1 rounded-full"
                    style={{ background: 'var(--color-vermilion)' }}
                  />
                )}
                {hasExpense(day) && isSelected(day) && (
                  <span
                    className="absolute bottom-1 w-1 h-1 rounded-full"
                    style={{ background: 'white' }}
                  />
                )}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Selected date expense summary */}
      <div
        className="mt-6 p-4 rounded-lg"
        style={{ background: 'var(--color-cream)' }}
      >
        <div className="flex justify-between items-center">
          <span className="sidenote">选中日期</span>
          <span className="font-medium">{formatDate(selectedDate)}</span>
        </div>
        {hasExpense(selectedDate.getDate()) && (
          <div className="flex justify-between items-center mt-2 pt-2" style={{ borderTop: '1px dashed var(--color-paper)' }}>
            <span className="sidenote">当日支出</span>
            <span className="font-medium" style={{ color: 'var(--color-vermilion)' }}>
              ¥{getDayExpenseAmount(selectedDate.getDate()).toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}