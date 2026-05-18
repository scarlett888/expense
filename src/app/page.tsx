'use client';

import { useState, useEffect } from 'react';
import Calendar from './components/Calendar';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import { Expense } from '@/types/expense';

const STORAGE_KEY = 'expense-book-data';

export default function Home() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setExpenses(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  }, [expenses]);

  const handleAddExpense = (expense: Expense) => {
    setExpenses(prev => [...prev, expense]);
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">记账本</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
            <Calendar
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              expenses={expenses}
            />
          </div>

          <div className="bg-white border rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-medium mb-4">记账</h2>
            <ExpenseForm selectedDate={selectedDate} onAddExpense={handleAddExpense} />

            <div className="mt-6 pt-6 border-t">
              <h3 className="text-sm font-medium text-gray-500 mb-4">今日记录</h3>
              <ExpenseList expenses={expenses} selectedDate={selectedDate} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}