import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'

const jsonResponse = (payload, init = {}) => ({
  ok: init.ok ?? true,
  status: init.status ?? 200,
  text: async () => JSON.stringify(payload),
  ...init,
})

const buildFetchMock = (employees, transactions, reports) => vi.fn((url) => {
  if (url.endsWith('/api/employees')) {
    return Promise.resolve(jsonResponse(employees))
  }
  if (url.endsWith('/api/transactions')) {
    return Promise.resolve(jsonResponse(transactions))
  }
  if (url.endsWith('/api/reports/daily')) {
    return Promise.resolve(jsonResponse(reports))
  }
  if (url.includes('/api/employees/') && url.includes('EMP1001')) {
    return Promise.resolve(jsonResponse({ employeeId: 'EMP1001', name: 'Jordan Lee', department: 'Finance', email: 'jordan@company.com' }))
  }
  return Promise.resolve(jsonResponse({ message: 'Not found' }, { ok: false, status: 404 }))
})

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads overview metrics and filters pending transactions', async () => {
    const employees = [{ employeeId: 'EMP1001', name: 'Jordan Lee', department: 'Finance', email: 'jordan@company.com' }]
    const transactions = [
      { id: 1, employeeId: 'EMP1001', employeeName: 'Jordan Lee', amount: 120.5, category: 'TRAVEL', transactionDate: '2025-02-11', status: 'PENDING' },
      { id: 2, employeeId: 'EMP1001', employeeName: 'Jordan Lee', amount: 85, category: 'SUPPLIES', transactionDate: '2025-02-10', status: 'VALID' },
    ]

    global.fetch.mockImplementation(buildFetchMock(employees, transactions, []))

    const user = userEvent.setup()
    render(<App />)

    await waitFor(() => expect(screen.getByText(/Operations overview/i)).toBeInTheDocument())

    const awaitingReview = screen.getByText(/AWAITING REVIEW/i).closest('.metric-card')
    expect(awaitingReview).not.toBeNull()
    expect(within(awaitingReview).getByText('1')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /transactions/i }))

    expect(screen.getByText(/TRANSACTION LEDGER/i)).toBeInTheDocument()
    expect(screen.getByText('TX-0001')).toBeInTheDocument()
    expect(screen.getByText('TX-0002')).toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: /status/i }), 'PENDING')

    await waitFor(() => {
      expect(screen.getByText('TX-0001')).toBeInTheDocument()
      expect(screen.queryByText('TX-0002')).not.toBeInTheDocument()
    })
  })

  it('adds an employee and submits the employee payload', async () => {
    const user = userEvent.setup()
    const employee = {
      employeeId: 'EMP1001',
      name: 'Jordan Lee',
      department: 'Finance',
      email: 'jordan@company.com',
    }

    global.fetch.mockImplementation((url, options) => {
      if (url.endsWith('/api/employees') && options?.method === 'POST') {
        return Promise.resolve(jsonResponse(employee))
      }
      if (url.endsWith('/api/employees')) {
        return Promise.resolve(jsonResponse([employee]))
      }
      if (url.endsWith('/api/transactions')) {
        return Promise.resolve(jsonResponse([]))
      }
      if (url.endsWith('/api/reports/daily')) {
        return Promise.resolve(jsonResponse([]))
      }
      return Promise.resolve(jsonResponse({ message: 'Not found' }, { ok: false, status: 404 }))
    })

    render(<App />)

    await waitFor(() => expect(screen.getByText(/Operations overview/i)).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /employees/i }))

    const employeeCodeInput = screen.getByRole('textbox', { name: /employee code/i })
    const nameInput = screen.getByRole('textbox', { name: /full name/i })
    const departmentInput = screen.getByRole('textbox', { name: /department/i })
    const emailInput = screen.getByRole('textbox', { name: /email address/i })

    await user.type(employeeCodeInput, 'EMP1001')
    await user.type(nameInput, 'Jordan Lee')
    await user.type(departmentInput, 'Finance')
    await user.type(emailInput, 'jordan@company.com')
    await user.click(screen.getByRole('button', { name: /add employee/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8082/api/employees',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            employeeId: 'EMP1001',
            name: 'Jordan Lee',
            department: 'Finance',
            email: 'jordan@company.com',
          }),
        }),
      )
    })
  })
})
