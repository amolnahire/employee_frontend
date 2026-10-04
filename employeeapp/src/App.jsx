import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_STORAGE_KEY = 'transaction-platform-api-origin'
const DEFAULT_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8082'
const INITIAL_API_URL = localStorage.getItem(API_STORAGE_KEY) ?? DEFAULT_API_URL
const TODAY = new Date().toISOString().slice(0, 10)
const TODAY_LABEL = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()
const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', mark: '01' },
  { id: 'transactions', label: 'Transactions', mark: '02' },
  { id: 'employees', label: 'Employees', mark: '03' },
  { id: 'reports', label: 'Daily reports', mark: '04' },
]

const EMPTY_EMPLOYEE = { employeeId: '', name: '', department: '', email: '' }
const EMPTY_TRANSACTION = {
  employeeId: '', amount: '', category: '', transactionDate: TODAY, description: '',
}

async function requestApi(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl.replace(/\/+$/, '')}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  const text = await response.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }
  if (!response.ok) {
    const detail = typeof data === 'string'
      ? (data.trimStart().startsWith('<') ? null : data)
      : data?.message || data?.error
    throw new Error(detail || `Request failed with status ${response.status}.`)
  }
  return data
}

function asList(value) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.content)) return value.content
  if (Array.isArray(value?.data)) return value.data
  if (Array.isArray(value?.items)) return value.items
  return []
}

function recordId(record) {
  return record?.id ?? record?.ID ?? record?.transactionId
}

function money(value) {
  const amount = Number(value)
  return Number.isFinite(amount)
    ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
    : '—'
}

