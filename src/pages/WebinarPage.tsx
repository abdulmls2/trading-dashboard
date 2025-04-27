import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

// Define a few style variations for the watermarks
const watermarkStyles = [
  { opacity: 0.25, fontSize: '1.5rem', color: '#A0AEC0' }, // Light gray
  { opacity: 0.35, fontSize: '1.3rem', color: '#718096' }, // Darker gray
  { opacity: 0.30, fontSize: '1.4rem', color: '#4A5568' }, // Dark gray
  { opacity: 0.28, fontSize: '1.25rem', color: '#2D3748' }, // Very dark gray
  { opacity: 0.22, fontSize: '1.6rem', color: '#1A202C' }, // Almost black
];

// Define the structure for each watermark's state
interface WatermarkState {
  id: number;
  x: number; // Fixed position
  y: number;
  rotation: number; // Fixed rotation
  text: string;
  styleIndex: number; // Index for watermarkStyles array
}

// Define the MuxPlayer component type
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'mux-player': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { 
        'playback-id'?: string;
        'metadata-video-title'?: string;
        'metadata-viewer-user-id'?: string;
        style?: React.CSSProperties; // Allow standard CSS properties
        // Add other props as needed
      }, HTMLElement>;
    }
  }
}

const TARGET_CODE = "44775494"; // Define the target code

