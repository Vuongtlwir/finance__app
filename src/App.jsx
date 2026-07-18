import { useState, useEffect, useCallback } from 'react';
import { format, startOfMonth, addMonths, subMonths } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  TrendingUp, TrendingDown, Wallet, Plus, X, Trash2, Edit3,
  ChevronLeft, ChevronRight, PieChart, BarChart3, Calendar,
  ArrowUpRight, ArrowDownRight, Search, Filter, XCircle,
  Download, Upload, CheckCircle2, AlertTriangle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart as RePieChart, Pie
} from 'recharts';
import {
  getTransactions, addTransaction, updateTransaction, deleteTransaction, saveTransactions,
  formatCurrency, getMonthTransactions, getMonthSummary, getTotalBalance, getDailySummary, getCategorySummary,
  exportToJSON, importFromJSON
} from './utils/storage';

const CATEGORIES = {
  income: ['Lương', 'Thưởng', 'Lãi suất', 'Quà tặng', 'Bán hàng', 'Đầu tư', 'Thuê nhà', 'Freelance', 'Hoàn tiền', 'Khác'],
  expense: ['Ăn uống', 'Di chuyển', 'Mua sắm', 'Giải trí', 'Y tế', 'Giáo dục', 'Nhà ở', 'Tiện ích', 'Quà tặng', 'Giao lưu', 'Bảo hiểm', 'Thuế', 'Khác']
};

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#4f46e5', '#7c3aed', '#818cf8', '#c084fc', '#e879f9', '#f472b6'];

function App() {
  const [transactions, setTransactions] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('expense');
  const [showForm, setShowForm] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [chartView, setChartView] = useState('daily');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState(null);
  const [importMsg, setImportMsg] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    setTransactions(getTransactions());
  }, []);

  const refresh = useCallback(() => {
    setTransactions(getTransactions());
  }, []);

  const monthTx = getMonthTransactions(transactions, year, month);
  const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const summary = { income, expense, balance: getTotalBalance(transactions) };
  const dailyData = getDailySummary(transactions, year, month);
  const incomeCategories = getCategorySummary(transactions, year, month, 'income');
  const expenseCategories = getCategorySummary(transactions, year, month, 'expense');

  const filteredTx = monthTx
    .filter(t => t.type === activeTab)
    .filter(t => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return t.note?.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const handleSave = (data) => {
    if (editTx) {
      updateTransaction(editTx.id, data);
    } else {
      addTransaction(data);
    }
    refresh();
    setShowForm(false);
    setEditTx(null);
  };

  const handleDelete = (id) => {
    if (confirm('Xóa giao dịch này?')) {
      deleteTransaction(id);
      refresh();
    }
  };

  const handleEdit = (tx) => {
    setEditTx(tx);
    setShowForm(true);
  };

  const handleExport = () => {
    exportToJSON(transactions);
  };

  const handleImportClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const data = await importFromJSON(file);
        setImportData(data);
        setShowImportModal(true);
      } catch (err) {
        setImportMsg({ type: 'error', text: err.message });
        setTimeout(() => setImportMsg(null), 3000);
      }
    };
    input.click();
  };

  const handleImportConfirm = (mode) => {
    if (mode === 'replace') {
      saveTransactions(importData);
    } else {
      const existing = getTransactions();
      const existingIds = new Set(existing.map(t => t.id));
      const newTx = importData.filter(t => !existingIds.has(t.id));
      saveTransactions([...existing, ...newTx]);
    }
    refresh();
    setShowImportModal(false);
    setImportData(null);
    setImportMsg({ type: 'success', text: 'Nhập dữ liệu thành công!' });
    setTimeout(() => setImportMsg(null), 3000);
  };

  return (
    <div className="min-h-dvh flex flex-col bg-[#0f0f1a]">
      <Header
        currentDate={currentDate}
        onPrev={() => setCurrentDate(subMonths(currentDate, 1))}
        onNext={() => setCurrentDate(addMonths(currentDate, 1))}
        onExport={handleExport}
        onImport={handleImportClick}
      />

      <SummaryCards summary={summary} />

      <div className="flex-1 px-5 pb-8">
        <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="flex gap-3 mt-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl pl-12 pr-4 py-3.5 text-base text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1">
                <XCircle className="w-5 h-5 text-slate-500" />
              </button>
            )}
          </div>
          <button
            onClick={() => setChartView(chartView === 'daily' ? 'category' : 'daily')}
            className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3.5 text-slate-400 hover:text-indigo-400 transition-colors shrink-0"
          >
            {chartView === 'daily' ? <BarChart3 className="w-6 h-6" /> : <PieChart className="w-6 h-6" />}
          </button>
        </div>

        <ChartSection
          view={chartView}
          dailyData={dailyData}
          categories={activeTab === 'income' ? incomeCategories : expenseCategories}
          activeTab={activeTab}
        />

        <TransactionList
          transactions={filteredTx}
          onEdit={handleEdit}
          onDelete={handleDelete}
          type={activeTab}
        />
      </div>

      <button
        onClick={() => { setEditTx(null); setShowForm(true); }}
        className="fixed bottom-8 right-5 z-40 w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 flex items-center justify-center active:scale-90 transition-transform"
      >
        <Plus className="w-7 h-7" />
      </button>

      {showForm && (
        <TransactionForm
          type={activeTab}
          editTx={editTx}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditTx(null); }}
        />
      )}

      {importMsg && (
        <div className={`fixed top-4 left-4 right-4 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${
          importMsg.type === 'success'
            ? 'bg-emerald-500/90 text-white'
            : 'bg-rose-500/90 text-white'
        }`}>
          {importMsg.type === 'success'
            ? <CheckCircle2 className="w-5 h-5 shrink-0" />
            : <AlertTriangle className="w-5 h-5 shrink-0" />
          }
          {importMsg.text}
        </div>
      )}

      {showImportModal && (
        <ImportModal
          count={importData?.length || 0}
          onReplace={() => handleImportConfirm('replace')}
          onMerge={() => handleImportConfirm('merge')}
          onClose={() => { setShowImportModal(false); setImportData(null); }}
        />
      )}
    </div>
  );
}

