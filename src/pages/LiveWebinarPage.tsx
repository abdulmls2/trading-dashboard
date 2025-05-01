import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useJitsiControl } from '../contexts/JitsiControlContext';

// Define a few style variations for the watermarks
const watermarkStyles = [
  { opacity: 0.45, fontSize: '1.3rem', color: '#A0AEC0' }, // Light gray
  { opacity: 0.55, fontSize: '1.1rem', color: '#718096' }, // Darker gray
  { opacity: 0.50, fontSize: '1.2rem', color: '#4A5568' }, // Dark gray
  { opacity: 0.48, fontSize: '1.0rem', color: '#2D3748' }, // Very dark gray
  { opacity: 0.40, fontSize: '1.25rem', color: '#1A202C' }, // Almost black
];

// Define the structure for each watermark's state
interface WatermarkState {
  id: number;
  x: number; // Fixed position
  y: number;
  rotation: number; // Fixed rotation
  text: string;
  email: string; // Add email field
  styleIndex: number; // Index for watermarkStyles array
}

// Create a separate component for watermarks
const Watermarks: React.FC<{
  watermarks: WatermarkState[];
  isFullscreen: boolean;
}> = ({ watermarks, isFullscreen }) => {
  return (
    <div 
      id="watermarks-container"
      className="fixed top-0 left-0 w-screen h-screen pointer-events-none"
      style={{ 
        zIndex: 10,  // Lowered z-index to avoid obscuring the button
      }}
    >
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
              filter: isFullscreen ? 'brightness(1.1)' : 'none'
            }}
          >
            <div>{wm.text}</div>
            <div style={{ fontSize: '0.85em' }}>{wm.email}</div>
          </span>
        );
      })}
    </div>
  );
};

const LiveWebinarPage: React.FC = () => {
  const { user } = useAuth();
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [watermarks, setWatermarks] = useState<WatermarkState[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { requestJitsiFullscreen } = useJitsiControl();
  
  // Initialize watermarks with fixed positions and initial styles
  useEffect(() => {
    if (userName && userEmail) {
      // Create watermark with email underneath name instead of beside it
      const watermarkText = userName;
      const watermarkEmail = userEmail;
      
      // First create the corner watermarks
      const cornerWatermarks: WatermarkState[] = [
        // Top-left corner
        { id: 0, x: 3, y: 3, rotation: 0, text: watermarkText, email: watermarkEmail, styleIndex: 0 },
        // Top-right corner
        { id: 1, x: 85, y: 5, rotation: 0, text: watermarkText, email: watermarkEmail, styleIndex: 1 },
        // Bottom-left corner
        { id: 2, x: 5, y: 85, rotation: 0, text: watermarkText, email: watermarkEmail, styleIndex: 2 },
        // Bottom-right corner
        { id: 3, x: 87, y: 87, rotation: 0, text: watermarkText, email: watermarkEmail, styleIndex: 3 }
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
          email: watermarkEmail,
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

  // --- Fullscreen Logic (for our custom button to control Jitsi) ---
  const handleFullscreenToggle = () => {
    // Request fullscreen on the Jitsi container via context function
    if (!document.fullscreenElement) {
      requestJitsiFullscreen(); 
    } else {
       // Exit fullscreen is always global
      document.exitFullscreen(); 
    }
  };

  // Listener for ANY fullscreen change to update state for watermarks
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreenMode = !!document.fullscreenElement;
      setIsFullscreen(isFullscreenMode);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  if (loading) {
    return <div className="p-4">Loading user information...</div>;
  }

  if (!user || !userName) {
    return <div className="p-4">Please log in to view this page.</div>;
  }

  return (
    <>
      {/* Main page content container - No longer handles fullscreen style changes */}
      <div 
        ref={containerRef} 
        className="relative w-full overflow-hidden p-4 bg-gray-900 h-[calc(100vh-50px)]" // Fixed height
        style={{ backgroundColor: '#f9fafb' }} 
      >
        <h1 className={`text-2xl font-bold mb-4 text-center text-gray-900`}>Live Webinar Session</h1>
        
        {/* Watermarks component - Rendered inside, uses fixed positioning */}
        {watermarks.length > 0 && <Watermarks watermarks={watermarks} isFullscreen={isFullscreen} />}
      </div>

      {/* Fullscreen Toggle Button */}
      <button 
        onClick={handleFullscreenToggle}
        className={`fixed bottom-1 right-4 z-20 p-2 rounded ${isFullscreen ? 'bg-gray-700 text-white' : 'bg-blue-500 text-white'} hover:bg-blue-600 transition-colors`}
      >
        {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
      </button>
    </>
  );
};

export default LiveWebinarPage; 