const WebinarPage: React.FC = () => {
  const { user } = useAuth();
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [watermarks, setWatermarks] = useState<WatermarkState[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [inputCode, setInputCode] = useState<string>(''); // State for user input
  const [isVerified, setIsVerified] = useState<boolean>(false); // State for code verification
  const [error, setError] = useState<string>(''); // State for error message

  // Initialize watermarks with fixed positions and initial styles
  useEffect(() => {
    if (userName && userEmail) {
      // Create watermark text with both name and email
      const watermarkText = `${userName} | ${userEmail}`;
      
      // First create the corner watermarks
      const cornerWatermarks: WatermarkState[] = [
        // Top-left corner
        {
          id: 0,
          x: 3,
          y: 3,
          rotation: 0,
          text: watermarkText,
          styleIndex: 0
        },
        // Top-right corner
        {
          id: 1,
          x: 85,
          y: 5, 
          rotation: 0,
          text: watermarkText,
          styleIndex: 1
        },
        // Bottom-left corner
        {
          id: 2,
          x: 5,
          y: 85,
          rotation: 0,
          text: watermarkText,
          styleIndex: 2
        },
        // Bottom-right corner
        {
          id: 3,
          x: 87,
          y: 87,
          rotation: 0,
          text: watermarkText,
          styleIndex: 3
        }
      ];

      // Then add some additional watermarks distributed across the screen
      // Create zones to ensure better distribution with more space between them
      const zones = [
        { xMin: 15, xMax: 30, yMin: 15, yMax: 30 }, // Upper-left quadrant
        { xMin: 65, xMax: 80, yMin: 15, yMax: 30 }, // Upper-right quadrant
        { xMin: 15, xMax: 30, yMin: 60, yMax: 75 }, // Lower-left quadrant
        { xMin: 65, xMax: 80, yMin: 60, yMax: 75 }, // Lower-right quadrant
        { xMin: 40, xMax: 60, yMin: 35, yMax: 55 }, // Center - more centered and constrained
      ];
      
      // Add watermarks in each zone
      const additionalWatermarks = zones.map((zone, index) => {
        return {
          id: index + 4, // Continue from cornerWatermarks
          x: zone.xMin + Math.random() * (zone.xMax - zone.xMin),
          y: zone.yMin + Math.random() * (zone.yMax - zone.yMin),
          rotation: 0, // No rotation - all text straight
          text: watermarkText,
          styleIndex: Math.floor(Math.random() * watermarkStyles.length),
        };
      });

      // Combine corner and additional watermarks
      setWatermarks([...cornerWatermarks, ...additionalWatermarks]);
    }
  }, [userName, userEmail]); // Depend on both userName and userEmail

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user name:', error);
          setUserName(user.email || 'User'); // Fallback to email or 'User'
        } else {
          setUserName(data?.full_name || user.email || 'User'); // Use full_name or fallback to email or 'User'
        }
        
        // Set the user's email
        setUserEmail(user.email || 'Unknown email');
        
      } catch (err) {
        console.error('Unexpected error fetching user name:', err);
        setUserName(user.email || 'User'); // Fallback on unexpected errors
        setUserEmail('Unknown email');
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, [user]);

  // Interval to change watermark styles
  useEffect(() => {
    if (watermarks.length === 0) return; // Don't run interval if no watermarks

    const intervalId = setInterval(() => {
      setWatermarks(prevWatermarks =>
        prevWatermarks.map(wm => ({
          ...wm,
          styleIndex: (wm.styleIndex + 1) % watermarkStyles.length, // Cycle to the next style
        }))
      );
    }, 3000); // Change style every 3 seconds

    // Cleanup function to clear the interval
    return () => clearInterval(intervalId);
  }, [watermarks]); // Re-run effect if watermarks array itself changes (e.g., initialization)

  // --- Fullscreen Logic ---
  const handleFullscreenToggle = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);
  // --- End Fullscreen Logic ---

  const handleCodeSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (inputCode === TARGET_CODE) {
      setIsVerified(true);
      setError(''); // Clear error on success
    } else {
      setError('Invalid code. Please try again.');
      setInputCode(''); // Clear input on failure
    }
  };

  if (loading) {
    return <div className="p-4">Loading user information...</div>;
  }

  if (!user || !userName) {
    return <div className="p-4">Please log in to view this page.</div>;
  }

  // --- Render Code Input Form if not verified --- 
  if (!isVerified) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100 p-4">
        <h1 className="text-2xl font-bold mb-6">Enter Access Code</h1>
        <form onSubmit={handleCodeSubmit} className="bg-white p-6 rounded shadow-md">
          <input 
            type="password" // Use password type to hide input
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            className="border p-2 w-full mb-4 rounded"
            placeholder="Enter code"
            aria-label="Access Code"
          />
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>} 
          <button 
            type="submit"
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition-colors"
          >
            Submit
          </button>
        </form>
      </div>
    );
  }

  // --- Render Webinar Content if verified --- 
  return (
    <div 
      ref={containerRef} 
      className={`relative w-full overflow-hidden p-4 bg-gray-900 ${isFullscreen ? 'h-screen' : 'h-[calc(100vh-50px)]'}`} // Adjust height based on fullscreen
      style={{ backgroundColor: isFullscreen ? '#000' : '#f9fafb' }} // Ensure black background in fullscreen
    >
      <h1 className={`text-2xl font-bold mb-4 text-center ${isFullscreen ? 'text-white' : 'text-gray-900'}`}>Webinar Session</h1>
      
      {/* Fullscreen Toggle Button */}
      <button 
        onClick={handleFullscreenToggle}
        className={`absolute top-2 right-2 z-20 p-2 rounded ${isFullscreen ? 'bg-gray-700 text-white' : 'bg-blue-500 text-white'} hover:bg-blue-600 transition-colors`}
      >
        {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
      </button>

      {/* Mux Player Integration */}
      <div 
        className="absolute inset-0 flex justify-center items-center pt-12 pb-4 px-4" // Added padding top for title
        style={{ zIndex: 0 }} 
      > 
        <mux-player
          playback-id="YwmcgalZj02BlW5RjKp16IdSRwCil76SXPG6RZmHxcA00"
          metadata-video-title="Your Video Title" 
          metadata-viewer-user-id={user.id} // Use the actual user ID
          style={{
            width: '100%', 
            height: '100%', 
            '--fullscreen-button': 'none' // Only hide native fullscreen button
          } as React.CSSProperties} 
        ></mux-player>
      </div>

      {/* Watermarks overlay */}
      {watermarks.map((wm) => {
         const currentStyle = watermarkStyles[wm.styleIndex]; // Get the current style
         return (
           <span
             key={wm.id}
             className="absolute font-bold select-none pointer-events-none whitespace-nowrap transition-opacity duration-500 ease-in-out"
             style={{
               top: `${wm.y}%`,
               left: `${wm.x}%`,
               transform: `rotate(${wm.rotation}deg)`,
               opacity: currentStyle.opacity,
               fontSize: currentStyle.fontSize,
               color: currentStyle.color,
               willChange: 'opacity', 
               zIndex: 10, // Ensure watermarks are above the player
               // Increase visibility slightly in fullscreen maybe?
               filter: isFullscreen ? 'brightness(1.1)' : 'none' 
             }}
           >
             {wm.text}
           </span>
         );
      })}
    </div>
  );
};

export default WebinarPage; 