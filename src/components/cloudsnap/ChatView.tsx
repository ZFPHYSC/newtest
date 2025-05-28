import { useState, useEffect, useRef } from 'react';
import { Camera, CameraResultType, CameraSource, GalleryPhoto } from '@capacitor/camera';
import ChatBubble from './ChatBubble';
import TypingIndicator from './TypingIndicator';
import AccountFormBubble from './AccountFormBubble';
import ThumbnailGridBubble from './ThumbnailGridBubble';
import ProgressBubble from './ProgressBubble';
import { ViewType } from '../../pages/Index';
import { Button } from '../ui/button';
import { Capacitor } from '@capacitor/core';

const HOST =
  Capacitor.getPlatform() === 'ios' && Capacitor.isNativePlatform()
    ? 'http://192.168.0.17:4000' // ← your Mac's IP on Wi-Fi
    : 'http://localhost:4000';

interface ChatViewProps {
  onNavigate: (view: ViewType) => void;
}

type Message = {
  id: string;
  type: 'user' | 'assistant' | 'typing' | 'account-form' | 'account-choice' | 'permission-request' | 'thumbnails' | 'progress' | 'action-button';
  content: string;
  accountType?: 'create' | 'login';
  total?: number;
  fileName?: string;
  processedFiles?: number;
  photoCount?: number;
};