function displayDate(value) {
  if (!value) return '—'
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function App() {
  const [apiUrl, setApiUrl] = useState(INITIAL_API_URL)
  const [activeView, setActiveView] = useState('overview')
  const [employees, setEmployees] = useState([])
  const [transactions, setTransactions] = useState([])
  const [reports, setReports] = useState([])
  const [reportDetail, setReportDetail] = useState(null)
  const [reportDate, setReportDate] = useState(TODAY)
  const [employeeForm, setEmployeeForm] = useState(EMPTY_EMPLOYEE)
  const [transactionForm, setTransactionForm] = useState(EMPTY_TRANSACTION)
  const [editingId, setEditingId] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)

  const pendingCount = useMemo(
    () => transactions.filter((item) => String(item?.status || '').toUpperCase() === 'PENDING').length,
    [transactions],
  )
  const validCount = useMemo(
    () => transactions.filter((item) => ['VALID', 'PROCESSED'].includes(String(item?.status || '').toUpperCase())).length,
    [transactions],
  )
  const totalAmount = useMemo(
    () => transactions.reduce((sum, item) => sum + (Number(item?.amount) || 0), 0),
    [transactions],
  )
  const visibleTransactions = useMemo(() => statusFilter === 'ALL'
    ? transactions
    : transactions.filter((item) => String(item?.status || '').toUpperCase() === statusFilter),
  [transactions, statusFilter])

  async function loadWorkspace({ showNotice = true, manageBusy = true } = {}) {
    if (manageBusy) setBusy(true)
    if (showNotice) setNotice(null)
    const endpoints = [
      ['/api/employees', setEmployees],
      ['/api/transactions', setTransactions],
      ['/api/reports/daily', setReports],
    ]
    const results = await Promise.allSettled(
      endpoints.map(([path]) => requestApi(apiUrl, path)),
    )
    const failures = []
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') endpoints[index][1](asList(result.value))
      else failures.push(result.reason?.message || `Could not load ${endpoints[index][0]}.`)
    })
    if (showNotice) {
      setNotice(failures.length
        ? { type: 'error', text: failures[0] }
        : { type: 'success', text: 'Workspace data is up to date.' })
    }
    if (manageBusy) setBusy(false)
    return failures
  }

  useEffect(() => {
    let active = true
    const endpoints = ['/api/employees', '/api/transactions', '/api/reports/daily']
    Promise.allSettled(endpoints.map((path) => requestApi(INITIAL_API_URL, path))).then((results) => {
      if (!active) return
      const setters = [setEmployees, setTransactions, setReports]
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') setters[index](asList(result.value))
      })
      const firstFailure = results.find((result) => result.status === 'rejected')
      if (firstFailure) {
        setNotice({ type: 'error', text: firstFailure.reason?.message || 'Could not load workspace data.' })
      }
      setBusy(false)
    })
    return () => { active = false }
  }, [])

  function saveApiUrl(value) {
    setApiUrl(value)
    localStorage.setItem(API_STORAGE_KEY, value)
  }

  async function perform(action, successText, refresh = true) {
    setBusy(true)
    setNotice(null)
    try {
      const result = await action()
      if (refresh) await loadWorkspace({ showNotice: false, manageBusy: false })
      setNotice({ type: 'success', text: successText })
      return result ?? true
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Could not reach the API.' })
      return null
    } finally {
      setBusy(false)
    }
  }

  function clearEditor(kind) {
    setEditingId('')
    if (kind === 'employee') setEmployeeForm(EMPTY_EMPLOYEE)
    else setTransactionForm({ ...EMPTY_TRANSACTION, transactionDate: TODAY })
  }

  function editEmployee(employee) {
    setEditingId(String(recordId(employee) ?? ''))
    setEmployeeForm({
      employeeId: employee?.employeeId ?? '',
      name: employee?.name ?? '',
      department: employee?.department ?? '',
      email: employee?.email ?? '',
    })
  }

  function editTransaction(transaction) {
    setEditingId(String(recordId(transaction) ?? ''))
    setTransactionForm({
      employeeId: transaction?.employeeId ?? '',
      amount: transaction?.amount ?? '',
      category: transaction?.category ?? '',
      transactionDate: String(transaction?.transactionDate ?? TODAY).slice(0, 10),
      description: transaction?.description ?? '',
    })
  }

  async function saveEmployee(event) {
    event.preventDefault()
    const method = editingId ? 'PUT' : 'POST'
    const path = editingId ? `/api/employees/${encodeURIComponent(editingId)}` : '/api/employees'
    const saved = await perform(
      () => requestApi(apiUrl, path, { method, body: JSON.stringify(employeeForm) }),
      editingId ? 'Employee changes saved.' : 'Employee added to the directory.',
    )
    if (saved !== null) clearEditor('employee')
  }

  async function saveTransaction(event) {
    event.preventDefault()
    const method = editingId ? 'PUT' : 'POST'
    const path = editingId ? `/api/transactions/${encodeURIComponent(editingId)}` : '/api/transactions'
    const payload = { ...transactionForm, amount: Number(transactionForm.amount) }
    const saved = await perform(
      () => requestApi(apiUrl, path, { method, body: JSON.stringify(payload) }),
      editingId ? 'Transaction changes saved.' : 'Transaction submitted as pending.',
    )
    if (saved !== null) clearEditor('transaction')
  }

  async function deleteRecord(kind) {
    if (!editingId) return
    const label = kind === 'employee' ? 'employee' : 'transaction'
    if (!window.confirm(`Delete ${label} ${editingId}?`)) return
    const result = await perform(
      () => requestApi(apiUrl, `/api/${kind === 'employee' ? 'employees' : 'transactions'}/${encodeURIComponent(editingId)}`, { method: 'DELETE' }),
      `${label[0].toUpperCase()}${label.slice(1)} deleted.`,
    )
    if (result !== null) clearEditor(kind)
  }

  async function runBatch() {
    await perform(
      () => requestApi(apiUrl, '/api/batch/run', { method: 'POST' }),
      'Batch processing started.',
    )
  }

  async function loadReport(date = '') {
    const path = date
      ? `/api/reports/daily/${encodeURIComponent(date)}`
      : '/api/reports/daily'
    const result = await perform(() => requestApi(apiUrl, path), date ? `Report loaded for ${date}.` : 'Daily reports loaded.', false)
    if (result !== null) {
      if (date) setReportDetail(result)
      else setReports(asList(result))
    }
  }

  function setFormValue(setter, key, value) {
    setter((current) => ({ ...current, [key]: value }))
  }

  const currentTitle = NAV_ITEMS.find((item) => item.id === activeView)?.label || 'Overview'

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" onClick={() => setActiveView('overview')}>
          <span className="brand-mark">ET</span>
          <span className="brand-copy"><strong>Fieldwork</strong><small>TRANSACTION DESK</small></span>
        </a>
        <div className="nav-caption">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Workspace">
          {NAV_ITEMS.map((item) => (
            <button
              className={`nav-item ${activeView === item.id ? 'is-active' : ''}`}
              key={item.id}
              onClick={() => setActiveView(item.id)}
            >
              <span className="nav-mark">{item.mark}</span>
              <span>{item.label}</span>
              {item.id === 'transactions' && pendingCount > 0 && <span className="nav-count">{pendingCount}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="connection-indicator"><i /> API CLIENT</span>
          <span className="sidebar-version">SPRING BOOT · REST</span>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><span>WORKSPACE</span><b>/</b><strong>{currentTitle.toUpperCase()}</strong></div>
          <div className="topbar-tools">
            <label className="api-input-wrap" htmlFor="api-origin">
              <span>API</span>
              <input
                id="api-origin"
                aria-label="Backend API base URL"
                value={apiUrl}
                placeholder="http://localhost:8082"
                onChange={(event) => saveApiUrl(event.target.value)}
                spellCheck="false"
              />
            </label>
            <button className="button button-dark" onClick={() => loadWorkspace()} disabled={busy}>
              {busy ? 'Working…' : '↻ Refresh'}
            </button>
          </div>
        </header>

        {notice && (
          <div className={`notice notice-${notice.type}`} role="status">
            <span>{notice.type === 'error' ? '!' : '✓'}</span>
            {notice.text}
            <button aria-label="Dismiss message" onClick={() => setNotice(null)}>×</button>
          </div>
        )}

        {activeView === 'overview' && (
          <section className="page-content">
            <div className="page-heading">
              <div><p className="eyebrow">{TODAY_LABEL}</p><h1>Operations overview</h1><p className="intro">A clear view of employee spend and processing activity.</p></div>
              <button className="button button-accent" onClick={runBatch} disabled={busy}>▶ Run batch</button>
            </div>

            <div className="metric-grid">
              <Metric label="TRANSACTIONS" value={transactions.length} detail="All submitted records" tone="green" mark="TX" />
              <Metric label="AWAITING REVIEW" value={pendingCount} detail="Pending batch validation" tone="orange" mark="…" />
              <Metric label="VALIDATED" value={validCount} detail="Valid or processed" tone="blue" mark="✓" />
              <Metric label="TOTAL AMOUNT" value={money(totalAmount)} detail="Across all transactions" tone="pink" mark="AMT" />
            </div>

            <div className="overview-grid">
              <section className="data-panel transaction-overview">
                <PanelHeading eyebrow="LATEST ACTIVITY" title="Recent transactions" action={<button className="text-button" onClick={() => setActiveView('transactions')}>View all <span>↗</span></button>} />
                <TransactionTable rows={transactions.slice(0, 5)} onSelect={(item) => { editTransaction(item); setActiveView('transactions') }} compact />
              </section>
              <section className="data-panel batch-panel">
                <PanelHeading eyebrow="PROCESSING" title="Batch queue" />
                <div className="queue-number">{String(pendingCount).padStart(2, '0')}<span> pending</span></div>
                <p>Pending transactions are validated against employee records and amount rules.</p>
                <div className="queue-rule"><span>01</span><span>Employee exists</span><i className="rule-line" /></div>
                <div className="queue-rule"><span>02</span><span>Amount above zero</span><i className="rule-line" /></div>
                <button className="button button-dark batch-button" onClick={runBatch} disabled={busy}>▶ Start processing</button>
              </section>
            </div>
            <section className="data-panel summary-strip">
              <div><span className="summary-icon">EMP</span><strong>{employees.length}</strong><span>employees in directory</span></div>
              <div><span className="summary-icon summary-icon-lime">DAY</span><strong>{reports.length}</strong><span>daily summaries available</span></div>
              <button className="button button-light" onClick={() => setActiveView('reports')}>Open reports ↗</button>
            </section>
          </section>
        )}

        {activeView === 'employees' && (
          <section className="page-content">
            <div className="page-heading">
              <div><p className="eyebrow">PEOPLE / DIRECTORY</p><h1>Employees</h1><p className="intro">Manage the people associated with submitted transactions.</p></div>
              <span className="heading-count"><strong>{employees.length.toString().padStart(2, '0')}</strong> records</span>
            </div>
            <div className="resource-layout">
              <section className="data-panel resource-table-panel">
                <PanelHeading eyebrow="EMPLOYEE DIRECTORY" title="All employees" action={<button className="button button-light" onClick={() => loadWorkspace()} disabled={busy}>↻ Refresh</button>} />
                <div className="table-scroll"><table><thead><tr><th>EMPLOYEE</th><th>EMPLOYEE CODE</th><th>DEPARTMENT</th><th>EMAIL</th><th>ID</th></tr></thead>
                  <tbody>{employees.map((employee, index) => <tr key={recordId(employee) ?? index} className={String(recordId(employee)) === editingId ? 'selected-row' : ''} onClick={() => editEmployee(employee)}>
                    <td><span className="person-avatar">{String(employee?.name || '?').split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span><strong>{employee?.name || 'Unnamed employee'}</strong></td>
                    <td className="mono-cell">{employee?.employeeId || '—'}</td><td>{employee?.department || '—'}</td><td>{employee?.email || '—'}</td><td className="mono-cell">{recordId(employee) ?? '—'}</td>
                  </tr>)}{employees.length === 0 && <EmptyRow colSpan={5} loading={busy} label="No employees loaded" detail="Connect to your backend or add the first employee." />}</tbody>
                </table></div>
                <div className="table-footer"><span>{employees.length} {employees.length === 1 ? 'employee' : 'employees'}</span><span>GET /api/employees</span></div>
              </section>
              <form className="data-panel form-panel" onSubmit={saveEmployee}>
                <PanelHeading eyebrow={editingId ? `RECORD #${editingId}` : 'NEW RECORD'} title={editingId ? 'Edit employee' : 'Add employee'} action={editingId && <button className="icon-button" type="button" aria-label="Clear employee form" onClick={() => clearEditor('employee')}>×</button>} />
                <div className="form-fields">
                  <Field label="Employee code" required><input required value={employeeForm.employeeId} onChange={(event) => setFormValue(setEmployeeForm, 'employeeId', event.target.value)} placeholder="EMP1001" /></Field>
                  <Field label="Full name" required><input required value={employeeForm.name} onChange={(event) => setFormValue(setEmployeeForm, 'name', event.target.value)} placeholder="Jordan Lee" /></Field>
                  <Field label="Department" required><input required value={employeeForm.department} onChange={(event) => setFormValue(setEmployeeForm, 'department', event.target.value)} placeholder="Finance" /></Field>
                  <Field label="Email address" required><input type="email" required value={employeeForm.email} onChange={(event) => setFormValue(setEmployeeForm, 'email', event.target.value)} placeholder="jordan@company.com" /></Field>
                </div>
                <div className="form-actions"><button className="button button-accent" disabled={busy}>{editingId ? 'Save employee' : '+ Add employee'}</button>{editingId && <button type="button" className="button button-danger" onClick={() => deleteRecord('employee')} disabled={busy}>Delete</button>}</div>
                <p className="endpoint-hint">{editingId ? 'PUT' : 'POST'} /api/employees{editingId ? `/${editingId}` : ''}</p>
              </form>
            </div>
          </section>
        )}

        {activeView === 'transactions' && (
          <section className="page-content">
            <div className="page-heading">
              <div><p className="eyebrow">SPEND / ACTIVITY</p><h1>Transactions</h1><p className="intro">Review submissions, edit records, and run validation.</p></div>
              <button className="button button-accent" onClick={runBatch} disabled={busy}>▶ Run pending batch <span className="button-count">{pendingCount}</span></button>
            </div>
            <div className="transaction-summary"><span><b>{transactions.length}</b> total</span><i /><span><b>{pendingCount}</b> pending</span><i /><span><b>{money(totalAmount)}</b> submitted</span></div>
            <div className="resource-layout transaction-layout">
              <section className="data-panel resource-table-panel">
                <PanelHeading eyebrow="TRANSACTION LEDGER" title="All transactions" action={<label className="filter-wrap"><span>STATUS</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">All statuses</option><option value="PENDING">Pending</option><option value="VALID">Valid</option><option value="INVALID">Invalid</option><option value="PROCESSED">Processed</option></select></label>} />
                <TransactionTable rows={visibleTransactions} onSelect={editTransaction} />
                <div className="table-footer"><span>{visibleTransactions.length} of {transactions.length} transactions</span><span>GET /api/transactions</span></div>
              </section>
              <form className="data-panel form-panel" onSubmit={saveTransaction}>
                <PanelHeading eyebrow={editingId ? `RECORD #${editingId}` : 'NEW SUBMISSION'} title={editingId ? 'Edit transaction' : 'New transaction'} action={editingId && <button className="icon-button" type="button" aria-label="Clear transaction form" onClick={() => clearEditor('transaction')}>×</button>} />
                <div className="form-fields">
                  <Field label="Employee code" required><select required value={transactionForm.employeeId} onChange={(event) => setFormValue(setTransactionForm, 'employeeId', event.target.value)}><option value="">Choose employee</option>{employees.map((employee, index) => <option key={recordId(employee) ?? index} value={employee.employeeId}>{employee.employeeId} · {employee.name}</option>)}</select></Field>
                  <div className="field-row"><Field label="Amount" required><input type="number" min="0.01" step="0.01" required value={transactionForm.amount} onChange={(event) => setFormValue(setTransactionForm, 'amount', event.target.value)} placeholder="0.00" /></Field><Field label="Category" required><input required value={transactionForm.category} onChange={(event) => setFormValue(setTransactionForm, 'category', event.target.value)} placeholder="TRAVEL" /></Field></div>
                  <Field label="Transaction date" required><input type="date" required value={transactionForm.transactionDate} onChange={(event) => setFormValue(setTransactionForm, 'transactionDate', event.target.value)} /></Field>
                  <Field label="Description"><textarea rows="3" value={transactionForm.description} onChange={(event) => setFormValue(setTransactionForm, 'description', event.target.value)} placeholder="Add a short business purpose" /></Field>
                </div>
                <div className="form-actions"><button className="button button-accent" disabled={busy}>{editingId ? 'Save transaction' : '+ Submit transaction'}</button>{editingId && <button type="button" className="button button-danger" onClick={() => deleteRecord('transaction')} disabled={busy}>Delete</button>}</div>
                {!editingId && <p className="endpoint-hint">New submissions start with PENDING status.</p>}
              </form>
            </div>
          </section>
        )}

        {activeView === 'reports' && (
          <section className="page-content">
            <div className="page-heading">
              <div><p className="eyebrow">ANALYTICS / DAILY CLOSE</p><h1>Daily reports</h1><p className="intro">Summaries of validated employee transaction activity.</p></div>
              <div className="report-query"><input type="date" value={reportDate} onChange={(event) => setReportDate(event.target.value)} aria-label="Report date" /><button className="button button-dark" onClick={() => loadReport(reportDate)} disabled={busy}>Load date</button></div>
            </div>
            {reportDetail && <ReportDetail report={reportDetail} date={reportDate} />}
            <section className="data-panel report-panel">
              <PanelHeading eyebrow="SAVED SUMMARIES" title="Daily activity" action={<button className="button button-light" onClick={() => loadReport()} disabled={busy}>↻ Refresh reports</button>} />
              <div className="table-scroll"><table><thead><tr><th>REPORT DATE</th><th>TOTAL TRANSACTIONS</th><th>VALID</th><th>INVALID</th><th>TOTAL AMOUNT</th><th /></tr></thead>
                <tbody>{reports.map((report, index) => <tr key={recordId(report) ?? report?.reportDate ?? index}>
                  <td className="date-cell">{displayDate(report?.reportDate ?? report?.date)}</td><td>{report?.totalTransactions ?? '—'}</td><td><span className="status status-valid">{report?.validTransactions ?? '—'} valid</span></td><td><span className="status status-invalid">{report?.invalidTransactions ?? '—'} invalid</span></td><td className="amount-cell">{money(report?.totalAmount)}</td><td><button className="text-button" onClick={() => { const date = String(report?.reportDate ?? report?.date ?? '').slice(0, 10); if (date) { setReportDate(date); loadReport(date) } }}>Open ↗</button></td>
                </tr>)}{reports.length === 0 && <EmptyRow colSpan={6} loading={busy} label="No daily summaries yet" detail="Daily report records will appear here." />}</tbody>
              </table></div>
              <div className="table-footer"><span>{reports.length} saved summaries</span><span>GET /api/reports/daily</span></div>
            </section>
          </section>
        )}

        <footer className="page-footer"><span>FIELDWORK <i>/</i> EMPLOYEE TRANSACTION PLATFORM</span><span>BACKEND <code>{apiUrl || 'Same origin / Vite proxy'}</code></span></footer>
      </main>
    </div>
  )
}

function Metric({ label, value, detail, tone, mark }) {
  return <article className={`metric-card tone-${tone}`}><div className="metric-top"><span>{label}</span><i>{mark}</i></div><strong>{value}</strong><small>{detail}</small><span className="metric-rule" /></article>
}

function PanelHeading({ eyebrow, title, action }) {
  return <div className="panel-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>{action}</div>
}

function Field({ label, required, children }) {
  return <label className="field"><span>{label}{required && <b> *</b>}</span>{children}</label>
}

function EmptyRow({ colSpan, loading, label, detail }) {
  return <tr><td className="empty-row" colSpan={colSpan}><span className="empty-stamp">{loading ? '…' : '0'}</span><strong>{loading ? 'Loading records' : label}</strong><small>{detail}</small></td></tr>
}

function TransactionTable({ rows, onSelect, compact = false }) {
  return <div className="table-scroll"><table><thead><tr><th>REFERENCE</th><th>EMPLOYEE</th><th>{compact ? 'DATE' : 'CATEGORY'}</th>{!compact && <th>DATE</th>}<th>AMOUNT</th><th>STATUS</th></tr></thead>
    <tbody>{rows.map((item, index) => {
      const status = String(item?.status || 'PENDING').toLowerCase()
      return <tr key={recordId(item) ?? index} onClick={() => onSelect(item)}>
        <td className="mono-cell">TX-{String(recordId(item) ?? index + 1).padStart(4, '0')}</td><td><strong>{item?.employeeName || item?.employeeId || 'Unknown'}</strong></td><td>{compact ? displayDate(item?.transactionDate) : item?.category || '—'}</td>{!compact && <td>{displayDate(item?.transactionDate)}</td>}<td className="amount-cell">{money(item?.amount)}</td><td><span className={`status status-${status}`}>{item?.status || 'PENDING'}</span></td>
      </tr>
    })}{rows.length === 0 && <EmptyRow colSpan={compact ? 5 : 6} loading={false} label="No transactions found" detail="New submissions will appear here." />}</tbody>
  </table></div>
}

function ReportDetail({ report, date }) {
  const record = Array.isArray(report) ? report[0] : report
  if (!record || typeof record !== 'object') return null
  return <section className="report-detail"><div><p className="eyebrow">SELECTED DATE</p><strong>{displayDate(record.reportDate ?? date)}</strong></div><div><small>TRANSACTIONS</small><strong>{record.totalTransactions ?? '—'}</strong></div><div><small>VALID</small><strong>{record.validTransactions ?? '—'}</strong></div><div><small>INVALID</small><strong>{record.invalidTransactions ?? '—'}</strong></div><div><small>TOTAL AMOUNT</small><strong>{money(record.totalAmount)}</strong></div></section>
}

export default App