import { useState } from 'react';
import { workflowAPI, publicExecutionAPI } from '../lib/api';

export default function TestAPIPage() {
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [testType, setTestType] = useState<string>('');

    const runTest = async (testName: string, testFn: () => Promise<any>) => {
        setLoading(true);
        setError(null);
        setTestType(testName);
        try {
            const data = await testFn();
            setResult(data);
        } catch (err: any) {
            setError(err.message);
            setResult(null);
        } finally {
            setLoading(false);
        }
    };

    const tests = [
        {
            name: '列出所有工作流',
            description: 'GET /api/public/workflows',
            fn: () => workflowAPI.list(),
        },
        {
            name: '列出活跃工作流',
            description: 'GET /api/public/workflows?status=active',
            fn: () => workflowAPI.list({ status: 'active' }),
        },
        {
            name: '搜索工作流',
            description: 'GET /api/public/workflows?search=test',
            fn: () => workflowAPI.list({ search: 'test' }),
        },
        {
            name: '创建测试工作流',
            description: 'POST /api/public/workflows',
            fn: () => workflowAPI.create({
                name: 'API Test Workflow',
                description: 'Created from test page',
                status: 'draft',
                version: '1.0.0',
                definition: {
                    nodes: [
                        {
                            id: 'test-agent-1',
                            agentType: 'work',
                            agentCategory: 'work',
                            config: {},
                            order: 0,
                        },
                    ],
                    connections: [],
                },
                settings: {
                    maxConcurrentExecutions: 1,
                    executionTimeout: 300,
                    retryPolicy: {
                        enabled: false,
                        maxRetries: 3,
                        backoffStrategy: 'exponential',
                        backoffMs: 1000,
                    },
                    errorHandling: {
                        strategy: 'stop',
                        notifyOnError: true,
                    },
                    logging: {
                        level: 'info',
                        retention: 30,
                        includeData: true,
                    },
                },
                metadata: {
                    tags: ['test'],
                    category: 'general',
                },
            }),
        },
        {
            name: '列出所有执行',
            description: 'GET /api/executions',
            fn: () => executionAPI.list(),
        },
        {
            name: '测试后端健康',
            description: 'GET /health',
            fn: async () => {
                const response = await fetch('http://localhost:3001/health');
                return response.json();
            },
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">🧪 API 测试工具</h1>
                    <p className="text-gray-600">测试后端API端点和功能</p>
                </div>

                {/* Test Buttons */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">可用测试</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {tests.map((test) => (
                            <button
                                key={test.name}
                                onClick={() => runTest(test.name, test.fn)}
                                disabled={loading}
                                className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="font-semibold text-gray-900 mb-1">{test.name}</div>
                                <div className="text-xs text-gray-500">{test.description}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                        <div className="flex items-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                            <span className="text-blue-800">正在测试: {testType}...</span>
                        </div>
                    </div>
                )}

                {/* Error Display */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                        <h3 className="text-lg font-semibold text-red-800 mb-2">❌ 错误</h3>
                        <p className="text-red-700 font-mono text-sm">{error}</p>
                    </div>
                )}

                {/* Success Display */}
                {result && !loading && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-green-800">✅ 成功</h3>
                            <span className="text-sm text-green-600">测试: {testType}</span>
                        </div>

                        {/* Data Summary */}
                        <div className="mb-4 p-4 bg-white rounded border border-green-200">
                            <h4 className="font-semibold text-gray-900 mb-2">数据摘要</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-600">类型:</span>
                                    <span className="ml-2 font-mono text-blue-600">
                                        {Array.isArray(result) ? 'Array' : typeof result}
                                    </span>
                                </div>
                                {Array.isArray(result) && (
                                    <div>
                                        <span className="text-gray-600">长度:</span>
                                        <span className="ml-2 font-mono text-blue-600">{result.length}</span>
                                    </div>
                                )}
                                {result.workflows && (
                                    <div>
                                        <span className="text-gray-600">工作流数:</span>
                                        <span className="ml-2 font-mono text-blue-600">{result.workflows.length}</span>
                                    </div>
                                )}
                                {result.total !== undefined && (
                                    <div>
                                        <span className="text-gray-600">总数:</span>
                                        <span className="ml-2 font-mono text-blue-600">{result.total}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Raw JSON */}
                        <details className="cursor-pointer">
                            <summary className="font-semibold text-gray-900 mb-2 hover:text-blue-600">
                                查看原始JSON数据
                            </summary>
                            <pre className="text-xs bg-gray-900 text-green-400 p-4 rounded overflow-auto max-h-96 font-mono">
                                {JSON.stringify(result, null, 2)}
                            </pre>
                        </details>
                    </div>
                )}

                {/* API Info */}
                <div className="mt-8 bg-gray-100 rounded-lg p-6">
                    <h3 className="font-semibold text-gray-900 mb-3">📋 API 信息</h3>
                    <div className="space-y-2 text-sm">
                        <div>
                            <span className="text-gray-600">后端地址:</span>
                            <span className="ml-2 font-mono text-blue-600">http://localhost:3001</span>
                        </div>
                        <div>
                            <span className="text-gray-600">WebSocket:</span>
                            <span className="ml-2 font-mono text-blue-600">ws://localhost:3001/api/ws</span>
                        </div>
                        <div>
                            <span className="text-gray-600">公共API前缀:</span>
                            <span className="ml-2 font-mono text-blue-600">/api/public</span>
                        </div>
                    </div>
                </div>

                {/* Quick Links */}
                <div className="mt-6 flex gap-4">
                    <a
                        href="/workflows"
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    >
                        返回工作流列表
                    </a>
                    <a
                        href="/"
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                    >
                        返回首页
                    </a>
                </div>
            </div>
        </div>
    );
}
