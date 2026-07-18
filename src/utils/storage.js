const STORAGE_KEY = 'finance_transactions';

export function getTransactions() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveTransactions(transactions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

export function addTransaction(transaction) {
  const transactions = getTransactions();
  transactions.push({ ...transaction, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7) });
  saveTransactions(transactions);
  return transactions;
}

export function updateTransaction(id, updates) {
  const transactions = getTransactions();
  const idx = transactions.findIndex(t => t.id === id);
  if (idx !== -1) {
    transactions[idx] = { ...transactions[idx], ...updates };
    saveTransactions(transactions);
  }
  return transactions;
}

export function deleteTransaction(id) {
  const transactions = getTransactions().filter(t => t.id !== id);
  saveTransactions(transactions);
  return transactions;
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export function getMonthTransactions(transactions, year, month) {
  return transactions.filter(t => {
    const d = new Date(t.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

export function getMonthSummary(transactions, year, month) {
  const monthTx = getMonthTransactions(transactions, year, month);
  const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  return { income, expense, balance: income - expense };
}

export function getTotalBalance(transactions) {
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  return totalIncome - totalExpense;
}

export function getDailySummary(transactions, year, month) {
  const monthTx = getMonthTransactions(transactions, year, month);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const result = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayTx = monthTx.filter(t => t.date.startsWith(dayStr));
    result.push({
      day: d,
      income: dayTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      expense: dayTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    });
  }
  return result;
}

export function getCategorySummary(transactions, year, month, type) {
  const monthTx = getMonthTransactions(transactions, year, month).filter(t => t.type === type);
  const map = {};
  monthTx.forEach(t => {
    const cat = t.category || 'Khác';
    map[cat] = (map[cat] || 0) + t.amount;
  });
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function exportToJSON(transactions) {
  const data = {
    version: 1,
    exportDate: new Date().toISOString(),
    transactions,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `finance-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importFromJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.transactions || !Array.isArray(data.transactions)) {
          reject(new Error('File không hợp lệ'));
          return;
        }
        resolve(data.transactions);
      } catch {
        reject(new Error('File không hợp lệ'));
      }
    };
    reader.onerror = () => reject(new Error('Không đọc được file'));
    reader.readAsText(file);
  });
}
