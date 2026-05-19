'use client';

import { Expense } from '@/types/expense';
import { formatDate } from '@/utils/date';

interface ExpenseListProps {
  expenses: Expense[];
  selectedDate: Date;
  onDelete: (id: string) => void;
}

export default function ExpenseList({ expenses, selectedDate, onDelete }: ExpenseListProps) {
  const dateStr = formatDate(selectedDate);
  const dayExpenses = expenses.filter(e => e.date === dateStr);
  const total = dayExpenses.reduce((sum, e) => sum + e.amount, 0);

  if (dayExpenses.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'var(--color-cream)' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-sage)" strokeWidth="1.5">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="1" />
            <path d="M9 12h6" />
            <path d="M9 16h6" />
          </svg>
        </div>
        <p className="sidenote">今日暂无记账记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Total */}
      <div className="flex justify-between items-center p-3 rounded-lg" style={{ background: 'var(--color-cream)' }}>
        <span className="sidenote">合计</span>
        <span className="text-xl font-semibold" style={{ color: 'var(--color-vermilion)' }}>
          -¥{total.toFixed(2)}
        </span>
      </div>

      {/* Expense List */}
      <div className="space-y-2">
        {dayExpenses.map((expense, index) => (
          <div
            key={expense.id}
            className="expense-card group"
            style={{
              animation: `slideIn 0.3s ease-out ${index * 0.05}s both`
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--color-paper)' }}>
                <span className="text-sm" style={{ color: 'var(--color-ink-light)' }}>
                  {expense.note?.[0] || '记'}
                </span>
              </div>
              <div>
                <p className="font-medium">{expense.note || '无备注'}</p>
                <p className="sidenote">{new Date(expense.created_at).toLocaleTimeString()}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-semibold" style={{ color: 'var(--color-vermilion)' }}>
                -¥{expense.amount.toFixed(2)}
              </span>
              <button
                onClick={() => onDelete(expense.id)}
                className="w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50"
                style={{ color: 'var(--color-vermilion)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18" />
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      <style jsx global>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}