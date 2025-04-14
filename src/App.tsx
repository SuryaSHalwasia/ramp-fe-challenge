import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import { InputSelect } from "./components/InputSelect"
import { Instructions } from "./components/Instructions"
import { Transactions } from "./components/Transactions"
import { useEmployees } from "./hooks/useEmployees"
import { usePaginatedTransactions } from "./hooks/usePaginatedTransactions"
import { useTransactionsByEmployee } from "./hooks/useTransactionsByEmployee"
import { EMPTY_EMPLOYEE } from "./utils/constants"
import { Employee } from "./utils/types"

export function App() {
  const { data: employees, ...employeeUtils } = useEmployees()
  const { data: paginatedTransactions, ...paginatedTransactionsUtils } = usePaginatedTransactions()
  const { data: transactionsByEmployee, ...transactionsByEmployeeUtils } = useTransactionsByEmployee()

  // ✅ Approval state map
  const [approvalMap, setApprovalMap] = useState<Record<string, boolean>>({})

  // ✅ Toggle approval
  const toggleApproval = useCallback((transactionId: string) => {
    setApprovalMap((prev) => ({
      ...prev,
      [transactionId]: !prev[transactionId],
    }))
  }, [])

  const transactions = useMemo(() => {
    const base = paginatedTransactions?.data ?? transactionsByEmployee ?? null
    if (!base) return null

    // Apply local approval state override
    return base.map((t) => ({
      ...t,
      approved: approvalMap[t.id] ?? t.approved,
    }))
  }, [paginatedTransactions, transactionsByEmployee, approvalMap])

  const loadAllTransactions = useCallback(async () => {
    transactionsByEmployeeUtils.invalidateData()
    await employeeUtils.fetchAll()
    await paginatedTransactionsUtils.fetchAll()
  }, [employeeUtils, paginatedTransactionsUtils, transactionsByEmployeeUtils])

  const loadTransactionsByEmployee = useCallback(async (employeeId: string) => {
    paginatedTransactionsUtils.invalidateData()
    await transactionsByEmployeeUtils.fetchById(employeeId)
  }, [paginatedTransactionsUtils, transactionsByEmployeeUtils])

  useEffect(() => {
    if (employees === null && !employeeUtils.loading) {
      loadAllTransactions()
    }
  }, [employeeUtils.loading, employees, loadAllTransactions])

  return (
    <Fragment>
      <main className="MainContainer">
        <Instructions />

        <hr className="RampBreak--l" />

        <InputSelect<Employee>
          isLoading={employeeUtils.loading}
          defaultValue={EMPTY_EMPLOYEE}
          items={employees === null ? [] : [EMPTY_EMPLOYEE, ...employees]}
          label="Filter by employee"
          loadingLabel="Loading employees"
          parseItem={(item) => ({
            value: item.id,
            label: `${item.firstName} ${item.lastName}`,
          })}
          onChange={async (newValue) => {
            if (newValue === null || newValue.id === EMPTY_EMPLOYEE.id) {
              await loadAllTransactions()
              return
            }

            await loadTransactionsByEmployee(newValue.id)
          }}
        />

        <div className="RampBreak--l" />

        <div className="RampGrid">
          <Transactions
            transactions={transactions}
            onToggleApproval={toggleApproval}
          />

          {paginatedTransactions?.data &&
            Array.isArray(paginatedTransactions.data) &&
            paginatedTransactions.nextPage !== null &&
            paginatedTransactions.data.length > 0 && (
              <button
                className="RampButton"
                disabled={paginatedTransactionsUtils.loading}
                onClick={async () => {
                  await loadAllTransactions()
                }}
              >
                View More
              </button>
          )}
        </div>
      </main>
    </Fragment>
  )
}
