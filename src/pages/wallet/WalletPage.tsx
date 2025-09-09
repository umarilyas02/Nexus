import React, { useState } from "react";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { ArrowUp, ArrowDown, RefreshCcw, CreditCard } from "lucide-react";

interface Transaction {
  id: number;
  type: "Deposit" | "Withdraw" | "Transfer" | "Funding";
  amount: string;
  date: string;
  status: "Completed" | "Pending" | "Failed";
}

export const WalletPage: React.FC = () => {
  const [balance, setBalance] = useState(12500.0);
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: 1, type: "Deposit", amount: "$5,000", date: "2025-09-01", status: "Completed" },
    { id: 2, type: "Withdraw", amount: "$2,000", date: "2025-09-03", status: "Completed" },
    { id: 3, type: "Transfer", amount: "$1,500", date: "2025-09-05", status: "Pending" },
    { id: 4, type: "Funding", amount: "$3,000", date: "2025-09-07", status: "Completed" },
  ]);

  const [depositAmount, setDepositAmount] = useState<number | "">("");
  const [withdrawAmount, setWithdrawAmount] = useState<number | "">("");
  const [transferAmount, setTransferAmount] = useState<number | "">("");

  const addTransaction = (type: Transaction["type"], amount: number, status: Transaction["status"] = "Completed") => {
    const newTx: Transaction = {
      id: transactions.length + 1,
      type,
      amount: `$${amount.toLocaleString()}`,
      date: new Date().toLocaleDateString(),
      status,
    };
    setTransactions([newTx, ...transactions]);
  };

  const handleAction = (type: Transaction["type"], inputAmount: number | "", defaultAmount: number) => {
    const amount = inputAmount ? Number(inputAmount) : defaultAmount;
    if (amount <= 0) {
      alert("Enter a valid amount");
      return;
    }

    if ((type === "Withdraw" || type === "Transfer") && amount > balance) {
      alert("Insufficient balance");
      return;
    }

    setBalance(prev => type === "Deposit" || type === "Funding" ? prev + amount : prev - amount);
    addTransaction(type, amount, type === "Transfer" ? "Pending" : "Completed");

    if (type === "Deposit") setDepositAmount("");
    if (type === "Withdraw") setWithdrawAmount("");
    if (type === "Transfer") setTransferAmount("");
  };

  const handleFunding = () => {
    const amount = 1000;
    setBalance(prev => prev + amount);
    addTransaction("Funding", amount);
  };

  const defaultDeposit = 500;
  const defaultWithdraw = 300;
  const defaultTransfer = 200;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto px-4">
      <h1 className="text-2xl font-bold text-gray-900">Wallet</h1>
      <p className="text-gray-600">Manage your funds and view transactions</p>

      {/* Balance & Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Balance */}
        <Card className="bg-primary-50 border-primary-100">
          <CardHeader>
            <h3 className="text-sm font-medium text-primary-700">Balance</h3>
          </CardHeader>
          <CardBody>
            <p className="text-2xl font-semibold text-primary-900">${balance.toLocaleString()}</p>
          </CardBody>
        </Card>

        {/* Deposit */}
        <Card className="bg-green-50 border-green-100">
          <CardBody className="flex flex-col items-center justify-center py-4 space-y-2">
            <ArrowDown size={24} className="text-green-700" />
            <input
              type="number"
              placeholder="Enter deposit"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.valueAsNumber || "")}
              className="w-full border border-green-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <div className="flex gap-2 w-full mt-2">
              <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleAction("Deposit", depositAmount, defaultDeposit)}>Deposit</Button>
              <Button className="flex-1 bg-green-100 text-white hover:bg-blue-700" onClick={() => handleAction("Deposit", "", defaultDeposit)}>Default ${defaultDeposit}</Button>
            </div>
          </CardBody>
        </Card>

        {/* Withdraw */}
        <Card className="bg-red-50 border-red-100">
          <CardBody className="flex flex-col items-center justify-center py-4 space-y-2">
            <ArrowUp size={24} className="text-red-700" />
            <input
              type="number"
              placeholder="Enter withdraw"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.valueAsNumber || "")}
              className="w-full border border-red-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="flex gap-2 w-full mt-2">
              <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={() => handleAction("Withdraw", withdrawAmount, defaultWithdraw)}>Withdraw</Button>
              <Button className="flex-1 bg-red-100 text-red-700 hover:bg-red-200" onClick={() => handleAction("Withdraw", "", defaultWithdraw)}>Default ${defaultWithdraw}</Button>
            </div>
          </CardBody>
        </Card>

        {/* Transfer */}
        <Card className="bg-blue-50 border-blue-100">
          <CardBody className="flex flex-col items-center justify-center py-4 space-y-2">
            <RefreshCcw size={24} className="text-blue-700" />
            <input
              type="number"
              placeholder="Enter transfer"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.valueAsNumber || "")}
              className="w-full border border-blue-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2 w-full mt-2">
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={() => handleAction("Transfer", transferAmount, defaultTransfer)}>Transfer</Button>
              <Button className="flex-1 bg-blue-100 text-blue-700 hover:bg-blue-200" onClick={() => handleAction("Transfer", "", defaultTransfer)}>Default ${defaultTransfer}</Button>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Funding Deal */}
      <Card className="border-primary-100">
        <CardHeader>
          <h3 className="text-lg font-medium text-gray-900">Funding Deal</h3>
        </CardHeader>
        <CardBody className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="text-gray-700">Simulate receiving a funding deal</p>
          <Button leftIcon={<CreditCard size={18} />} onClick={handleFunding}>
            Receive $1,000 Funding
          </Button>
        </CardBody>
      </Card>

      {/* Transaction History */}
      <Card className="border-gray-200">
        <CardHeader>
          <h3 className="text-lg font-medium text-gray-900">Transaction History</h3>
        </CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-700">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2">{tx.date}</td>
                    <td className="px-4 py-2">{tx.type}</td>
                    <td className="px-4 py-2">{tx.amount}</td>
                    <td className="px-4 py-2">
                      <Badge
                        variant={
                          tx.status === "Completed"
                            ? "success"
                            : tx.status === "Pending"
                            ? "accent"
                            : "destructive"
                        }
                      >
                        {tx.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
