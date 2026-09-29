import { useMemo, useState } from 'react'
import './App.css'

const DEFAULT_API_URL = 'http://localhost:8082/api/employees'

function employeeId(employee) {
  return employee?.id ?? employee?.employeeId ?? employee?.ID
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function App() {
  const [apiUrl, setApiUrl] = useState(
    () => localStorage.getItem('employee-api-url') || DEFAULT_API_URL,
  )
  const [employees, setEmployees] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [payload, setPayload] = useState('{}')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)

  const columns = useMemo(() => {
    const keys = [...new Set(employees.flatMap((employee) => Object.keys(employee || {})))]
    return keys.filter((key) => !['id', 'employeeId', 'ID'].includes(key)).slice(0, 3)
  }, [employees])

  async function request(path = '', options = {}) {
    const baseUrl = apiUrl.trim().replace(/\/+$/, '')
    if (!baseUrl) throw new Error('Enter the employees API URL first.')

    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
    const responseText = await response.text()
    let data = null

    if (responseText) {
      try {
        data = JSON.parse(responseText)
      } catch {
        data = responseText
      }
    }

    if (!response.ok) {
      const detail = typeof data === 'string' ? data : data?.message
      throw new Error(detail || `Request failed with status ${response.status}.`)
    }

    return data
  }

  async function runRequest(action, callback) {
    setBusy(true)
    setNotice(null)
    try {
      const result = await action()
      callback?.(result)
      setNotice({ type: 'success', text: 'Request completed successfully.' })
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Could not reach the API.' })
    } finally {
      setBusy(false)
    }
  }

  function saveApiUrl(value) {
    setApiUrl(value)
    localStorage.setItem('employee-api-url', value)
  }

  function loadEmployees() {
    runRequest(async () => {
      const result = await request()
      if (!Array.isArray(result)) throw new Error('Expected the API to return a list of employees.')
      return result
    }, setEmployees)
  }

  function selectEmployee(employee) {
    const id = employeeId(employee)
    setSelectedId(id == null ? '' : String(id))
    setPayload(JSON.stringify(employee, null, 2))
  }

  function getEmployee() {
    if (!selectedId.trim()) {
      setNotice({ type: 'error', text: 'Enter an employee ID to fetch.' })
      return
    }
    runRequest(() => request(`/${encodeURIComponent(selectedId.trim())}`), (employee) => {
      selectEmployee(employee)
    })
  }

  function saveEmployee(method) {
    let body
    try {
      body = JSON.parse(payload)
      if (!body || Array.isArray(body) || typeof body !== 'object') {
        throw new Error('The request body must be a JSON object.')
      }
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Check the JSON request body.' })
      return
    }

    const isUpdate = method === 'PUT'
    if (isUpdate && !selectedId.trim()) {
      setNotice({ type: 'error', text: 'Enter an employee ID before updating.' })
      return
    }

    const path = isUpdate ? `/${encodeURIComponent(selectedId.trim())}` : ''
    runRequest(
      () => request(path, { method, body: JSON.stringify(body) }),
      (employee) => {
        if (employee && typeof employee === 'object' && !Array.isArray(employee)) {
          selectEmployee(employee)
        }
        loadEmployees()
      },
    )
  }

  function deleteEmployee() {
    if (!selectedId.trim()) {
      setNotice({ type: 'error', text: 'Enter an employee ID before deleting.' })
      return
    }
    if (!window.confirm(`Delete employee ${selectedId}?`)) return

    runRequest(async () => {
      await request(`/${encodeURIComponent(selectedId.trim())}`, { method: 'DELETE' })
    }, () => {
      setSelectedId('')
      setPayload('{}')
      loadEmployees()
    })
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#employees" aria-label="People Desk home">
          <span className="brand-mark">P</span>
          <span>People Desk</span>
        </a>
        <span className="topbar-label">EMPLOYEE DIRECTORY</span>
      </header>

      <section className="page-heading" id="employees">
        <div>
          <p className="eyebrow">WORKSPACE / PEOPLE</p>
          <h1>Employees</h1>
          <p className="intro">Manage employee records through your REST API.</p>
        </div>
        <div className="record-count">
          <span className="count-number">{employees.length.toString().padStart(2, '0')}</span>
          <span>records loaded</span>
        </div>
      </section>

      <section className="api-bar" aria-label="API configuration">
        <div className="api-label"><span className="status-dot" /> API ENDPOINT</div>
        <input
          aria-label="Employees API base URL"
          value={apiUrl}
          onChange={(event) => saveApiUrl(event.target.value)}
          spellCheck="false"
        />
        <button className="button button-dark" onClick={loadEmployees} disabled={busy}>
          {busy ? 'Connecting...' : 'Connect'}
        </button>
      </section>

      {notice && (
        <div className={`notice notice-${notice.type}`} role="status">
          <span>{notice.type === 'error' ? '!' : '✓'}</span>
          {notice.text}
          <button aria-label="Dismiss message" onClick={() => setNotice(null)}>×</button>
        </div>
      )}

      <div className="workspace">
        <section className="directory-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">DIRECTORY</p>
              <h2>All employees</h2>
            </div>
            <button className="button button-light" onClick={loadEmployees} disabled={busy}>
              Refresh list
            </button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  {columns.map((column) => <th key={column}>{column}</th>)}
                  <th aria-label="Record actions" />
                </tr>
              </thead>
              <tbody>
                {employees.map((employee, index) => {
                  const id = employeeId(employee)
                  return (
                    <tr key={id ?? index} onClick={() => selectEmployee(employee)}>
                      <td className="id-cell">{formatValue(id ?? index + 1)}</td>
                      {columns.map((column) => <td key={column}>{formatValue(employee?.[column])}</td>)}
                      <td className="row-action"><button aria-label={`Edit employee ${id ?? index + 1}`}>↗</button></td>
                    </tr>
                  )
                })}
                {employees.length === 0 && (
                  <tr>
                    <td className="empty-state" colSpan={Math.max(columns.length + 2, 3)}>
                      <span className="empty-mark">0</span>
                      <strong>No employee records yet</strong>
                      <span>Connect to your API to load the directory.</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="table-footer">
            <span>Showing {employees.length} {employees.length === 1 ? 'record' : 'records'}</span>
            <span>Spring REST · JSON</span>
          </div>
        </section>

        <aside className="editor-panel">
          <div className="panel-heading editor-heading">
            <div>
              <p className="eyebrow">RECORD EDITOR</p>
              <h2>{selectedId ? 'Edit employee' : 'New employee'}</h2>
            </div>
            <span className="method-tag">JSON</span>
          </div>

          <label className="field-label" htmlFor="employee-id">EMPLOYEE ID <span>for read, update, delete</span></label>
          <div className="id-control">
            <input
              id="employee-id"
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              placeholder="e.g. 1042"
            />
            <button className="button button-light" onClick={getEmployee} disabled={busy}>Fetch</button>
          </div>

          <label className="field-label payload-label" htmlFor="employee-payload">REQUEST BODY <span>Employee object</span></label>
          <textarea
            id="employee-payload"
            value={payload}
            onChange={(event) => setPayload(event.target.value)}
            spellCheck="false"
            aria-label="Employee JSON request body"
          />
          <p className="editor-hint">Use the fields required by your Employee model. The returned API fields appear in the directory.</p>

          <div className="editor-actions">
            <button className="button button-accent" onClick={() => saveEmployee('POST')} disabled={busy}>＋ Create employee</button>
            <button className="button button-dark" onClick={() => saveEmployee('PUT')} disabled={busy}>Save changes</button>
            <button className="button button-danger" onClick={deleteEmployee} disabled={busy}>Delete</button>
          </div>
          <button className="text-button" onClick={() => { setSelectedId(''); setPayload('{}') }}>Clear editor</button>
        </aside>
      </div>

      <footer className="page-footer">
        <span>PEOPLE DESK <span className="footer-divider">/</span> API CLIENT</span>
        <span>Connected to <code>{apiUrl}</code></span>
      </footer>
    </main>
  )
}

export default App
