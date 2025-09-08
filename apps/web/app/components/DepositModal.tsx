import React, { useState } from 'react';
import { useDeposit } from '../hooks/useBalance';

interface DepositModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DepositModal: React.FC<DepositModalProps> = ({ isOpen, onClose }) => {
    const [symbol, setSymbol] = useState<'USDC' | 'BTC'>('USDC');
    const [amount, setAmount] = useState('');
    const depositMutation = useDeposit();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const depositAmount = parseFloat(amount);
        if (isNaN(depositAmount) || depositAmount <= 0) {
            return;
        }

        try {
            await depositMutation.mutateAsync({
                symbol,
                amount: depositAmount,
                decimals: symbol === 'USDC' ? 2 : 8
            });
            
            setAmount('');
            onClose();
        } catch (error) {
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/20 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Deposit Funds</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Asset
                        </label>
                        <select
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value as 'USDC' | 'BTC')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                            <option value="USDC">USDC</option>
                            <option value="BTC">BTC</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Amount
                        </label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Enter amount"
                            min="0"
                            step={symbol === 'USDC' ? '0.01' : '0.00000001'}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            required
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors cursor-pointer"
                            cursor-pointer
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={depositMutation.isPending || !amount}
                            className="flex-1 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            cursor-pointer
                        >
                            {depositMutation.isPending ? 'Depositing...' : 'Deposit'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DepositModal;
