import React, { useState, useEffect } from 'react';
import { FirebaseError } from 'firebase/app';
import { 
  LayoutDashboard, 
  PenTool, 
  Image as ImageIcon, 
  Settings, 
  LogOut, 
  ChevronRight, 
  Plus,
  Sparkles,
  History,
  User,
  Save,
  Loader2,
  Trash2,
  ExternalLink,
  Users,
  Calendar,
  Briefcase,
  ChevronLeft,
  Filter,
  Clock,
  Download,
  Video
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  getDoc,
  Timestamp,
  limit
} from 'firebase/firestore';
import { auth, db, signIn, logOut } from './firebase';
import { UserProfile, MarketingContent, MarketingImage, MarketingVideo, ContentType, Client } from './types';
import { 
  generateMarketingContent, 
  generateMarketingImage, 
  generateMarketingSVG,
  generateMarketingVideo,
  generateContentIdeas, 
  generateMarketTrends 
} from './services/geminiService';
import ReactMarkdown from 'react-markdown';
import { X } from 'lucide-react';

// Error Handling for Firestore
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // In a real app, we might show a toast here
}

// Components
const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      active 
        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
        : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

const Card = ({ children, className = "" }: any) => (
  <div className={`bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = 'primary', loading = false, disabled = false, className = "" }: any) => {
  const variants: any = {
    primary: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20',
    secondary: 'bg-zinc-800 hover:bg-zinc-700 text-white',
    outline: 'border border-zinc-700 hover:border-zinc-500 text-zinc-300',
    danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20',
    ghost: 'hover:bg-zinc-800 text-zinc-400 hover:text-white'
  };

  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {loading ? <Loader2 className="animate-spin" size={18} /> : children}
    </button>
  );
};

const Modal = ({ isOpen, onClose, title, children }: any) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between p-6 border-b border-zinc-800">
            <h3 className="text-xl font-bold">{title}</h3>
            <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl transition-all">
              <X size={20} />
            </button>
          </div>
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {children}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const VideoGalleryItem = ({ video, onDelete, onDownload }: { video: MarketingVideo, onDelete: (id: string) => void, onDownload: (url: string, name: string) => void }) => {
  const [videoUrl, setVideoUrl] = useState(video.videoUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  const reloadVideo = async () => {
    if (!video.videoUri) return;
    setIsLoading(true);
    setError(false);
    try {
      const response = await fetch(video.videoUri, {
        method: 'GET',
        headers: {
          'x-goog-api-key': (process.env as any).API_KEY || "",
        },
      });
      if (!response.ok) throw new Error('Failed to fetch');
      const blob = await response.blob();
      setVideoUrl(URL.createObjectURL(blob));
    } catch (e) {
      console.error(e);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="group relative aspect-video rounded-2xl overflow-hidden border border-zinc-800 hover:border-zinc-600 transition-all bg-zinc-900 flex items-center justify-center">
      {isLoading ? (
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      ) : error ? (
        <div className="flex flex-col items-center gap-2 text-zinc-500 p-4 text-center">
          <Clock size={32} className="opacity-20" />
          <p className="text-xs">Link expirado ou indisponível.</p>
          <button onClick={reloadVideo} className="text-[10px] text-emerald-500 hover:underline">Tentar Recarregar</button>
        </div>
      ) : (
        <video 
          src={videoUrl} 
          className="w-full h-full object-cover" 
          onError={() => setError(true)}
        />
      )}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center p-4 text-center gap-3">
        <p className="text-xs text-white line-clamp-2 mb-1">{video.prompt}</p>
        <div className="flex gap-2">
          <button 
            onClick={() => onDownload(videoUrl, `video-${video.id}.mp4`)}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all"
            title="Baixar Vídeo"
            disabled={error || isLoading}
          >
            <Download size={18} />
          </button>
          <button 
            onClick={() => onDelete(video.id!)}
            className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-lg text-red-500 transition-all"
            title="Excluir"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [user, loadingAuth] = useAuthState(auth);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [contents, setContents] = useState<MarketingContent[]>([]);
  const [images, setImages] = useState<MarketingImage[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  
  // Generator States
  const [contentPrompt, setContentPrompt] = useState('');
  const [contentType, setContentType] = useState<ContentType>('post');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');

  const [imagePrompt, setImagePrompt] = useState('');
  const [selectedImageClientId, setSelectedImageClientId] = useState<string>('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedSvg, setGeneratedSvg] = useState<string | null>(null);

  const [videoPrompt, setVideoPrompt] = useState('');
  const [selectedVideoClientId, setSelectedVideoClientId] = useState<string>('');
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<{ url: string; uri: string } | null>(null);
  const [videos, setVideos] = useState<MarketingVideo[]>([]);

  // New Client State
  const [newClient, setNewClient] = useState({ name: '', description: '', brandVoice: '', targetAudience: '' });
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiModalTitle, setAiModalTitle] = useState('');
  const [aiModalContent, setAiModalContent] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [calendarSelectedClientId, setCalendarSelectedClientId] = useState('');

  // Load User Profile
  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        setUserProfile(doc.data() as UserProfile);
      } else {
        // Create initial profile
        const initialProfile: UserProfile = {
          uid: user.uid,
          displayName: user.displayName || 'Usuário',
          email: user.email || '',
          createdAt: new Date().toISOString()
        };
        setDoc(userDocRef, initialProfile).catch(e => handleFirestoreError(e, OperationType.WRITE, 'users'));
      }
    }, (e) => handleFirestoreError(e, OperationType.GET, 'users'));

    return () => unsubscribe();
  }, [user]);

  // Load Contents
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'contents'), where('uid', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setContents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MarketingContent)));
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'contents'));
    return () => unsubscribe();
  }, [user]);

  // Load Images
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'images'), where('uid', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setImages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MarketingImage)));
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'images'));
    return () => unsubscribe();
  }, [user]);

  // Load Videos
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'videos'), where('uid', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setVideos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MarketingVideo)));
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'videos'));
    return () => unsubscribe();
  }, [user]);

  // Load Clients
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'clients'), where('uid', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'clients'));
    return () => unsubscribe();
  }, [user]);

  const handleDownloadImage = (imageUrl: string, fileName: string = 'eugencia-ai-image.png') => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerateContent = async () => {
    if (!contentPrompt) return;
    setIsGeneratingContent(true);
    try {
      const client = clients.find(c => c.id === selectedClientId);
      const result = await generateMarketingContent(
        contentType, 
        contentPrompt, 
        userProfile || undefined,
        client ? {
          name: client.name,
          description: client.description,
          brandVoice: client.brandVoice,
          targetAudience: client.targetAudience
        } : undefined
      );
      setGeneratedContent(result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const handleSaveContent = async () => {
    if (!generatedContent || !user) return;
    try {
      const contentData: any = {
        uid: user.uid,
        title: contentPrompt.slice(0, 50) + '...',
        type: contentType,
        prompt: contentPrompt,
        content: generatedContent,
        createdAt: new Date().toISOString()
      };
      
      if (selectedClientId) contentData.clientId = selectedClientId;
      if (scheduledDate) contentData.scheduledDate = scheduledDate;

      await addDoc(collection(db, 'contents'), contentData);
      
      setGeneratedContent('');
      setContentPrompt('');
      setScheduledDate('');
      setSelectedClientId('');
      setActiveTab('dashboard');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'contents');
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt) return;
    setIsGeneratingImage(true);
    setGeneratedImage(null);
    setGeneratedSvg(null);
    try {
      // Run both in parallel
      const [imageResult, svgResult] = await Promise.all([
        generateMarketingImage(imagePrompt),
        generateMarketingSVG(imagePrompt)
      ]);
      
      setGeneratedImage(imageResult);
      setGeneratedSvg(svgResult);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const resizeImage = (base64Str: string, maxWidth = 800, maxHeight = 800): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
    });
  };

  const handleDownloadSvg = (svgContent?: string) => {
    const content = svgContent || generatedSvg;
    if (!content) return;
    const blob = new Blob([content], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template-canva-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveImage = async () => {
    if (!generatedImage || !user) return;
    try {
      // Resize image to ensure it's under 1MB Firestore limit
      const resizedImage = await resizeImage(generatedImage);
      
      const imageData: any = {
        uid: user.uid,
        clientId: selectedImageClientId || null,
        prompt: imagePrompt,
        imageUrl: resizedImage,
        svgCode: generatedSvg,
        createdAt: new Date().toISOString()
      };

      if (selectedImageClientId) imageData.clientId = selectedImageClientId;

      await addDoc(collection(db, 'images'), imageData);
      
      setGeneratedImage(null);
      setGeneratedSvg(null);
      setImagePrompt('');
      setSelectedImageClientId('');
      setActiveTab('dashboard');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'images');
    }
  };

  const handleCreateClient = async () => {
    if (!newClient.name || !user) return;
    setIsCreatingClient(true);
    try {
      await addDoc(collection(db, 'clients'), {
        uid: user.uid,
        ...newClient,
        createdAt: new Date().toISOString()
      });
      setNewClient({ name: '', description: '', brandVoice: '', targetAudience: '' });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'clients');
    } finally {
      setIsCreatingClient(false);
    }
  };

  const handleDeleteClient = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'clients', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'clients');
    }
  };

  const handleDeleteContent = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'contents', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'contents');
    }
  };

  const handleDeleteImage = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'images', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'images');
    }
  };

  const handleDeleteVideo = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'videos', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'videos');
    }
  };

  const handleGenerateVideo = async () => {
    if (!videoPrompt) return;
    
    // Check for API Key
    const hasKey = await (window as any).aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await (window as any).aistudio.openSelectKey();
      // After opening, we proceed assuming user selected a key or will retry
    }

    setIsGeneratingVideo(true);
    setGeneratedVideo(null);
    try {
      const result = await generateMarketingVideo(videoPrompt, (process.env as any).API_KEY);
      setGeneratedVideo(result);
    } catch (e) {
      console.error(e);
      // If requested entity not found, prompt for key again
      if (e instanceof Error && e.message.includes("Requested entity was not found")) {
        await (window as any).aistudio.openSelectKey();
      }
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleSaveVideo = async () => {
    if (!user || !generatedVideo) return;
    try {
      await addDoc(collection(db, 'videos'), {
        uid: user.uid,
        clientId: selectedVideoClientId || null,
        prompt: videoPrompt,
        videoUrl: generatedVideo.url,
        videoUri: generatedVideo.uri,
        createdAt: new Date().toISOString()
      });
      setGeneratedVideo(null);
      setVideoPrompt('');
      setActiveTab('dashboard');
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'videos');
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), { ...userProfile, ...updates }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'users');
    }
  };

  const handleGenerateIdeas = async () => {
    setIsAiLoading(true);
    setAiModalTitle('Ideias de Conteúdo');
    setIsAiModalOpen(true);
    try {
      const client = clients.find(c => c.id === calendarSelectedClientId);
      const result = await generateContentIdeas(client ? {
        name: client.name,
        description: client.description,
        brandVoice: client.brandVoice,
        targetAudience: client.targetAudience
      } : undefined);
      setAiModalContent(result);
    } catch (error) {
      setAiModalContent('Erro ao gerar ideias. Tente novamente.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleGenerateTrends = async () => {
    setIsAiLoading(true);
    setAiModalTitle('Tendências do Mercado');
    setIsAiModalOpen(true);
    try {
      const client = clients.find(c => c.id === calendarSelectedClientId);
      const segment = client?.description || 'Marketing Digital';
      const result = await generateMarketTrends(segment);
      setAiModalContent(result);
    } catch (error) {
      setAiModalContent('Erro ao buscar tendências. Tente novamente.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSignIn = async () => {
    setAuthError(null);
    setIsSigningIn(true);
    try {
      await signIn();
    } catch (error) {
      if (error instanceof FirebaseError) {
        if (error.code === 'auth/unauthorized-domain') {
          setAuthError('Este domínio ainda não está autorizado no Firebase. Adicione o domínio atual em Authentication > Settings > Authorized domains.');
        } else if (error.code === 'auth/operation-not-allowed') {
          setAuthError('Login com Google não está habilitado no Firebase. Ative o provedor Google em Authentication > Sign-in method.');
        } else {
          setAuthError('Não foi possível entrar com Google agora. Tente novamente.');
        }
      } else {
        setAuthError('Não foi possível entrar com Google agora. Tente novamente.');
      }
      console.error('Google sign-in error:', error);
    } finally {
      setIsSigningIn(false);
    }
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={40} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500 blur-[120px] rounded-full" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="z-10 text-center max-w-2xl"
        >
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Sparkles className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Eugência AI</h1>
          </div>
          
          <h2 className="text-5xl font-bold mb-6 leading-tight">
            Sua Agência de Marketing <span className="text-emerald-500">Movida a IA</span>
          </h2>
          <p className="text-zinc-400 text-xl mb-10">
            Crie estratégias, textos e imagens profissionais em segundos. 
            Aumente sua produtividade e escale seu marketing digital.
          </p>
          
          <Button onClick={handleSignIn} loading={isSigningIn} className="px-10 py-4 text-lg">
            Começar Agora com Google
          </Button>
          {authError && (
            <p className="mt-4 text-sm text-red-400 max-w-xl mx-auto">{authError}</p>
          )}
          
          <div className="mt-16 grid grid-cols-3 gap-8">
            {[
              { label: 'Copywriting', icon: PenTool },
              { label: 'Imagens IA', icon: ImageIcon },
              { label: 'Estratégia', icon: LayoutDashboard }
            ].map((feature, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-emerald-500">
                  <feature.icon size={20} />
                </div>
                <span className="text-sm text-zinc-500 font-medium">{feature.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Sidebar */}
      <aside className="w-72 border-r border-zinc-800 p-6 flex flex-col gap-8 sticky top-0 h-screen">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Sparkles className="text-white" size={18} />
          </div>
          <span className="text-xl font-bold">Eugência AI</span>
        </div>

        <nav className="flex-1 flex flex-col gap-2">
          <SidebarItem 
            icon={LayoutDashboard} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <SidebarItem 
            icon={Users} 
            label="Clientes" 
            active={activeTab === 'clients'} 
            onClick={() => setActiveTab('clients')} 
          />
          <SidebarItem 
            icon={Calendar} 
            label="Calendário" 
            active={activeTab === 'calendar'} 
            onClick={() => setActiveTab('calendar')} 
          />
          <SidebarItem 
            icon={PenTool} 
            label="Criar Conteúdo" 
            active={activeTab === 'content'} 
            onClick={() => setActiveTab('content')} 
          />
          <SidebarItem 
            icon={ImageIcon} 
            label="Gerar Imagem" 
            active={activeTab === 'image'} 
            onClick={() => setActiveTab('image')} 
          />
          <SidebarItem 
            icon={Video} 
            label="Gerar Vídeo" 
            active={activeTab === 'video'} 
            onClick={() => setActiveTab('video')} 
          />
          <SidebarItem 
            icon={Settings} 
            label="Minha Marca" 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
          />
        </nav>

        <div className="mt-auto pt-6 border-t border-zinc-800">
          <div className="flex items-center gap-3 mb-6 px-2">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
              <User size={20} className="text-zinc-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.displayName}</p>
              <p className="text-xs text-zinc-500 truncate">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={logOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:bg-red-500/10 hover:text-red-500 transition-all"
          >
            <LogOut size={20} />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 max-w-6xl mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-10"
            >
              <header className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Bem-vindo, {user.displayName?.split(' ')[0]}!</h1>
                  <p className="text-zinc-400">Aqui está o que você criou recentemente.</p>
                </div>
                <Button onClick={() => setActiveTab('content')}>
                  <Plus size={20} /> Novo Conteúdo
                </Button>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card 
                  className="col-span-full md:col-span-1 bg-emerald-500/5 border-emerald-500/20 cursor-pointer hover:bg-emerald-500/10 transition-all"
                  onClick={() => document.getElementById('text-history')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center">
                      <PenTool className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold">Textos Gerados</h3>
                      <p className="text-2xl font-bold">{contents.length}</p>
                    </div>
                  </div>
                </Card>
                <Card 
                  className="col-span-full md:col-span-1 bg-blue-500/5 border-blue-500/20 cursor-pointer hover:bg-blue-500/10 transition-all"
                  onClick={() => document.getElementById('image-gallery')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center">
                      <ImageIcon className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold">Imagens Geradas</h3>
                      <p className="text-2xl font-bold">{images.length}</p>
                    </div>
                  </div>
                </Card>
                <Card 
                  className="col-span-full md:col-span-1 bg-purple-500/5 border-purple-500/20 cursor-pointer hover:bg-purple-500/10 transition-all"
                  onClick={() => document.getElementById('video-gallery')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500 flex items-center justify-center">
                      <Video className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold">Vídeos Gerados</h3>
                      <p className="text-2xl font-bold">{videos.length}</p>
                    </div>
                  </div>
                </Card>
                <Card 
                  className="col-span-full md:col-span-1 bg-zinc-500/5 border-zinc-500/20 cursor-pointer hover:bg-zinc-500/10 transition-all"
                  onClick={() => setActiveTab('clients')}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-500 flex items-center justify-center">
                      <Users className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold">Clientes Ativos</h3>
                      <p className="text-2xl font-bold">{clients.length}</p>
                    </div>
                  </div>
                </Card>
              </div>

              <section id="text-history">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <History size={20} className="text-emerald-500" /> Histórico de Textos
                  </h2>
                </div>
                
                <div className="space-y-4">
                  {contents.length === 0 && (
                    <div className="text-center py-10 border-2 border-dashed border-zinc-800 rounded-3xl">
                      <p className="text-zinc-500">Nenhum texto criado ainda.</p>
                    </div>
                  )}
                  
                  {contents.slice(0, 5).map(content => (
                    <Card key={content.id} className="flex items-center justify-between group hover:border-zinc-700 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-emerald-500">
                          <PenTool size={18} />
                        </div>
                        <div>
                          <h4 className="font-bold truncate max-w-md">{content.title}</h4>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-zinc-500 uppercase tracking-wider">{content.type} • {new Date(content.createdAt).toLocaleDateString()}</p>
                            {content.clientId && (
                              <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                {clients.find(c => c.id === content.clientId)?.name || 'Cliente'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <Button variant="outline" className="p-2" onClick={() => {
                          setGeneratedContent(content.content);
                          setActiveTab('content');
                        }}>
                          <ExternalLink size={16} />
                        </Button>
                        <Button variant="danger" className="p-2" onClick={() => handleDeleteContent(content.id!)}>
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>

              <section id="image-gallery">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <ImageIcon size={20} className="text-blue-500" /> Galeria de Imagens
                  </h2>
                </div>
                
                {images.length === 0 ? (
                  <div className="text-center py-20 border-2 border-dashed border-zinc-800 rounded-3xl">
                    <p className="text-zinc-500">Nenhuma imagem salva ainda.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {images.slice(0, 8).map(image => (
                      <div key={image.id} className="group relative aspect-square rounded-2xl overflow-hidden border border-zinc-800 hover:border-zinc-600 transition-all">
                        <img src={image.imageUrl} alt={image.prompt} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center p-4 text-center gap-3">
                          <p className="text-[10px] text-white line-clamp-2 mb-1">{image.prompt}</p>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleDownloadImage(image.imageUrl)}
                              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all"
                              title="Baixar Imagem"
                            >
                              <Download size={16} />
                            </button>
                            {image.svgCode && (
                              <button 
                                onClick={() => handleDownloadSvg(image.svgCode)}
                                className="p-2 bg-emerald-500/20 hover:bg-emerald-500/40 rounded-lg text-emerald-500 transition-all"
                                title="Baixar Editável (Canva)"
                              >
                                <PenTool size={16} />
                              </button>
                            )}
                            <button 
                              onClick={() => handleDeleteImage(image.id!)}
                              className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-lg text-red-500 transition-all"
                              title="Excluir"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section id="video-gallery">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Video size={20} className="text-purple-500" /> Galeria de Vídeos
                  </h2>
                </div>
                
                {videos.length === 0 ? (
                  <div className="text-center py-20 border-2 border-dashed border-zinc-800 rounded-3xl">
                    <p className="text-zinc-500">Nenhum vídeo salvo ainda.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {videos.slice(0, 6).map(video => (
                      <VideoGalleryItem 
                        key={video.id} 
                        video={video} 
                        onDelete={handleDeleteVideo} 
                        onDownload={handleDownloadImage} 
                      />
                    ))}
                  </div>
                )}
              </section>
            </motion.div>
          )}

          {activeTab === 'clients' && (
            <motion.div 
              key="clients"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <header className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Gestão de Clientes</h1>
                  <p className="text-zinc-400">Gerencie múltiplos projetos e marcas separadamente.</p>
                </div>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-1 h-fit space-y-4">
                  <h3 className="text-lg font-bold">Novo Cliente</h3>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-500">Nome do Cliente/Projeto</label>
                      <input
                        type="text"
                        value={newClient.name}
                        onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-500">Descrição</label>
                      <textarea
                        value={newClient.description}
                        onChange={(e) => setNewClient({ ...newClient, description: e.target.value })}
                        className="w-full h-24 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-all resize-none"
                      />
                    </div>
                    <Button onClick={handleCreateClient} loading={isCreatingClient} className="w-full">
                      <Plus size={18} /> Adicionar Cliente
                    </Button>
                  </div>
                </Card>

                <div className="lg:col-span-2 space-y-4">
                  {clients.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-zinc-800 rounded-3xl">
                      <p className="text-zinc-500">Nenhum cliente cadastrado.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {clients.map(client => (
                        <Card key={client.id} className="relative group">
                          <button 
                            onClick={() => handleDeleteClient(client.id!)}
                            className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                              <Briefcase size={20} />
                            </div>
                            <h4 className="font-bold text-lg">{client.name}</h4>
                          </div>
                          <p className="text-sm text-zinc-400 line-clamp-2 mb-4">{client.description || 'Sem descrição.'}</p>
                          <div className="flex gap-2">
                            <Button variant="secondary" className="text-xs py-1.5 px-3" onClick={() => {
                              setSelectedClientId(client.id!);
                              setActiveTab('content');
                            }}>
                              Criar Conteúdo
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'calendar' && (
            <motion.div 
              key="calendar"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Calendário de Conteúdo</h1>
                  <p className="text-zinc-400">Planeje e visualize sua estratégia de postagens.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={calendarSelectedClientId}
                    onChange={(e) => setCalendarSelectedClientId(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all"
                  >
                    <option value="">Todos os Clientes</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                  
                  <Button variant="secondary" onClick={handleGenerateIdeas} className="text-sm px-4">
                    <Sparkles size={16} className="text-emerald-500" /> Gerar Ideias
                  </Button>
                  
                  <Button variant="secondary" onClick={handleGenerateTrends} className="text-sm px-4">
                    <Filter size={16} className="text-blue-500" /> Tendências
                  </Button>

                  <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1">
                    <button 
                      onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
                      className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <span className="px-4 font-bold min-w-[140px] text-center">
                      {currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                    </span>
                    <button 
                      onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
                      className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              </header>

              <div className="grid grid-cols-7 gap-px bg-zinc-800 border border-zinc-800 rounded-2xl overflow-hidden">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                  <div key={day} className="bg-zinc-900/80 p-4 text-center text-xs font-bold text-zinc-500 uppercase tracking-widest">
                    {day}
                  </div>
                ))}
                
                {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className="bg-zinc-900/30 h-40" />
                ))}

                {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const dayContents = contents.filter(c => c.scheduledDate === dateStr);
                  
                  return (
                    <div key={day} className="bg-zinc-900/50 h-40 p-3 border-t border-zinc-800 group hover:bg-zinc-800/50 transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-sm font-bold ${new Date().toISOString().split('T')[0] === dateStr ? 'text-emerald-500' : 'text-zinc-500'}`}>
                          {day}
                        </span>
                        <button 
                          onClick={() => {
                            setScheduledDate(dateStr);
                            setActiveTab('content');
                          }}
                          className="p-1 text-zinc-600 hover:text-emerald-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <div className="space-y-1 overflow-y-auto max-h-[100px] scrollbar-hide">
                        {dayContents.map(content => (
                          <div 
                            key={content.id} 
                            onClick={() => {
                              setGeneratedContent(content.content);
                              setActiveTab('content');
                            }}
                            className="text-[10px] p-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 truncate cursor-pointer hover:bg-emerald-500/20 transition-all"
                          >
                            {content.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'content' && (
            <motion.div 
              key="content"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <header>
                <h1 className="text-3xl font-bold mb-2">Criador de Conteúdo</h1>
                <p className="text-zinc-400">Gere textos persuasivos para suas redes sociais, anúncios e mais.</p>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">Cliente / Projeto</label>
                      <select
                        value={selectedClientId}
                        onChange={(e) => setSelectedClientId(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-all"
                      >
                        <option value="">Marca Padrão</option>
                        {clients.map(client => (
                          <option key={client.id} value={client.id}>{client.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">Agendar para</label>
                      <input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">O que você quer criar?</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'post', label: 'Post Social Media' },
                        { id: 'ad', label: 'Anúncio (Ads)' },
                        { id: 'email', label: 'E-mail Marketing' },
                        { id: 'blog', label: 'Artigo de Blog' },
                        { id: 'strategy', label: 'Estratégia' }
                      ].map(type => (
                        <button
                          key={type.id}
                          onClick={() => setContentType(type.id as ContentType)}
                          className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                            contentType === type.id 
                              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' 
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Sobre o que é o conteúdo?</label>
                    <textarea
                      value={contentPrompt}
                      onChange={(e) => setContentPrompt(e.target.value)}
                      placeholder="Ex: Um post para Instagram sobre o lançamento de um novo curso de marketing digital focado em iniciantes..."
                      className="w-full h-40 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition-all resize-none"
                    />
                  </div>

                  <Button 
                    onClick={handleGenerateContent} 
                    loading={isGeneratingContent}
                    className="w-full py-4"
                  >
                    <Sparkles size={20} /> Gerar Conteúdo com IA
                  </Button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Resultado</label>
                    <div className="w-full h-[500px] bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 overflow-y-auto prose prose-invert max-w-none">
                      {generatedContent ? (
                        <ReactMarkdown>{generatedContent}</ReactMarkdown>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                          <PenTool size={40} className="mb-4 opacity-20" />
                          <p>O conteúdo gerado aparecerá aqui.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {generatedContent && (
                    <div className="flex gap-4">
                      <Button variant="secondary" className="flex-1" onClick={() => setGeneratedContent('')}>
                        Limpar
                      </Button>
                      <Button className="flex-1" onClick={handleSaveContent}>
                        <Save size={20} /> Salvar no Histórico
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'image' && (
            <motion.div 
              key="image"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <header>
                <h1 className="text-3xl font-bold mb-2">Gerador de Imagens</h1>
                <p className="text-zinc-400">Crie visuais incríveis para suas campanhas usando inteligência artificial.</p>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Cliente / Projeto</label>
                    <select
                      value={selectedImageClientId}
                      onChange={(e) => setSelectedImageClientId(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-all"
                    >
                      <option value="">Marca Padrão</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>{client.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Descreva a imagem que você deseja</label>
                    <textarea
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      placeholder="Ex: Uma pessoa moderna trabalhando em um café com um laptop, estilo minimalista, iluminação suave, cores quentes..."
                      className="w-full h-40 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition-all resize-none"
                    />
                  </div>

                  <Button 
                    onClick={handleGenerateImage} 
                    loading={isGeneratingImage}
                    className="w-full py-4"
                  >
                    <ImageIcon size={20} /> Gerar Imagem com IA
                  </Button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Resultado</label>
                    <div className="w-full aspect-square bg-zinc-900/30 border border-zinc-800 rounded-2xl overflow-hidden flex items-center justify-center">
                      {generatedImage ? (
                        <img src={generatedImage} alt="Gerada" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-zinc-600">
                          <ImageIcon size={40} className="mb-4 opacity-20" />
                          <p>A imagem gerada aparecerá aqui.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {generatedImage && (
                    <div className="flex flex-col gap-3">
                      <div className="flex gap-4">
                        <Button variant="secondary" className="flex-1" onClick={() => {
                          setGeneratedImage(null);
                          setGeneratedSvg(null);
                        }}>
                          Descartar
                        </Button>
                        <Button className="flex-1" onClick={handleSaveImage}>
                          <Save size={20} /> Salvar na Galeria
                        </Button>
                      </div>
                      <Button variant="outline" className="w-full" onClick={() => handleDownloadImage(generatedImage)}>
                        <Download size={20} /> Baixar Imagem
                      </Button>
                      {generatedSvg && (
                        <Button variant="outline" className="w-full border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10" onClick={() => handleDownloadSvg()}>
                          <PenTool size={20} /> Baixar Editável (Canva)
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'video' && (
            <motion.div 
              key="video"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <header>
                <h1 className="text-3xl font-bold mb-2">Gerador de Vídeos</h1>
                <p className="text-zinc-400">Crie vídeos cinematográficos para suas campanhas usando inteligência artificial.</p>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Cliente / Projeto</label>
                    <select
                      value={selectedVideoClientId}
                      onChange={(e) => setSelectedVideoClientId(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-all"
                    >
                      <option value="">Marca Padrão</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>{client.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Descreva o vídeo que você deseja</label>
                    <textarea
                      value={videoPrompt}
                      onChange={(e) => setVideoPrompt(e.target.value)}
                      placeholder="Ex: Um drone voando sobre uma floresta tropical ao nascer do sol, estilo cinematográfico, cores vibrantes..."
                      className="w-full h-40 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition-all resize-none"
                    />
                  </div>

                  <Button 
                    onClick={handleGenerateVideo} 
                    loading={isGeneratingVideo}
                    className="w-full py-4"
                  >
                    <Video size={20} /> Gerar Vídeo com IA
                  </Button>
                  
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <p className="text-xs text-emerald-500 flex items-center gap-2">
                      <Sparkles size={14} />
                      A geração de vídeo pode levar alguns minutos. Por favor, aguarde.
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Resultado</label>
                    <div className="w-full aspect-video bg-zinc-900/30 border border-zinc-800 rounded-2xl overflow-hidden flex items-center justify-center">
                      {generatedVideo ? (
                        <video 
                          src={generatedVideo.url} 
                          controls 
                          className="w-full h-full object-cover"
                          autoPlay
                          loop
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-zinc-600">
                          <Video size={40} className="mb-4 opacity-20" />
                          <p>O vídeo gerado aparecerá aqui.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {generatedVideo && (
                    <div className="flex flex-col gap-3">
                      <div className="flex gap-4">
                        <Button variant="secondary" className="flex-1" onClick={() => setGeneratedVideo(null)}>
                          Descartar
                        </Button>
                        <Button className="flex-1" onClick={handleSaveVideo}>
                          <Save size={20} /> Salvar na Galeria
                        </Button>
                      </div>
                      <Button variant="outline" className="w-full" onClick={() => handleDownloadImage(generatedVideo.url, 'eugencia-ai-video.mp4')}>
                        <Download size={20} /> Baixar Vídeo
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8 max-w-2xl"
            >
              <header>
                <h1 className="text-3xl font-bold mb-2">Perfil da Marca</h1>
                <p className="text-zinc-400">Configure os detalhes da sua marca para que a IA gere conteúdos mais precisos.</p>
              </header>

              <Card className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">Nome da Marca/Empresa</label>
                  <input
                    type="text"
                    value={userProfile?.brandName || ''}
                    onChange={(e) => updateProfile({ brandName: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">Descrição do Negócio</label>
                  <textarea
                    value={userProfile?.brandDescription || ''}
                    onChange={(e) => updateProfile({ brandDescription: e.target.value })}
                    placeholder="O que sua empresa faz? Quais problemas resolve?"
                    className="w-full h-32 bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-white focus:outline-none focus:border-emerald-500 transition-all resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">Público Alvo</label>
                  <input
                    type="text"
                    value={userProfile?.targetAudience || ''}
                    onChange={(e) => updateProfile({ targetAudience: e.target.value })}
                    placeholder="Ex: Jovens empreendedores de 20-35 anos"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">Voz da Marca (Tom de Voz)</label>
                  <select
                    value={userProfile?.brandVoice || ''}
                    onChange={(e) => updateProfile({ brandVoice: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-all"
                  >
                    <option value="">Selecione um tom</option>
                    <option value="Profissional e Autoritário">Profissional e Autoritário</option>
                    <option value="Amigável e Casual">Amigável e Casual</option>
                    <option value="Inspirador e Motivacional">Inspirador e Motivacional</option>
                    <option value="Engraçado e Irônico">Engraçado e Irônico</option>
                    <option value="Minimalista e Sofisticado">Minimalista e Sofisticado</option>
                  </select>
                </div>

                <div className="pt-4">
                  <p className="text-xs text-zinc-500 italic">
                    * As alterações são salvas automaticamente.
                  </p>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Modal 
        isOpen={isAiModalOpen} 
        onClose={() => setIsAiModalOpen(false)} 
        title={aiModalTitle}
      >
        {isAiLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="animate-spin text-emerald-500" size={40} />
            <p className="text-zinc-400 animate-pulse">Consultando a inteligência artificial...</p>
          </div>
        ) : (
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown>{aiModalContent}</ReactMarkdown>
            <div className="mt-8 pt-6 border-t border-zinc-800 flex justify-end">
              <Button onClick={() => setIsAiModalOpen(false)}>Fechar</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