const ChatView = ({ onNavigate }: ChatViewProps) => {
  const [messages, setMessages] = useState<Message[]>([
    { id: 'initial-1', type: 'user', content: 'Get Started' }
  ]);
  const [currentStep, setCurrentStep] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [selectedPhotos, setSelectedPhotos] = useState<GalleryPhoto[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [currentUploadingFileIndex, setCurrentUploadingFileIndex] = useState<number>(0);

  const steps = [
    () => {
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          { id: 'typing-1', type: 'typing', content: '' }
        ]);
      }, 500);
      
      setTimeout(() => {
        setMessages(prev => [
          ...prev.filter(m => m.type !== 'typing'),
          { id: 'assistant-2', type: 'assistant', content: "Let's set up your account. Choose an option:" }
        ]);
        setCurrentStep(1);
      }, 1000);
    },
    () => {
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          { id: 'choice-3', type: 'account-choice', content: 'Account options' }
        ]);
      }, 500);
    }
  ];

  useEffect(() => {
    if (currentStep < steps.length) {
      steps[currentStep]();
    }
  }, [currentStep]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleAccountChoice = (type: 'create' | 'login') => {
    setMessages(prev => [
      ...prev.filter(m => m.type !== 'account-choice'),
      { id: 'user-choice-4', type: 'user', content: type === 'create' ? 'Create Account' : 'Log In' },
      { id: 'form-5', type: 'account-form', content: 'Account form', accountType: type }
    ]);
  };

  const handleAccountSubmit = (email: string, password: string) => {
    setMessages(prev => [
      ...prev.filter(m => m.type !== 'account-form'),
      { id: 'user-form-6', type: 'user', content: `Account created with ${email}` },
      { id: 'typing-7', type: 'typing', content: '' }
    ]);

    setTimeout(() => {
      setMessages(prev => [
        ...prev.filter(m => m.type !== 'typing'),
        { id: 'assistant-8', type: 'assistant', content: '✅ Account created — welcome!' }
      ]);
    }, 1000);

    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        { id: 'assistant-9', type: 'assistant', content: 'I need permission to access your photos to get started.' },
        { id: 'permission-10', type: 'permission-request', content: 'Permission request' }
      ]);
    }, 2000);
  };

  const requestPermissionsAndPickPhotos = async () => {
    try {
      let permStatus = await Camera.checkPermissions();
      if (permStatus.photos !== 'granted' && permStatus.photos !== 'limited') {
        permStatus = await Camera.requestPermissions({ permissions: ['photos'] });
      }

      if (permStatus.photos === 'denied') {
        setMessages(prev => [
          ...prev,
          { id: 'assistant-permission-denied', type: 'assistant', content: 'Photo access denied. Please enable it in settings.' },
          { id: 'permission-újra', type: 'permission-request', content: 'Permission request' }
        ]);
        return;
      }

      const result = await Camera.pickImages({
        quality: 90,
        limit: 10
      });

      if (result.photos.length > 0) {
        handlePhotoSelectionAndInitiateUpload(result.photos);
      } else {
        setMessages(prev => [
          ...prev,
          { id: 'assistant-no-selection', type: 'assistant', content: 'No photos selected.' }
        ]);
      }
    } catch (e) {
      console.error('Error picking images or requesting permissions', e);
      setMessages(prev => [
        ...prev,
        { id: 'assistant-error', type: 'assistant', content: 'Could not access photos. Please ensure permissions are granted.' }
      ]);
    }
  };

  const handlePermissionResponse = (granted: boolean) => {
    if (granted) {
      setMessages(prev => [
        ...prev.filter(m => m.type !== 'permission-request'),
        { id: 'user-permission-11', type: 'user', content: 'Allow Access' },
        { id: 'assistant-12', type: 'assistant', content: 'Great! Accessing your photos...' }
      ]);
      requestPermissionsAndPickPhotos();
    } else {
      setMessages(prev => [
        ...prev.filter(m => m.type !== 'permission-request'),
        { id: 'user-permission-11', type: 'user', content: 'Deny Access' },
        { id: 'assistant-12', type: 'assistant', content: 'I need photo access to help you search. Please allow access to continue.' },
        { id: 'permission-13', type: 'permission-request', content: 'Permission request' }
      ]);
    }
  };

  const handlePhotoSelectionAndInitiateUpload = async (photos: GalleryPhoto[]) => {
    if (photos.length === 0) return;

    setSelectedPhotos(photos);
    setUploadProgress(0);
    setCurrentUploadingFileIndex(0);
    setIsUploading(true);

    setMessages(prev => [
      ...prev,
      { id: `user-photos-selected-${Date.now()}`, type: 'user', content: `Selected ${photos.length} photo(s).` },
      { id: `assistant-uploading-${Date.now()}`, type: 'assistant', content: `Preparing to upload ${photos.length} photo(s)...` },
      {
        id: `progress-batch-${Date.now()}`,
        type: 'progress',
        content: `Uploading 1 of ${photos.length}...`,
        photoCount: photos.length,
        processedFiles: 0,
        total: 100
      }
    ]);

    let done = 0;
    for (const [idx, p] of photos.entries()) {
      try {
        // turn local file into Blob
        const blob = await (await fetch(p.webPath!)).blob();
        const data = new FormData();
        // Ensure unique enough filename, or let server handle it
        data.append('file', blob, `photo_${Date.now()}_${idx}.jpg`);

        await fetch(`${HOST}/api/upload`, { method: 'POST', body: data });

        done += 1;
        const overallProgress = Math.round((done / photos.length) * 100);
        setUploadProgress(overallProgress);
        setCurrentUploadingFileIndex(done);

        setMessages(prev => prev.map(m =>
          m.type === 'progress' && m.photoCount === photos.length ?
          {
            ...m,
            content: `Uploading ${done} of ${photos.length} (${p.webPath?.substring(p.webPath.lastIndexOf('/')+1) || 'photo'})... ${overallProgress}%`,
            processedFiles: done
          } : m
        ));
      } catch (uploadError) {
        console.error('Error uploading photo:', p.webPath, uploadError);
        // Optionally, update UI to show error for this specific file
        // For now, we'll just log it and continue
      }
    }

    setIsUploading(false);
    setSelectedPhotos([]);
    handleUploadComplete(photos.length);
  };

  const handleUploadComplete = (photoCount?: number) => {
    setMessages(prev => [
      ...prev.filter(m => m.type !== 'progress'),
      { id: `assistant-uploaded-${Date.now()}`, type: 'assistant', content: `${photoCount || 'All'} photo(s) uploaded successfully! 👍🏼` },
      { id: `action-post-upload-${Date.now()}`, type: 'action-button', content: 'Start Searching →' }
    ]);
  };

  const handleStartSearching = () => {
    onNavigate('search');
  };

  const renderMessage = (message: Message) => {
    switch (message.type) {
      case 'typing':
        return <TypingIndicator key={message.id} />;
      
      case 'account-choice':
        return (
          <div key={message.id} className="flex justify-start mb-4">
            <div className="bg-white p-4 rounded-2xl rounded-tl-md shadow-sm border border-separator max-w-[80%] animate-bubble-enter">
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => handleAccountChoice('create')}
                  className="bg-accent-primary hover:bg-blue-600 text-white font-rubik"
                >
                  Create Account
                </Button>
                <Button
                  onClick={() => handleAccountChoice('login')}
                  variant="outline"
                  className="border-accent-primary text-accent-primary hover:bg-accent-primary hover:text-white font-rubik"
                >
                  Log In
                </Button>
              </div>
            </div>
          </div>
        );
      
      case 'permission-request':
        return (
          <div key={message.id} className="flex justify-start mb-4">
            <div className="bg-white p-4 rounded-2xl rounded-tl-md shadow-sm border border-separator max-w-[80%] animate-bubble-enter">
              <div className="mb-3">
                <p className="font-rubik text-sm text-gray-700 mb-3">
                  CloudSnap would like to access your photos to help you search and organize them.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => handlePermissionResponse(true)}
                  className="bg-accent-primary hover:bg-blue-600 text-white font-rubik"
                >
                  Allow Access
                </Button>
                <Button
                  onClick={() => handlePermissionResponse(false)}
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 font-rubik"
                >
                  Deny Access
                </Button>
              </div>
            </div>
          </div>
        );
      
      case 'account-form':
        return (
          <div key={message.id} className="flex justify-start mb-4">
            <AccountFormBubble 
              type={message.accountType || 'create'}
              onSubmit={handleAccountSubmit}
            />
          </div>
        );
      
      case 'thumbnails':
        return (
          <div key={message.id} className="flex justify-start mb-4">
            <ThumbnailGridBubble />
          </div>
        );
      
      case 'progress':
        return (
          <div key={message.id} className="flex justify-start mb-4">
            <ProgressBubble 
              currentProgress={uploadProgress}
              total={100}
              fileName={message.content}
              onComplete={() => {
                if (uploadProgress >= 100) {
                   handleUploadComplete(message.photoCount);
                }
              }}
            />
          </div>
        );
      
      case 'action-button':
        return (
          <div key={message.id} className="flex justify-start mb-4">
            <div className="bg-white p-4 rounded-2xl rounded-tl-md shadow-sm border border-separator max-w-[80%] animate-bubble-enter">
              <p className="font-rubik text-sm text-gray-700 mb-3">
                Ready to start searching your photos!
              </p>
              <Button
                onClick={handleStartSearching}
                className="w-full bg-accent-primary hover:bg-blue-600 text-white px-6 py-3 rounded-full font-rubik"
              >
                {message.content}
              </Button>
            </div>
          </div>
        );
      
      default:
        return (
          <ChatBubble key={message.id} type={message.type as 'user' | 'assistant'}>
            {message.content}
          </ChatBubble>
        );
    }
  };

  return (
    <div className="min-h-screen bg-surface-light flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 pb-8 pt-16 md:pt-4">
        {messages.map(renderMessage)}
        <div ref={scrollRef} />
      </div>
    </div>
  );
};

export default ChatView;
