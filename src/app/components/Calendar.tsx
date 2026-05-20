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

const ICON_OPTIONS = [
  { emoji: '💩', label: '大便' },
  { emoji: '🏃', label: '跑步' },
  { emoji: '🏸', label: '羽毛球' },
  { emoji: '☕', label: '咖啡' },
  { emoji: '🍜', label: '吃饭' },
  { emoji: '🛒', label: '购物' },
  { emoji: '🎬', label: '电影' },
  { emoji: '💤', label: '睡觉' },
];

export default function Calendar({ selectedDate, onSelectDate, expenses }: CalendarProps) {
  const [year, setYear] = useState(selectedDate.getFullYear());
  const [month, setMonth] = useState(selectedDate.getMonth());
  const [dateIcons, setDateIcons] = useState<Record<string, string[]>>({});
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [selectedDayForIcon, setSelectedDayForIcon] = useState<number | null>(null);
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('calendarIcons');
    if (saved) {
      const parsed = JSON.parse(saved);
      // 迁移旧格式单个字符串到新格式数组
      const migrated: Record<string, string[]> = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === 'string') {
          migrated[key] = [value];
        } else if (Array.isArray(value)) {
          migrated[key] = value;
        }
      }
      setDateIcons(migrated);
    }
  }, []);

  const saveIcons = (icons: Record<string, string[]>) => {
    localStorage.setItem('calendarIcons', JSON.stringify(icons));
    setDateIcons(icons);
  };

  const getDateIcons = (day: number) => {
    const dateStr = formatDate(new Date(year, month, day));
    return dateIcons[dateStr] || [];
  };

  const MAX_ICONS_PER_DAY = 8;

  const handleDayClick = (day: number) => {
    selectDay(day);
  };

  const handleDayDoubleClick = (day: number) => {
    setSelectedDayForIcon(day);
    setShowIconPicker(true);
  };

  const handleIconSelect = (emoji: string) => {
    if (selectedDayForIcon !== null) {
      const dateStr = formatDate(new Date(year, month, selectedDayForIcon));
      const currentIcons = dateIcons[dateStr] || [];
      if (currentIcons.length >= MAX_ICONS_PER_DAY) {
        return; // 已达上限
      }
      if (currentIcons.includes(emoji)) {
        return; // 已存在
      }
      const newIcons = { ...dateIcons, [dateStr]: [...currentIcons, emoji] };
      saveIcons(newIcons);
    }
  };

  const handleIconToggle = (emoji: string) => {
    if (selectedDayForIcon === null) return;
    const dateStr = formatDate(new Date(year, month, selectedDayForIcon));
    const currentIcons = dateIcons[dateStr] || [];

    if (currentIcons.includes(emoji)) {
      // 已选则移除
      const newIcons = { ...dateIcons, [dateStr]: currentIcons.filter(e => e !== emoji) };
      saveIcons(newIcons);
    } else if (currentIcons.length < MAX_ICONS_PER_DAY) {
      // 未选且未达上限则添加
      const newIcons = { ...dateIcons, [dateStr]: [...currentIcons, emoji] };
      saveIcons(newIcons);
    }
  };

  const handleCloseIconPicker = () => {
    setShowIconPicker(false);
    setSelectedDayForIcon(null);
  };

  const handleIconRemove = (emoji: string) => {
    if (selectedDayForIcon !== null) {
      const dateStr = formatDate(new Date(year, month, selectedDayForIcon));
      const currentIcons = dateIcons[dateStr] || [];
      const newIcons = { ...dateIcons, [dateStr]: currentIcons.filter(e => e !== emoji) };
      saveIcons(newIcons);
    }
  };

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

  const getDayExpenseAmount = (day: number) => {
    const dateStr = formatDate(new Date(year, month, day));
    const dayExpenses = expenses.filter(e => e.date === dateStr);
    return dayExpenses.reduce((sum, e) => sum + e.amount, 0);
  };

  return (
    <div>
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

      <div className="grid grid-cols-7 gap-2">
        {days.map((day, index) => (
          <div key={index} className="min-h-[3.5rem] p-1">
            {day !== null && (
              <div className="relative w-full h-full">
                <button
                  onClick={() => handleDayClick(day)}
                  onDoubleClick={() => handleDayDoubleClick(day)}
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
                  <span className="text-lg font-medium relative z-10">{day}</span>
                  {hasExpense(day) && (
                    <span
                      className="absolute bottom-0.5 w-1.5 h-1.5 rounded-full"
                      style={{ background: isSelected(day) ? 'white' : 'var(--color-vermilion)' }}
                    />
                  )}
                </button>
                {getDateIcons(day).length > 0 && (
                  <div
                    className="absolute -top-0.5 -right-0.5 flex gap-0.5"
                    onMouseEnter={() => setHoveredIcon(getDateIcons(day)[0])}
                    onMouseLeave={() => setHoveredIcon(null)}
                  >
                    {getDateIcons(day).slice(0, 3).map((emoji, i) => (
                      <span key={i} className="text-xs">{emoji}</span>
                    ))}
                  </div>
                )}
                {hoveredIcon && getDateIcons(day).includes(hoveredIcon) && (
                  <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 text-xs rounded whitespace-nowrap"
                    style={{ background: 'var(--color-ink)', color: 'white' }}>
                    {ICON_OPTIONS.find(o => o.emoji === hoveredIcon)?.label}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {showIconPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowIconPicker(false)}>
          <div className="bg-white rounded-xl p-6 shadow-xl max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4 text-center">选择图标</h3>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {ICON_OPTIONS.map(option => {
                const isSelected = selectedDayForIcon && getDateIcons(selectedDayForIcon).includes(option.emoji);
                const isDisabled = !isSelected && !!selectedDayForIcon && getDateIcons(selectedDayForIcon).length >= MAX_ICONS_PER_DAY;
                return (
                  <button
                    key={option.emoji}
                    onClick={() => handleIconToggle(option.emoji)}
                    className={`text-3xl p-3 rounded-lg transition-all flex items-center justify-center
                      ${isSelected ? 'bg-green-100 ring-2 ring-green-400' : ''}
                      ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100'}`}
                    title={option.label}
                    disabled={isDisabled}
                  >
                    {option.emoji}
                  </button>
                );
              })}
            </div>
            {selectedDayForIcon && getDateIcons(selectedDayForIcon).length > 0 && (
              <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-2">已选 ({getDateIcons(selectedDayForIcon).length}/{MAX_ICONS_PER_DAY})</div>
                <div className="flex gap-2 flex-wrap">
                  {getDateIcons(selectedDayForIcon).map((emoji, i) => (
                    <div key={i} className="relative group">
                      <span className="text-xl">{emoji}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleIconRemove(emoji);
                        }}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleCloseIconPicker}
                className="flex-1 py-2 rounded-lg bg-vermilion text-white hover:opacity-90 transition-all"
                style={{ background: 'var(--color-vermilion)' }}
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}