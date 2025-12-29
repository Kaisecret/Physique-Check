
import React, { useState, useCallback, useMemo, useEffect } from 'react';
// Changed from 'react-dropzone-esm' to 'react-dropzone' for better build compatibility
import { useDropzone } from 'react-dropzone';
import {
  PhysiqueAnalysisReport,
  WorkoutPlan,
  MealGuide,
  UserPreferences,
  UserProfile,
  HistoryItem,
  AppState
} from './types';
import { analyzePhysique, generatePlans } from './services/geminiService';
import RadarChartComponent from './components/RadarChartComponent';
import { Logo, UploadIcon, DumbbellIcon, PlateIcon, ChartIcon, SparklesIcon, ArrowPathIcon, UserCircleIcon, HomeIcon, ChartBarIcon, ClockIcon, ArrowLeftOnRectangleIcon, ChevronLeftIcon, ChevronRightIcon, Bars3Icon, XMarkIcon, ArrowUpIcon } from './components/Icons';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, LineChart, Line } from 'recharts';

const ACCENT_COLOR = '#31FF75';

// Storage Keys
const STORAGE_KEYS = {
    HISTORY: 'physique_history',
    PREFERENCES: 'physique_preferences',
    PROFILE: 'physique_profile',
    AUTH_STATE: 'physique_auth_state' // 'true' or null
};

// --- DEFAULT DATA ---
const defaultProfile: UserProfile = {
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    age: 25,
    sex: 'Male',
    height: 175,
    weight: 75,
    activityLevel: 'Moderately Active',
    avatar: ''
};

const defaultPreferences: UserPreferences = {
    goal: 'muscle gain',
    experience: 'beginner',
    equipment: 'gym',
    time: '45-60 min',
    enablePose: true,
    showLandmarks: false
};


// --- AUTH COMPONENTS ---

const AuthShell = ({ title, subtitle, children }: { title: string, subtitle: string, children: React.ReactNode }) => (
    <div className="bg-black flex items-center justify-center min-h-screen relative overflow-hidden text-white">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
            <div className="blob-green"></div>
            <div className="blob-blue"></div>
        </div>
        <div className="w-full max-w-lg p-8 z-10">
            <div className="text-center mb-8">
                <div className="inline-block mb-4">
                     <Logo className="w-12 h-12 text-white mx-auto" />
                </div>
                <h2 className="text-3xl font-bold">{title}</h2>
                <p className="text-gray-400 mt-2">{subtitle}</p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 shadow-2xl backdrop-blur-sm">
                {children}
            </div>
        </div>
    </div>
);

const LoginPage = ({ onLogin, onGoToSignup, onBack }: { onLogin: () => void, onGoToSignup: () => void, onBack: () => void }) => (
    <AuthShell title="Welcome Back" subtitle="Login to continue your progress.">
        <form onSubmit={(e) => { e.preventDefault(); onLogin(); }} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email Address</label>
                <input type="email" required placeholder="john@example.com" className="w-full bg-gray-800 border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all" />
            </div>
            <div>
                <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-300">Password</label>
                    <a href="#" className="text-xs text-green-400 hover:text-green-300">Forgot?</a>
                </div>
                <input type="password" required placeholder="••••••••" className="w-full bg-gray-800 border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all" />
            </div>
            <button type="submit" className="w-full bg-green-500 text-black font-bold py-3 rounded-lg hover:bg-green-400 transition-colors mt-2">
                Login
            </button>
        </form>
        <div className="text-center mt-6">
            <p className="text-gray-400 text-sm">Don't have an account? <button onClick={onGoToSignup} className="text-green-400 hover:text-green-300 font-semibold ml-1">Sign Up</button></p>
            <button onClick={onBack} className="text-gray-500 text-xs mt-4 hover:text-gray-300">Back to Home</button>
        </div>
    </AuthShell>
);

const SignupPage = ({ onSignup, onGoToLogin, onBack }: { onSignup: (p: UserProfile, pref: UserPreferences) => void, onGoToLogin: () => void, onBack: () => void }) => {
    const [formData, setFormData] = useState({
        fullName: '',
        username: '',
        email: '',
        age: 25,
        sex: 'Male',
        goal: 'muscle gain',
        password: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const [first, ...rest] = formData.fullName.split(' ');
        const profile: UserProfile = {
            ...defaultProfile,
            firstName: first || 'User',
            lastName: rest.join(' ') || '',
            username: formData.username,
            email: formData.email,
            age: Number(formData.age),
            sex: formData.sex as any,
            avatar: 'https://via.placeholder.com/150'
        };
        const prefs: UserPreferences = {
            ...defaultPreferences,
            goal: formData.goal as any
        };
        onSignup(profile, prefs);
    };

    return (
        <AuthShell title="Create Account" subtitle="Start your fitness journey today.">
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
                    <input type="text" required placeholder="John Doe" value={formData.fullName} onChange={e=>setFormData({...formData, fullName: e.target.value})} className="w-full bg-gray-800 border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
                        <input type="text" required placeholder="@johnfit" value={formData.username} onChange={e=>setFormData({...formData, username: e.target.value})} className="w-full bg-gray-800 border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Age</label>
                        <input type="number" required placeholder="25" value={formData.age} onChange={e=>setFormData({...formData, age: parseInt(e.target.value)})} className="w-full bg-gray-800 border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"/>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Gender</label>
                        <select value={formData.sex} onChange={e=>setFormData({...formData, sex: e.target.value})} className="w-full bg-gray-800 border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all">
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Goal</label>
                         <select value={formData.goal} onChange={e=>setFormData({...formData, goal: e.target.value})} className="w-full bg-gray-800 border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all">
                            <option value="muscle gain">Muscle Gain</option>
                            <option value="fat loss">Fat Loss</option>
                        </select>
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Email Address</label>
                    <input type="email" required placeholder="john@example.com" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} className="w-full bg-gray-800 border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                    <input type="password" required placeholder="••••••••" value={formData.password} onChange={e=>setFormData({...formData, password: e.target.value})} className="w-full bg-gray-800 border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"/>
                </div>
                <button type="submit" className="w-full bg-green-500 text-black font-bold py-3 rounded-lg hover:bg-green-400 transition-colors mt-6">Sign Up</button>
            </form>
             <div className="text-center mt-6">
                <p className="text-gray-400 text-sm">Already have an account? <button onClick={onGoToLogin} className="text-green-400 hover:text-green-300 font-semibold ml-1">Login</button></p>
                <button onClick={onBack} className="text-gray-500 text-xs mt-4 hover:text-gray-300">Back to Home</button>
            </div>
        </AuthShell>
    );
}

