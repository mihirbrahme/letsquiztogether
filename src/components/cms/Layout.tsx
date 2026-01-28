import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { LayoutDashboard, Play, Library } from 'lucide-react';
import { cn } from '../../utils';
import { Button } from '../shared/Button';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const [adminToken, setAdminToken] = useState('');
    const [inputToken, setInputToken] = useState('');

    useEffect(() => {
        const urlToken = searchParams.get('admin');
        if (urlToken && typeof window !== 'undefined') {
            localStorage.setItem('adminToken', urlToken);
            setAdminToken(urlToken);
        }
    }, [searchParams]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const stored = localStorage.getItem('adminToken') || '';
        setAdminToken(stored);
    }, []);

    const hasAccess = useMemo(() => Boolean(adminToken), [adminToken]);

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
        { icon: Library, label: 'Library', path: '/library' },
        // { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    if (!hasAccess) {
        return (
            <div className="flex h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50 text-gray-900 items-center justify-center">
                <div className="bg-white/90 border border-orange-100/60 rounded-2xl shadow-xl p-8 max-w-lg w-full">
                    <h1 className="text-2xl font-bold text-gray-900">Admin access required</h1>
                    <p className="text-sm text-gray-500 mt-2">
                        Paste your admin token or open the admin link with <span className="font-semibold">?admin=TOKEN</span>.
                    </p>
                    <div className="mt-6 space-y-3">
                        <input
                            type="text"
                            placeholder="Admin token"
                            className="w-full px-4 py-2 rounded-lg border border-gray-200"
                            value={inputToken}
                            onChange={(e) => setInputToken(e.target.value)}
                        />
                        <Button
                            variant="primary"
                            className="w-full"
                            onClick={() => {
                                if (!inputToken.trim()) return;
                                localStorage.setItem('adminToken', inputToken.trim());
                                setAdminToken(inputToken.trim());
                                setInputToken('');
                            }}
                        >
                            Unlock CMS
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50 text-gray-900">
            {/* Sidebar */}
            <aside className="w-64 bg-white/90 backdrop-blur border-r border-orange-100/60 flex flex-col">
                <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                    <img src="/logo.svg" alt="Lets Quiz Together logo" className="w-10 h-10" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Lets Quiz Together
                        </h1>
                        <p className="text-xs text-gray-500 mt-1">CMS & Presenter</p>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => (
                        <Link key={item.path} to={item.path}>
                            <div className={cn(
                                "flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                                location.pathname === item.path
                                    ? "bg-gradient-to-r from-indigo-100 to-fuchsia-100 text-indigo-700"
                                    : "text-gray-600 hover:bg-orange-50"
                            )}>
                                <item.icon className="w-5 h-5 mr-3" />
                                {item.label}
                            </div>
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-200">
                    <Link to="/present" target="_blank">
                        <Button variant="primary" className="w-full justify-center">
                            <Play className="w-4 h-4 mr-2" />
                            Launch Presenter
                        </Button>
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <div className="max-w-7xl mx-auto p-8">
                    {children}
                </div>
            </main>
        </div>
    );
};