function Header({ currentDate, onPrev, onNext, onExport, onImport }) {
  return (
    <div className="sticky top-0 z-30 bg-[#0f0f1a]/90 backdrop-blur-xl border-b border-slate-800/60">
      <div className="px-5 pt-4 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Tài Chính</h1>
            <p className="text-sm text-slate-500">Quản lý thu chi cá nhân</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onImport} className="p-2.5 text-slate-400 hover:text-emerald-400 transition-colors rounded-xl bg-slate-800/60 border border-slate-700/50 min-w-[44px] min-h-[44px] flex items-center justify-center" title="Nhập dữ liệu">
              <Upload className="w-5 h-5" />
            </button>
            <button onClick={onExport} className="p-2.5 text-slate-400 hover:text-indigo-400 transition-colors rounded-xl bg-slate-800/60 border border-slate-700/50 min-w-[44px] min-h-[44px] flex items-center justify-center" title="Xuất dữ liệu">
              <Download className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1 bg-slate-800/60 rounded-xl border border-slate-700/50 p-1">
              <button onClick={onPrev} className="p-2.5 text-slate-400 hover:text-white transition-colors rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="px-3 text-base font-semibold text-white min-w-[110px] text-center">
                {format(currentDate, 'MM/yyyy', { locale: vi })}
              </span>
              <button onClick={onNext} className="p-2.5 text-slate-400 hover:text-white transition-colors rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCards({ summary }) {
  return (
    <div className="px-5 py-5 grid grid-cols-3 gap-3">
      <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <ArrowDownRight className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-xs font-medium text-emerald-400/80 uppercase tracking-wide">Thu</span>
        </div>
        <p className="text-sm font-bold text-emerald-300 leading-tight">{formatCurrency(summary.income)}</p>
      </div>

      <div className="bg-gradient-to-br from-rose-500/20 to-rose-600/10 border border-rose-500/20 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-xl bg-rose-500/20 flex items-center justify-center">
            <ArrowUpRight className="w-4 h-4 text-rose-400" />
          </div>
          <span className="text-xs font-medium text-rose-400/80 uppercase tracking-wide">Chi</span>
        </div>
        <p className="text-sm font-bold text-rose-300 leading-tight">{formatCurrency(summary.expense)}</p>
      </div>

      <div className={`bg-gradient-to-br ${summary.balance >= 0 ? 'from-indigo-500/20 to-indigo-600/10 border-indigo-500/20' : 'from-amber-500/20 to-amber-600/10 border-amber-500/20'} border rounded-2xl p-4`}>
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-8 h-8 rounded-xl ${summary.balance >= 0 ? 'bg-indigo-500/20' : 'bg-amber-500/20'} flex items-center justify-center`}>
            <Wallet className={`w-4 h-4 ${summary.balance >= 0 ? 'text-indigo-400' : 'text-amber-400'}`} />
          </div>
          <span className={`text-xs font-medium ${summary.balance >= 0 ? 'text-indigo-400/80' : 'text-amber-400/80'} uppercase tracking-wide`}>Dư</span>
        </div>
        <p className={`text-sm font-bold leading-tight ${summary.balance >= 0 ? 'text-indigo-300' : 'text-amber-300'}`}>{formatCurrency(summary.balance)}</p>
      </div>
    </div>
  );
}

function Tabs({ activeTab, setActiveTab }) {
  return (
    <div className="flex bg-slate-800/40 rounded-xl p-1.5 border border-slate-700/30">
      <button
        onClick={() => setActiveTab('income')}
        className={`flex-1 py-3.5 rounded-lg text-base font-semibold transition-all min-h-[48px] ${
          activeTab === 'income'
            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <span className="flex items-center justify-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Thu nhập
        </span>
      </button>
      <button
        onClick={() => setActiveTab('expense')}
        className={`flex-1 py-3.5 rounded-lg text-base font-semibold transition-all min-h-[48px] ${
          activeTab === 'expense'
            ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-500/25'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <span className="flex items-center justify-center gap-2">
          <TrendingDown className="w-5 h-5" />
          Chi tiêu
        </span>
      </button>
    </div>
  );
}

function ChartSection({ view, dailyData, categories, activeTab }) {
  const hasData = view === 'daily'
    ? dailyData.some(d => d.income > 0 || d.expense > 0)
    : categories.length > 0;

  if (!hasData) return null;

  return (
    <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-4 mb-4">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        {view === 'daily' ? 'Biểu đồ theo ngày' : 'Phân bổ theo danh mục'}
      </h3>
      {view === 'daily' ? (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={dailyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, fontSize: 12 }}
              formatter={(value) => formatCurrency(value)}
              labelFormatter={(label) => `Ngày ${label}`}
            />
            <Bar dataKey="income" fill="#34d399" radius={[4, 4, 0, 0]} name="Thu" />
            <Bar dataKey="expense" fill="#fb7185" radius={[4, 4, 0, 0]} name="Chi" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center gap-4">
          <ResponsiveContainer width="50%" height={160}>
            <RePieChart>
              <Pie
                data={categories}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={65}
                paddingAngle={3}
                dataKey="value"
              >
                {categories.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, fontSize: 12 }}
                formatter={(value) => formatCurrency(value)}
              />
            </RePieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-2">
            {categories.slice(0, 5).map((cat, i) => (
              <div key={cat.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-xs text-slate-300 flex-1 truncate">{cat.name}</span>
                <span className="text-[10px] text-slate-500">{((cat.value / categories.reduce((s, c) => s + c.value, 0)) * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TransactionList({ transactions, onEdit, onDelete, type }) {
  const grouped = {};
  transactions.forEach(tx => {
    const date = tx.date.split('T')[0];
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(tx);
  });

  if (transactions.length === 0) {
    return (
      <div className="text-center py-16">
        <div className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-5 ${type === 'income' ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
          {type === 'income'
            ? <TrendingUp className="w-10 h-10 text-emerald-500/40" />
            : <TrendingDown className="w-10 h-10 text-rose-500/40" />
          }
        </div>
        <p className="text-base text-slate-500">Chưa có giao dịch nào</p>
        <p className="text-sm text-slate-600 mt-2">Nhấn + để thêm giao dịch mới</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {Object.entries(grouped).map(([date, txs]) => (
        <div key={date}>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-400">
              {format(new Date(date + 'T00:00:00'), 'EEEE, dd/MM', { locale: vi })}
            </span>
          </div>
          <div className="space-y-3">
            {txs.map(tx => (
              <div
                key={tx.id}
                className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-4 flex items-center gap-4 active:scale-[0.98] transition-transform"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  type === 'income' ? 'bg-emerald-500/15' : 'bg-rose-500/15'
                }`}>
                  <span className="text-xl">
                    {tx.category === 'Ăn uống' ? '🍜' :
                     tx.category === 'Di chuyển' ? '🚗' :
                     tx.category === 'Mua sắm' ? '🛒' :
                     tx.category === 'Giải trí' ? '🎮' :
                     tx.category === 'Y tế' ? '💊' :
                     tx.category === 'Giáo dục' ? '📚' :
                     tx.category === 'Nhà ở' ? '🏠' :
                     tx.category === 'Lương' ? '💰' :
                     tx.category === 'Thưởng' ? '🎁' :
                     tx.category === 'Đầu tư' ? '📈' :
                     type === 'income' ? '💵' : '💸'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-medium text-slate-200 truncate">{tx.note || tx.category}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {tx.category} · {format(new Date(tx.date), 'HH:mm')}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-base font-bold ${type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </p>
                  <div className="flex gap-1 mt-2 justify-end">
                    <button onClick={() => onEdit(tx)} className="p-2 text-slate-500 hover:text-indigo-400 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(tx.id)} className="p-2 text-slate-500 hover:text-rose-400 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TransactionForm({ type, editTx, onSave, onClose }) {
  const [formData, setFormData] = useState({
    type: editTx?.type || type,
    amount: editTx?.amount?.toString() || '',
    category: editTx?.category || '',
    note: editTx?.note || '',
    date: editTx?.date ? editTx.date.slice(0, 10) : format(new Date(), 'yyyy-MM-dd'),
    time: editTx?.date ? format(new Date(editTx.date), 'HH:mm') : format(new Date(), 'HH:mm'),
  });

  const categories = CATEGORIES[formData.type];
  const isValid = formData.amount && parseFloat(formData.amount) > 0 && formData.category;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;
    onSave({
      ...formData,
      amount: parseFloat(formData.amount),
      date: `${formData.date}T${formData.time}:00`,
      type: formData.type,
    });
  };

  const formatAmountInput = (val) => {
    const num = val.replace(/[^0-9]/g, '');
    setFormData(prev => ({ ...prev, amount: num }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#1a1a2e] border-t border-slate-700/50 rounded-t-3xl max-h-[90dvh] overflow-auto">
        <div className="sticky top-0 bg-[#1a1a2e] z-10 px-6 pt-5 pb-4 border-b border-slate-700/30">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">
              {editTx ? 'Sửa giao dịch' : 'Thêm giao dịch'}
            </h2>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex mt-4 bg-slate-800/60 rounded-lg p-1">
            <button
              onClick={() => setFormData(p => ({ ...p, type: 'income', category: '' }))}
              className={`flex-1 py-3 rounded-md text-sm font-semibold transition-all min-h-[44px] ${
                formData.type === 'income' ? 'bg-emerald-500 text-white' : 'text-slate-400'
              }`}
            >
              Thu nhập
            </button>
            <button
              onClick={() => setFormData(p => ({ ...p, type: 'expense', category: '' }))}
              className={`flex-1 py-3 rounded-md text-sm font-semibold transition-all min-h-[44px] ${
                formData.type === 'expense' ? 'bg-rose-500 text-white' : 'text-slate-400'
              }`}
            >
              Chi tiêu
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          <div>
            <label className="text-sm font-medium text-slate-400 mb-2 block">Số tiền (VND)</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={formData.amount ? Number(formData.amount).toLocaleString('vi-VN') : ''}
              onChange={e => formatAmountInput(e.target.value)}
              className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl px-5 py-4 text-3xl font-bold text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 text-center"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-400 mb-2 block">Ngày</label>
              <input
                type="date"
                value={formData.date}
                onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3.5 text-base text-white focus:outline-none focus:border-indigo-500/50 [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-400 mb-2 block">Giờ</label>
              <input
                type="time"
                value={formData.time}
                onChange={e => setFormData(p => ({ ...p, time: e.target.value }))}
                className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3.5 text-base text-white focus:outline-none focus:border-indigo-500/50 [color-scheme:dark]"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-400 mb-3 block">Danh mục</label>
            <div className="flex flex-wrap gap-2.5">
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, category: cat }))}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[42px] ${
                    formData.category === cat
                      ? formData.type === 'income'
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                        : 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
                      : 'bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-400 mb-2 block">Ghi chú</label>
            <input
              type="text"
              placeholder="Nhập nội dung giao dịch..."
              value={formData.note}
              onChange={e => setFormData(p => ({ ...p, note: e.target.value }))}
              className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl px-5 py-3.5 text-base text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          <button
            type="submit"
            disabled={!isValid}
            className={`w-full py-4 rounded-xl text-base font-bold transition-all min-h-[52px] ${
              isValid
                ? formData.type === 'income'
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 active:scale-[0.98]'
                  : 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-500/25 active:scale-[0.98]'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            {editTx ? 'Cập nhật' : 'Thêm giao dịch'}
          </button>
        </form>
      </div>
    </div>
  );
}

function ImportModal({ count, onReplace, onMerge, onClose }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-5">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#1a1a2e] border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
        <div className="text-center mb-5">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/15 flex items-center justify-center mb-4">
            <Upload className="w-7 h-7 text-indigo-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Nhập dữ liệu</h3>
          <p className="text-sm text-slate-400">Tìm thấy <span className="text-white font-semibold">{count}</span> giao dịch trong file</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={onMerge}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold text-base shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-transform"
          >
            Ghép vào dữ liệu hiện tại
          </button>
          <button
            onClick={onReplace}
            className="w-full py-3.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold text-base active:scale-[0.98] transition-transform"
          >
            Thay thế toàn bộ
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-slate-800/60 text-slate-400 font-medium text-sm active:scale-[0.98] transition-transform"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
