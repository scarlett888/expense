'use client';

import { useState } from 'react';
import { formatDate } from '@/utils/date';
import { Expense } from '@/types/expense';

interface ExpenseFormProps {
  selectedDate: Date;
  onAddExpense: (expense: Expense) => void;
}

export default function ExpenseForm({ selectedDate, onAddExpense }: ExpenseFormProps) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    const expense: Expense = {
      id: Date.now().toString(),
      date: formatDate(selectedDate),
      amount: parseFloat(amount),
      note,
      createdAt: Date.now(),
    };

    onAddExpense(expense);
    setAmount('');
    setNote('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="text-sm text-gray-500 mb-1">日期</div>
        <div className="font-medium">{formatDate(selectedDate)}</div>
      </div>

      <div>
        <label className="block text-sm text-gray-500 mb-1">金额</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">¥</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full pl-8 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-500 mb-1">备注</label>
        <input
          type="text"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="早餐、午餐..."
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
      >
        记一笔
      </button>
    </form>
  );
}