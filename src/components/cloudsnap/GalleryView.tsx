import { ViewType } from '../../pages/Index';
import { X, Upload } from 'lucide-react';
import { Button } from '../ui/button';
import { useState, useRef } from 'react';
import { useToast } from '../ui/use-toast';

// This should match your computer's local IP address
const SERVER_URL = 'http://192.168.0.17:4000';

interface GalleryViewProps {
  onNavigate: (view: ViewType) => void;
}

const GalleryView = ({ onNavigate }: GalleryViewProps) => {
  const [photos, setPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const uploadPromises = Array.from(files).map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch(`${SERVER_URL}/api/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();
        return data.filename;
      } catch (error) {
        console.error('Upload error:', error);
        toast({
          title: "Upload Failed",
          description: `Failed to upload ${file.name}`,
          variant: "destructive",
        });
        return null;
      }
    });

    try {
      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter((filename): filename is string => filename !== null);
      
      if (successfulUploads.length > 0) {
        setPhotos(prev => [...prev, ...successfulUploads]);
        toast({
          title: "Upload Successful",
          description: `Successfully uploaded ${successfulUploads.length} photo(s)`,
        });
      }
    } finally {
      setIsUploading(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="min-h-screen bg-surface-light">
      {/* Header with iPhone safe area padding */}
      <div className="flex items-center justify-between p-4 pt-16 border-b border-separator bg-white/80 backdrop-blur-md">
        <h1 className="text-xl font-semibold font-rubik">Gallery</h1>
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            multiple
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            variant="outline"
            size="sm"
            className="p-2"
          >
            <Upload className="w-5 h-5" />
          </Button>
          <Button
            onClick={() => onNavigate('search')}
            variant="ghost"
            size="sm"
            className="p-2"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Masonry Grid */}
      <div className="p-2">
        <div className="columns-3 gap-1 space-y-1">
          {photos.map((photo, index) => (
            <div
              key={index}
              className={`
                bg-gradient-to-br from-blue-100 to-purple-100 
                rounded-lg overflow-hidden shadow-sm border border-separator
                flex items-center justify-center
                animate-bubble-enter cursor-pointer
                hover:shadow-lg transition-shadow duration-200
                ${index % 3 === 0 ? 'h-32' : index % 3 === 1 ? 'h-40' : 'h-36'}
              `}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <img 
                src={`${SERVER_URL}/uploads/${photo}`}
                alt={`Uploaded photo ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GalleryView;
