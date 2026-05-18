'use client';

import { Expense } from '@/types/expense';
import { formatDate } from '@/utils/date';

interface ExpenseListProps {
  expenses: Expense[];
  selectedDate: Date;
}

export default function ExpenseList({ expenses, selectedDate }: ExpenseListProps) {
  const dateStr = formatDate(selectedDate);
  const dayExpenses = expenses.filter(e => e.date === dateStr);

  const total = dayExpenses.reduce((sum, e) => sum + e.amount, 0);

  if (dayExpenses.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        暂无记账记录
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center text-sm text-gray-500">
        <span>今日合计</span>
        <span className="font-medium text-blue-600">¥{total.toFixed(2)}</span>
      </div>

      <div className="space-y-2">
        {dayExpenses.map(expense => (
          <div key={expense.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium">{expense.note || '无备注'}</div>
              <div className="text-xs text-gray-400">
                {new Date(expense.createdAt).toLocaleTimeString()}
              </div>
            </div>
            <div className="font-medium text-red-500">
              -¥{expense.amount.toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}