// --- LANDING PAGE COMPONENTS ---

const Carousel = () => {
    const [activeIndex, setActiveIndex] = useState(0);
    const cards = [
        { title: "Precision Analysis", category: "AI TECHNOLOGY", desc: "Advanced computer vision breaks down your physique symmetry.", img: "https://images.unsplash.com/photo-1550345332-09e3ac987658?auto=format&fit=crop&w=800&q=80", color: "bg-blue-600" },
        { title: "Custom Workouts", category: "TRAINING", desc: "Weekly routines tailored to your equipment and goals.", img: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80", color: "bg-green-500" },
        { title: "Smart Meal Guides", category: "NUTRITION", desc: "Simple effective nutrition plans with macros calculated.", img: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=800&q=80", color: "bg-orange-500" },
        { title: "Track Progress", category: "ANALYTICS", desc: "Visualize improvements with detailed charts.", img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80", color: "bg-purple-500" },
        { title: "Stay Motivated", category: "COMMUNITY", desc: "Join a community of like-minded individuals.", img: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=800&q=80", color: "bg-red-500" }
    ];

    const getStyle = (index: number) => {
        const offset = (index - activeIndex + 5) % 5; // 0 to 4
        
        if (offset === 0) return { transform: 'translateX(0) scale(1)', opacity: 1, zIndex: 10 };
        if (offset === 1) return { transform: 'translateX(40%) scale(0.8)', opacity: 0.6, zIndex: 5 };
        if (offset === 2) return { transform: 'translateX(75%) scale(0.6)', opacity: 0.3, zIndex: 1 };
        if (offset === 3) return { transform: 'translateX(-75%) scale(0.6)', opacity: 0.3, zIndex: 1 };
        if (offset === 4) return { transform: 'translateX(-40%) scale(0.8)', opacity: 0.6, zIndex: 5 };
        return {};
    };

    return (
        <section className="mt-24 w-full max-w-[1200px] px-4 pb-12">
            <div className="mb-8 text-center">
                <p className="text-green-400 font-bold tracking-widest text-sm mb-2">THE PLATFORM</p>
                <h3 className="text-3xl font-bold">Everything You Need</h3>
            </div>
            <div className="carousel-container">
                {cards.map((card, index) => (
                    <div 
                        key={index}
                        className="carousel-card"
                        style={getStyle(index)}
                        onClick={() => setActiveIndex(index)}
                    >
                        <img src={card.img} alt={card.title} />
                        <div className="card-caption">
                            <span className={`${card.color} text-white text-[10px] font-bold px-3 py-1 rounded-full tracking-wider mb-2 inline-block`}>{card.category}</span>
                            <h4 className="text-2xl font-bold text-white mb-2">{card.title}</h4>
                            <p className="text-gray-300 text-sm">{card.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
            <p className="text-gray-500 text-sm mt-8 italic text-center">Click any card to bring it to the front</p>
        </section>
    );
};

const LandingPage = ({ onStart, onLoginClick, onSignupClick }: { onStart: () => void, onLoginClick: () => void, onSignupClick: () => void }) => (
    <div className="min-h-screen flex flex-col">
        <header className="fixed top-0 left-0 right-0 bg-black/50 backdrop-blur-sm z-50 border-b border-gray-800">
            <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                    <Logo className="w-10 h-10 text-white" />
                    <h1 className="text-2xl font-bold tracking-tight">Physique Check</h1>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={onLoginClick} className="text-gray-300 hover:text-white font-medium transition-colors">Login</button>
                    <button onClick={onSignupClick} className="bg-green-500 text-black font-bold px-5 py-2 rounded-lg hover:bg-green-400 transition-all hover:scale-105">Sign Up</button>
                </div>
            </div>
        </header>

        <main className="flex-grow flex flex-col items-center pt-32">
             <div className="container mx-auto px-6 text-center flex flex-col items-center">
                <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 max-w-4xl leading-tight">
                    See Your Physique Clearly.
                    <br />
                    <span style={{color: ACCENT_COLOR}}>Improve With A Plan That Fits You.</span>
                </h2>
                <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-8">
                    Upload a simple photo — get instant muscle analysis, clear workout plans, and easy meal guides shaped around your body and your goals.
                </p>
                <button
                    onClick={onSignupClick}
                    className="bg-green-500 text-black font-bold text-lg px-8 py-4 rounded-lg hover:bg-green-400 transition-all transform hover:scale-105 shadow-lg shadow-green-500/20"
                >
                    Get Started Free &rarr;
                </button>
             </div>
             <Carousel />
        </main>
        
        <section className="py-20 container mx-auto px-6 border-t border-gray-900">
             <h3 className="text-3xl font-bold text-center mb-12">How It Works in 3 Simple Steps</h3>
             <div className="grid md:grid-cols-3 gap-8 text-center">
                <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 hover:border-green-500/30 transition-colors">
                    <UploadIcon className="w-12 h-12 mx-auto mb-4 text-green-500" />
                    <h4 className="text-xl font-bold mb-2">1. Upload Photos</h4>
                    <p className="text-gray-400">Securely upload front, side, and back photos. Your privacy is guaranteed.</p>
                </div>
                <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 hover:border-green-500/30 transition-colors">
                    <SparklesIcon className="w-12 h-12 mx-auto mb-4 text-green-500" />
                    <h4 className="text-xl font-bold mb-2">2. Get AI Analysis</h4>
                    <p className="text-gray-400">Our AI analyzes your physique, identifying muscle strengths and weaknesses.</p>
                </div>
                 <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 hover:border-green-500/30 transition-colors">
                    <DumbbellIcon className="w-12 h-12 mx-auto mb-4 text-green-500" />
                    <h4 className="text-xl font-bold mb-2">3. Receive Your Plan</h4>
                    <p className="text-gray-400">Get a personalized workout and meal plan to reach your goals faster.</p>
                </div>
             </div>
        </section>
        
        <footer className="bg-gray-900/50 py-8 text-center text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} Physique Check. All Rights Reserved.
        </footer>
    </div>
);

// --- MAIN DASHBOARD COMPONENTS ---

const Sidebar = ({ isCollapsed, onToggle, activeView, onNavigate, onLogout, isMobileOpen, onMobileClose }: { isCollapsed: boolean, onToggle: () => void, activeView: string, onNavigate: (view: any) => void, onLogout: () => void, isMobileOpen: boolean, onMobileClose: () => void }) => {
    const navItems = [
        { id: 'home', label: 'Home', icon: <HomeIcon className="w-6 h-6" /> },
        { id: 'stats', label: 'Your Stats', icon: <ChartBarIcon className="w-6 h-6" /> },
        { id: 'history', label: 'History', icon: <ClockIcon className="w-6 h-6" /> },
        { id: 'profile', label: 'Profile', icon: <UserCircleIcon className="w-6 h-6" /> },
    ];

    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-gray-900 border-r border-gray-800">
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'px-6'} h-20 border-b border-gray-800`}>
                <Logo className={`w-8 h-8 text-white transition-transform duration-300 ${isCollapsed ? 'scale-110' : 'scale-100'}`} />
                {!isCollapsed && <span className="text-xl font-bold ml-3 tracking-tight">Physique Check</span>}
            </div>
            <nav className="flex-1 px-3 py-6 space-y-2">
                {navItems.map(item => (
                    <button key={item.id} onClick={() => { onNavigate(item.id); if(window.innerWidth < 768) onMobileClose(); }}
                        className={`w-full flex items-center p-3.5 rounded-xl transition-all ${activeView === item.id ? 'bg-green-500/10 text-green-400 font-semibold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'} ${isCollapsed ? 'justify-center' : ''}`}>
                        {item.icon}
                        {!isCollapsed && <span className="ml-4 font-medium">{item.label}</span>}
                    </button>
                ))}
            </nav>
            <div className="px-3 py-6 border-t border-gray-800 space-y-2">
                <button onClick={onLogout} className={`w-full flex items-center p-3.5 rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors ${isCollapsed ? 'justify-center' : ''}`}>
                    <ArrowLeftOnRectangleIcon className="w-6 h-6" />
                    {!isCollapsed && <span className="ml-4 font-medium">Logout</span>}
                </button>
            </div>
        </div>
    );

    return (
        <>
            <div className={`fixed inset-0 z-50 transform transition-all duration-300 md:hidden ${isMobileOpen ? 'visible' : 'invisible'}`}>
                <div className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${isMobileOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onMobileClose}></div>
                <div className={`relative bg-gray-900 w-72 h-full shadow-2xl transform transition-transform duration-300 ease-out ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <SidebarContent />
                    <button onClick={onMobileClose} className="absolute top-6 right-4 text-gray-400 hover:text-white">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>
            <aside className={`fixed top-0 left-0 h-screen z-40 hidden md:flex flex-col transition-all duration-300 ${isCollapsed ? 'w-24' : 'w-72'}`}>
                <SidebarContent />
                <button onClick={onToggle} className="absolute -right-3 top-24 bg-gray-800 border border-gray-700 text-white hover:text-green-400 rounded-full p-1.5 focus:outline-none shadow-lg transition-colors">
                    {isCollapsed ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronLeftIcon className="w-4 h-4" />}
                </button>
            </aside>
        </>
    )
};

const UploadView = ({ onAnalyze, initialPreferences, userProfile, onProfileUpdate }: { 
    onAnalyze: (files: File[], preferences: UserPreferences, profile: UserProfile) => void, 
    initialPreferences: UserPreferences,
    userProfile: UserProfile,
    onProfileUpdate: (p: UserProfile) => void 
}) => {
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [preferences, setPreferences] = useState<UserPreferences>(initialPreferences);
    const [localProfile, setLocalProfile] = useState<UserProfile>(userProfile);

    useEffect(() => setPreferences(initialPreferences), [initialPreferences]);
    useEffect(() => setLocalProfile(userProfile), [userProfile]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const newFiles = [...files, ...acceptedFiles].slice(0, 3);
        setFiles(newFiles);
        const newPreviews = newFiles.map(file => URL.createObjectURL(file));
        setPreviews(newPreviews);
    }, [files]);
    
    const removeFile = (index: number) => {
        const newFiles = [...files];
        newFiles.splice(index, 1);
        setFiles(newFiles);
        setPreviews(prev => {
            const newP = [...prev];
            URL.revokeObjectURL(newP[index]);
            newP.splice(index, 1);
            return newP;
        });
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.jpeg', '.png', '.jpg'] },
        maxFiles: 3,
    });
    
    const handlePreferenceChange = (key: keyof UserPreferences, value: any) => {
        setPreferences(prev => ({ ...prev, [key]: value }));
    };

    const handleProfileChange = (key: keyof UserProfile, value: any) => {
        setLocalProfile(prev => ({ ...prev, [key]: value }));
    };

    const readyToAnalyze = files.length >= 1;

    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-2">Upload Your Physique Photos</h2>
            <p className="text-gray-400 mb-8">For the best analysis, please upload exactly 3 photos (Front, Side, Back).</p>
            
            <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${isDragActive ? 'border-green-500 bg-gray-900/80 scale-[1.02]' : 'border-gray-700 hover:border-green-600 bg-gray-900/20'}`}>
                <input {...getInputProps()} />
                <UploadIcon className={`w-16 h-16 mx-auto mb-4 transition-colors ${isDragActive ? 'text-green-500' : 'text-gray-500'}`} />
                {isDragActive ? (
                    <p className="text-lg font-medium text-white">Drop the files here ...</p>
                ) : (
                    <div className="space-y-2">
                        <p className="text-lg font-medium text-white">Click to select or drag 'n' drop photos here (Max 3)</p>
                        <p className="text-sm text-gray-500 text-green-400 font-bold">{files.length} / 3 Photos Selected</p>
                    </div>
                )}
            </div>

            {previews.length > 0 && (
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {previews.map((src, index) => (
                        <div key={index} className="relative group">
                            <img src={src} alt={`Preview ${index}`} className="w-full h-48 object-cover rounded-lg border border-gray-700" />
                            <button 
                                onClick={() => removeFile(index)} 
                                className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            >
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            
            <div className="mt-8 bg-gray-900/50 p-6 rounded-xl border border-gray-800">
                <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-xl font-bold">Personal Details & Preferences</h3>
                </div>
                
                {/* Personal Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                    <div>
                         <label className="block text-sm font-medium text-gray-300 mb-2">Sex</label>
                         <select value={localProfile.sex} onChange={e => handleProfileChange('sex', e.target.value)} className="w-full bg-gray-800 border-gray-700 rounded-md p-2 text-white outline-none focus:ring-2 focus:ring-green-500">
                             <option value="Male">Male</option>
                             <option value="Female">Female</option>
                             <option value="Other">Other</option>
                         </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Age</label>
                        <input type="number" value={localProfile.age} onChange={e => handleProfileChange('age', parseInt(e.target.value))} className="w-full bg-gray-800 border-gray-700 rounded-md p-2 text-white outline-none focus:ring-2 focus:ring-green-500"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Height (cm)</label>
                        <input type="number" value={localProfile.height} onChange={e => handleProfileChange('height', parseInt(e.target.value))} className="w-full bg-gray-800 border-gray-700 rounded-md p-2 text-white outline-none focus:ring-2 focus:ring-green-500"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Weight (kg)</label>
                        <input type="number" value={localProfile.weight} onChange={e => handleProfileChange('weight', parseInt(e.target.value))} className="w-full bg-gray-800 border-gray-700 rounded-md p-2 text-white outline-none focus:ring-2 focus:ring-green-500"/>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Activity Level</label>
                         <select value={localProfile.activityLevel} onChange={e => handleProfileChange('activityLevel', e.target.value)} className="w-full bg-gray-800 border-gray-700 rounded-md p-2 text-white outline-none focus:ring-2 focus:ring-green-500">
                            <option value="Sedentary">Sedentary</option>
                            <option value="Lightly Active">Lightly Active</option>
                            <option value="Moderately Active">Moderately Active</option>
                            <option value="Very Active">Very Active</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Primary Goal</label>
                        <select onChange={(e) => handlePreferenceChange('goal', e.target.value)} value={preferences.goal} className="w-full bg-gray-800 border-gray-700 rounded-md p-2 text-white outline-none focus:ring-2 focus:ring-green-500">
                            <option value="muscle gain">Muscle Gain</option>
                            <option value="fat loss">Fat Loss</option>
                            <option value="recomposition">Recomposition</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Experience</label>
                         <select onChange={(e) => handlePreferenceChange('experience', e.target.value)} value={preferences.experience} className="w-full bg-gray-800 border-gray-700 rounded-md p-2 text-white outline-none focus:ring-2 focus:ring-green-500">
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Equipment</label>
                         <select onChange={(e) => handlePreferenceChange('equipment', e.target.value)} value={preferences.equipment} className="w-full bg-gray-800 border-gray-700 rounded-md p-2 text-white outline-none focus:ring-2 focus:ring-green-500">
                            <option value="gym">Gym</option>
                            <option value="home">Home</option>
                            <option value="minimal equipment">Minimal Equipment</option>
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Time per Workout</label>
                         <select onChange={(e) => handlePreferenceChange('time', e.target.value)} value={preferences.time} className="w-full bg-gray-800 border-gray-700 rounded-md p-2 text-white outline-none focus:ring-2 focus:ring-green-500">
                            <option value="45-60 min">45-60 min</option>
                            <option value="20-30 min">20-30 min</option>
                            <option value="30-45 min">30-45 min</option>
                            <option value="60+ min">60+ min</option>
                        </select>
                    </div>
                </div>

                <div className="mt-6 space-y-3 border-t border-gray-800 pt-4">
                    <div className="flex items-center">
                        <input id="pose" type="checkbox" checked={preferences.enablePose} onChange={() => handlePreferenceChange('enablePose', !preferences.enablePose)} className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-green-500 focus:ring-green-500" style={{ accentColor: '#31FF75' }}/>
                        <label htmlFor="pose" className="ml-2 block text-sm text-gray-300">Enable Pose Analysis</label>
                    </div>
                     <div className="flex items-center">
                        <input id="landmarks" type="checkbox" checked={preferences.showLandmarks} onChange={() => handlePreferenceChange('showLandmarks', !preferences.showLandmarks)} className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-green-500 focus:ring-green-500" style={{ accentColor: '#31FF75' }}/>
                        <label htmlFor="landmarks" className="ml-2 block text-sm text-gray-300">Show Pose Landmarks</label>
                    </div>
                </div>
            </div>

            <div className="mt-8 flex justify-end">
                <button
                    onClick={() => {
                        onProfileUpdate(localProfile);
                        onAnalyze(files, preferences, localProfile);
                    }}
                    disabled={!readyToAnalyze}
                    className="bg-green-500 text-black font-bold text-lg px-8 py-3 rounded-lg hover:bg-green-400 transition-all transform hover:scale-105 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed disabled:scale-100 shadow-lg shadow-green-500/20 disabled:shadow-none"
                >
                    {readyToAnalyze ? 'Analyze My Physique' : 'Select 3 Photos to Start'}
                </button>
            </div>
        </div>
    );
};

const ProfilePage = ({ profile, preferences, onSaveProfile, onLogout }: { profile: UserProfile, preferences: UserPreferences, onSaveProfile: (p: UserProfile, pref: UserPreferences) => void, onLogout: () => void }) => {
    const [localProfile, setLocalProfile] = useState(profile);
    const [localPrefs, setLocalPrefs] = useState(preferences);

    useEffect(() => { setLocalProfile(profile); setLocalPrefs(preferences); }, [profile, preferences]);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) setLocalProfile(p => ({ ...p, avatar: ev.target!.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="container mx-auto px-6 py-8">
            <h2 className="text-4xl font-bold mb-2">Your Profile</h2>
            <p className="text-gray-400 mb-8">Manage your personal details and fitness preferences.</p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Identity Card */}
                <div className="lg:col-span-1">
                    <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 text-center sticky top-24">
                        <div className="relative w-32 h-32 mx-auto mb-4 group">
                             <img src={localProfile.avatar || "https://via.placeholder.com/150"} alt="Profile" className="w-32 h-32 rounded-full object-cover border-4 border-gray-800 group-hover:border-green-500 transition-colors" />
                             <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => document.getElementById('avatar-input')?.click()}>
                                <span className="text-white font-bold text-xs uppercase">Change</span>
                            </div>
                            <input type="file" id="avatar-input" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                        </div>
                        <h3 className="text-2xl font-bold">{localProfile.firstName} {localProfile.lastName}</h3>
                        <p className="text-gray-400 text-sm">@{localProfile.username}</p>
                        <p className="text-green-400 text-sm mt-2 font-bold uppercase">{localPrefs.goal}</p>
                    </div>
                </div>

                {/* Right: Forms */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Personal Info */}
                    <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800">
                         <h4 className="font-bold text-lg mb-4 flex items-center gap-2"><UserCircleIcon className="w-5 h-5 text-green-500"/> Personal Information</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">First Name</label>
                                <input type="text" value={localProfile.firstName} onChange={e => setLocalProfile({...localProfile, firstName: e.target.value})} className="w-full bg-gray-800 border-gray-700 rounded-lg p-2 text-white outline-none focus:ring-green-500"/>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Last Name</label>
                                <input type="text" value={localProfile.lastName} onChange={e => setLocalProfile({...localProfile, lastName: e.target.value})} className="w-full bg-gray-800 border-gray-700 rounded-lg p-2 text-white outline-none focus:ring-green-500"/>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                                <input type="text" value={localProfile.username} onChange={e => setLocalProfile({...localProfile, username: e.target.value})} className="w-full bg-gray-800 border-gray-700 rounded-lg p-2 text-white outline-none focus:ring-green-500"/>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                                <input type="email" value={localProfile.email} onChange={e => setLocalProfile({...localProfile, email: e.target.value})} className="w-full bg-gray-800 border-gray-700 rounded-lg p-2 text-white outline-none focus:ring-green-500"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Age</label>
                                <input type="number" value={localProfile.age} onChange={e => setLocalProfile({...localProfile, age: parseInt(e.target.value)})} className="w-full bg-gray-800 border-gray-700 rounded-lg p-2 text-white outline-none focus:ring-green-500"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Sex</label>
                                <select value={localProfile.sex} onChange={e => setLocalProfile({...localProfile, sex: e.target.value as any})} className="w-full bg-gray-800 border-gray-700 rounded-lg p-2 text-white outline-none focus:ring-green-500">
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                         </div>
                    </div>

                    {/* Fitness Prefs */}
                    <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800">
                        <h4 className="font-bold text-lg mb-4 flex items-center gap-2"><DumbbellIcon className="w-5 h-5 text-green-500"/> Fitness Preferences</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Primary Goal</label>
                                <select value={localPrefs.goal} onChange={e => setLocalPrefs(p => ({...p, goal: e.target.value as any}))} className="w-full bg-gray-800 border-gray-700 rounded-lg p-2 text-white outline-none focus:ring-green-500">
                                    <option value="muscle gain">Muscle Gain</option>
                                    <option value="fat loss">Fat Loss</option>
                                    <option value="recomposition">Recomposition</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Experience</label>
                                 <select value={localPrefs.experience} onChange={e => setLocalPrefs(p => ({...p, experience: e.target.value as any}))} className="w-full bg-gray-800 border-gray-700 rounded-lg p-2 text-white outline-none focus:ring-green-500">
                                    <option value="beginner">Beginner</option>
                                    <option value="intermediate">Intermediate</option>
                                    <option value="advanced">Advanced</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Equipment</label>
                                 <select value={localPrefs.equipment} onChange={e => setLocalPrefs(p => ({...p, equipment: e.target.value as any}))} className="w-full bg-gray-800 border-gray-700 rounded-lg p-2 text-white outline-none focus:ring-green-500">
                                    <option value="gym">Gym</option>
                                    <option value="home">Home</option>
                                    <option value="minimal equipment">Minimal Equipment</option>
                                </select>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Time / Workout</label>
                                 <select value={localPrefs.time} onChange={e => setLocalPrefs(p => ({...p, time: e.target.value as any}))} className="w-full bg-gray-800 border-gray-700 rounded-lg p-2 text-white outline-none focus:ring-green-500">
                                    <option value="45-60 min">45-60 min</option>
                                    <option value="20-30 min">20-30 min</option>
                                    <option value="30-45 min">30-45 min</option>
                                    <option value="60+ min">60+ min</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-4">
                        <button onClick={() => onSaveProfile(localProfile, localPrefs)} className="bg-green-500 text-black font-bold py-3 px-8 rounded-lg hover:bg-green-400 transform transition-transform hover:scale-105 shadow-lg shadow-green-500/20">Save Changes</button>
                    </div>

                </div>
            </div>
        </div>
    );
};

// ... (Existing ReportView, YourStatsPage, HistoryPage components remain the same, just ensure imports are correct) ...
const ReportView = ({ report, workoutPlan, mealGuide, onStartNewAnalysis, onBack, source }: { report: PhysiqueAnalysisReport, workoutPlan: WorkoutPlan, mealGuide: MealGuide, onStartNewAnalysis: () => void, onBack?: () => void, source: 'new' | 'history' | null }) => {
    const [activeTab, setActiveTab] = useState<'report' | 'workout' | 'meal'>('report');
    const muscleData = useMemo(() => Object.entries(report.muscleAnalysis), [report.muscleAnalysis]);

    const renderContent = () => {
        switch (activeTab) {
            case 'workout': return (
                <div className="space-y-4">
                    {workoutPlan.plan.map((day, index) => (
                        <div key={index} className="bg-gray-900/50 rounded-xl border border-gray-800 mb-4 p-6">
                            <div className="font-bold text-xl flex justify-between items-center mb-4">
                                <div><span className="text-green-400">{day.dayOfWeek}:</span> {day.targetMuscle}</div>
                            </div>
                            <div className="text-gray-300 space-y-3">
                                <p><strong className="text-gray-400">Warm-up:</strong> {day.warmup}</p>
                                <ul className="pl-4 border-l-2 border-gray-700 my-3 space-y-2">
                                    {day.exercises.map((ex, i) => <li key={i}><strong className="text-white">{ex.name}</strong>: {ex.sets} x {ex.reps} <span className="text-gray-500 text-sm">({ex.rest} rest)</span></li>)}
                                </ul>
                                <p><strong className="text-gray-400">Cooldown:</strong> {day.cooldown}</p>
                            </div>
                        </div>
                    ))}
                </div>
            );
            case 'meal': return (
                <div className="space-y-8">
                    <div className="bg-gray-900/50 p-8 rounded-xl border border-gray-800 text-center">
                        <div className="grid grid-cols-4 gap-4">
                            <div><p className="text-gray-400">Calories</p><p className="text-2xl font-bold text-green-400">{mealGuide.dailyCalorieTarget}</p></div>
                            <div><p className="text-gray-400">Protein</p><p className="text-2xl font-bold">{mealGuide.macros.protein}</p></div>
                            <div><p className="text-gray-400">Carbs</p><p className="text-2xl font-bold">{mealGuide.macros.carbs}</p></div>
                            <div><p className="text-gray-400">Fats</p><p className="text-2xl font-bold">{mealGuide.macros.fats}</p></div>
                        </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                        {mealGuide.meals.map((meal, index) => (
                            <div key={index} className="bg-gray-900/50 p-6 rounded-xl border border-gray-800">
                                <h4 className="text-xl font-bold mb-2">{meal.name}</h4>
                                <p className="text-gray-400 text-sm mb-2">{meal.notes}</p>
                                <ul className="list-disc list-inside text-gray-300 text-sm">{meal.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}</ul>
                            </div>
                        ))}
                    </div>
                </div>
            );
            case 'report':
            default:
                return (
                    <>
                        <div className="grid md:grid-cols-2 gap-8 items-center mb-8">
                           <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 h-80 flex flex-col justify-center">
                                <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><ChartIcon className="w-5 h-5 text-green-500"/> Muscle Balance Analysis</h3>
                                <RadarChartComponent data={report.muscleAnalysis} />
                            </div>
                            <div className="space-y-4">
                                <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800">
                                    <h4 className="text-lg font-semibold text-green-400">Overall Score: {report.physiqueRating.overallScore}/10</h4>
                                    <p className="text-gray-300 mt-2">{report.physiqueRating.summary}</p>
                                </div>
                                <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800">
                                    <h4 className="text-lg font-semibold text-green-400">Posture & Structure</h4>
                                    <p className="text-gray-300 mt-2">{report.postureNotes}</p>
                                </div>
                            </div>
                        </div>
                         <h3 className="text-2xl font-bold mb-6 text-center">Detailed Muscle Group Report</h3>
                         <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {muscleData.map(([name, details]) => (
                                <div key={name} className="bg-gray-900/50 p-6 rounded-xl border border-gray-800">
                                    <h4 className="text-xl font-bold capitalize mb-3">{name}</h4>
                                    <p><strong className="text-green-400">Strengths:</strong> {details.strengths}</p>
                                    <p className="mt-2"><strong className="text-yellow-400">Weaknesses:</strong> {details.weaknesses}</p>
                                    <p className="mt-2 text-sm text-gray-400"><strong className="text-blue-400">Symmetry:</strong> {details.symmetryNotes}</p>
                                </div>
                            ))}
                        </div>
                    </>
                );
        }
    };

    return (
        <div className="animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-8">
                 <h2 className="text-4xl font-bold">Your Analysis</h2>
                 {source === 'new' && (
                     <button onClick={onStartNewAnalysis} className="flex items-center gap-2 text-green-400 border border-green-500 px-4 py-2 rounded hover:bg-green-500/10">
                        <ArrowPathIcon className="w-5 h-5" /> New Analysis
                    </button>
                 )}
                  {source === 'history' && onBack && (
                     <button onClick={onBack} className="text-gray-400 hover:text-white flex items-center gap-2"><ChevronLeftIcon className="w-4 h-4"/> Back</button>
                 )}
            </div>

            <div className="flex space-x-4 border-b border-gray-700 mb-8 overflow-x-auto">
                <button onClick={() => setActiveTab('report')} className={`px-4 py-3 font-semibold whitespace-nowrap transition-colors ${activeTab === 'report' ? 'text-green-500 border-b-2 border-green-500' : 'text-gray-400 hover:text-white'}`}>Physique Report</button>
                <button onClick={() => setActiveTab('workout')} className={`px-4 py-3 font-semibold whitespace-nowrap transition-colors ${activeTab === 'workout' ? 'text-green-500 border-b-2 border-green-500' : 'text-gray-400 hover:text-white'}`}>Workout Plan</button>
                <button onClick={() => setActiveTab('meal')} className={`px-4 py-3 font-semibold whitespace-nowrap transition-colors ${activeTab === 'meal' ? 'text-green-500 border-b-2 border-green-500' : 'text-gray-400 hover:text-white'}`}>Meal Guide</button>
            </div>

            <div className="min-h-[500px]">{renderContent()}</div>
        </div>
    );
};
// ... Reusing HistoryPage and YourStatsPage from previous robust implementation, ensuring they are connected.

const YourStatsPage = ({ history }: { history: HistoryItem[] }) => {
    if (!history || history.length === 0) return <div className="text-center p-12"><h3 className="text-xl font-bold text-gray-400">No Stats Yet. Analyze your physique to see data.</h3></div>;
    const latest = history[0].report;
    const scores = Object.entries(latest.muscleAnalysis).map(([k, v]) => ({ subject: k.charAt(0).toUpperCase() + k.slice(1), A: v.score, fullMark: 10 }));
    let strongest = { name: '', score: -1 };
    let weakest = { name: '', score: 11 };
    scores.forEach(s => { if(s.A > strongest.score) strongest={name:s.subject, score:s.A}; if(s.A < weakest.score) weakest={name:s.subject, score:s.A}; });

    return (
        <div className="container mx-auto px-6 py-8">
            <h2 className="text-4xl font-bold mb-8">Your Stats</h2>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800">
                    <h3 className="text-lg font-semibold text-gray-300">Current Physique Rating</h3>
                    <p className="text-5xl font-bold text-green-400 mt-2">{latest.physiqueRating.overallScore}</p>
                </div>
                 <div className="bg-green-500/10 border border-green-500/50 p-6 rounded-xl">
                     <h3 className="text-lg font-semibold text-green-300">Strongest Area</h3>
                     <p className="text-3xl font-bold capitalize mt-2">{strongest.name}</p>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/50 p-6 rounded-xl">
                     <h3 className="text-lg font-semibold text-yellow-300">Needs More Work</h3>
                     <p className="text-3xl font-bold capitalize mt-2">{weakest.name}</p>
                </div>
             </div>
             <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 h-96">
                  <h3 className="text-lg font-bold mb-6">Muscle Balance</h3>
                  <RadarChartComponent data={latest.muscleAnalysis} />
             </div>
        </div>
    );
};

const HistoryPage = ({ history, onSelectReport }: { history: HistoryItem[], onSelectReport: (item: HistoryItem) => void }) => {
     if (!history || history.length === 0) return <div className="text-center p-12"><h3 className="text-xl font-bold text-gray-400">No History Yet.</h3></div>;
     return (
        <div className="container mx-auto px-6 py-8">
            <h2 className="text-4xl font-bold mb-2">Your Analysis History</h2>
            <p className="text-gray-400 mb-8">Tap a previous analysis to reopen the full report.</p>
            <div className="space-y-4">
                {history.map(item => (
                    <button key={item.id} onClick={() => onSelectReport(item)} className="w-full text-left bg-gray-900/50 p-4 rounded-xl border border-gray-800 hover:border-green-500 transition-all flex items-center gap-4 group">
                         <div className="bg-gray-800 rounded-lg w-16 h-16 flex items-center justify-center shrink-0">
                            <SparklesIcon className="w-8 h-8 text-green-500"/>
                        </div>
                        <div>
                             <p className="font-bold text-lg text-white">{new Date(item.date).toLocaleString()}</p>
                             <span className="text-sm bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-bold">Score: {item.report.physiqueRating.overallScore}</span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
     );
};

// --- APP COMPONENT ---

const App = () => {
    const [appState, setAppState] = useState<AppState>('landing');
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile>(defaultProfile);
    const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
    
    const [activeView, setActiveView] = useState('home');
    const [currentReportData, setCurrentReportData] = useState<{report: PhysiqueAnalysisReport, plan: WorkoutPlan, meal: MealGuide} | null>(null);
    const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [viewSource, setViewSource] = useState<'new' | 'history' | null>(null);

    // Persistence
    useEffect(() => {
        const loadedHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);
        const loadedPrefs = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
        const loadedProfile = localStorage.getItem(STORAGE_KEYS.PROFILE);
        const authState = localStorage.getItem(STORAGE_KEYS.AUTH_STATE);

        if (loadedHistory) setHistory(JSON.parse(loadedHistory));
        if (loadedPrefs) setPreferences(JSON.parse(loadedPrefs));
        if (loadedProfile) setUserProfile(JSON.parse(loadedProfile));
        if (authState === 'true') setAppState('dashboard');
    }, []);

    useEffect(() => localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history)), [history]);
    useEffect(() => localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(preferences)), [preferences]);
    useEffect(() => localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(userProfile)), [userProfile]);

    const handleLogin = () => {
        localStorage.setItem(STORAGE_KEYS.AUTH_STATE, 'true');
        setAppState('dashboard');
    };

    const handleSignup = (profile: UserProfile, prefs: UserPreferences) => {
        setUserProfile(profile);
        setPreferences(prefs);
        localStorage.setItem(STORAGE_KEYS.AUTH_STATE, 'true');
        setAppState('dashboard');
    };

    const handleLogout = () => {
        localStorage.removeItem(STORAGE_KEYS.AUTH_STATE);
        setAppState('landing');
        setCurrentReportData(null);
        setActiveView('home');
    };

    const handleAnalyze = async (files: File[], prefs: UserPreferences, profile: UserProfile) => {
        if (files.length === 0) return setError("Please upload at least one photo.");
        setPreferences(prefs);
        setUserProfile(profile);
        setError(null);
        
        try {
            // Loading state visual could be added here, but for now we rely on the button state or a simple overlay
            const report = await analyzePhysique(files, prefs, profile);
            const plans = await generatePlans(report, prefs, profile);
            
            const newHistoryItem: HistoryItem = {
                id: Date.now().toString(),
                date: new Date().toISOString(),
                report: report,
                workoutPlan: plans.workoutPlan,
                mealGuide: plans.mealGuide
            };

            setHistory(prev => [newHistoryItem, ...prev]);
            setCurrentReportData({ report, plan: plans.workoutPlan, meal: plans.mealGuide });
            setViewSource('new');
        } catch (err: any) {
            setError(err.message || "An unknown error occurred.");
        }
    };

    const renderDashboard = () => {
        switch (activeView) {
            case 'stats': return <YourStatsPage history={history} />;
            case 'history': return <HistoryPage history={history} onSelectReport={(item) => { setCurrentReportData({ report: item.report, plan: item.workoutPlan, meal: item.mealGuide }); setViewSource('history'); setActiveView('home'); }} />;
            case 'profile': return <ProfilePage profile={userProfile} preferences={preferences} onSaveProfile={(p, pf) => { setUserProfile(p); setPreferences(pf); alert("Saved!"); }} onLogout={handleLogout} />;
            case 'home':
            default:
                if (currentReportData) {
                    return <ReportView report={currentReportData.report} workoutPlan={currentReportData.plan} mealGuide={currentReportData.meal} onStartNewAnalysis={() => { setCurrentReportData(null); setViewSource(null); }} onBack={viewSource === 'history' ? () => setActiveView('history') : undefined} source={viewSource} />;
                }
                return <UploadView onAnalyze={handleAnalyze} initialPreferences={preferences} userProfile={userProfile} onProfileUpdate={setUserProfile} />;
        }
    };

    return (
        <>
            {error && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-full shadow-xl z-[100] flex items-center gap-2">
                    <XMarkIcon className="w-5 h-5" /> {error} <button onClick={() => setError(null)} className="ml-2 font-bold">✕</button>
                </div>
            )}

            {appState === 'landing' && <LandingPage onStart={() => setAppState('signup')} onLoginClick={() => setAppState('login')} onSignupClick={() => setAppState('signup')} />}
            {appState === 'login' && <LoginPage onLogin={handleLogin} onGoToSignup={() => setAppState('signup')} onBack={() => setAppState('landing')} />}
            {appState === 'signup' && <SignupPage onSignup={handleSignup} onGoToLogin={() => setAppState('login')} onBack={() => setAppState('landing')} />}
            
            {appState === 'dashboard' && (
                <div className="relative min-h-screen md:flex bg-black text-white">
                    <Sidebar 
                        isCollapsed={isSidebarCollapsed} 
                        onToggle={() => setSidebarCollapsed(!isSidebarCollapsed)} 
                        activeView={activeView} 
                        onNavigate={(v) => { setActiveView(v); setMobileMenuOpen(false); }} 
                        onLogout={handleLogout}
                        isMobileOpen={isMobileMenuOpen}
                        onMobileClose={() => setMobileMenuOpen(false)}
                    />
                    <div className={`flex flex-col flex-1 w-full transition-all duration-300 ${!isSidebarCollapsed ? 'md:ml-72' : 'md:ml-24'}`}>
                        <div className="md:hidden sticky top-0 flex items-center justify-between p-4 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 z-30">
                             <div className="flex items-center space-x-2">
                               <Logo className="w-8 h-8 text-white" />
                               <h1 className="text-xl font-bold">Physique Check</h1>
                            </div>
                            <button onClick={() => setMobileMenuOpen(true)} className="p-2 text-gray-300 hover:text-white">
                                <Bars3Icon className="h-6 w-6" />
                            </button>
                        </div>
                        <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 pb-24">
                            {renderDashboard()}
                        </main>
                    </div>
                </div>
            )}
        </>
    );
};

export default App;
