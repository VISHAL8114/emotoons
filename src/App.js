import React, { useState, useEffect, useRef } from 'react';

function App() {
  const [showCamera, setShowCamera] = useState(false);
  const [songs, setSongs] = useState([]);
  const [filteredSongs, setFilteredSongs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSong, setSelectedSong] = useState(null);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [emotion, setEmotion] = useState('');
  const audioRef = useRef(null);
  const videoRef = useRef(null);

  // Function to remove the emotion prefix from the song filename
  const removeEmotionPrefix = (filename) => {
    // Remove emotion prefix
    for (const prefix in emotionMap) {
      if (filename.startsWith(emotionMap[prefix])) {
        filename = filename.replace(emotionMap[prefix], '');
        break; // Prefix found and removed, stop the loop
      }
    }
  
    // Remove .mp3 extension if present
    if (filename.endsWith('.mp3')) {
      filename = filename.slice(0, -4); // Remove the last 4 characters (".mp3")
    }
  
    return filename;
  };
  

  // Load songs from the backend API
  useEffect(() => {
    const loadSongs = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/songs');
        if (response.ok) {
          const songList = await response.json();
          const songsWithDetails = songList.map(song => ({
            filename: song,
            displayName: removeEmotionPrefix(song),
            imageUrl: 'https://cdn.pixabay.com/photo/2016/05/16/00/10/music-1394746_1280.jpg',  // Default album image (you can customize this)
          }));
          setSongs(songsWithDetails);
          setFilteredSongs(songsWithDetails);
        } else {
          console.error('Error loading songs: ', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching songs:', error);
      }
    };
    loadSongs();
  }, []);

  // Filter songs based on search query
  useEffect(() => {
    if (searchQuery === "") {
      setFilteredSongs(songs);
    } else {
      setFilteredSongs(
        songs.filter(song =>
          song.displayName.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
  }, [searchQuery, songs]);

  // Update progress bar when the song plays
  useEffect(() => {
    const handleTimeUpdate = () => {
      if (audioRef.current && audioRef.current.duration) {
        setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
      }
    };

    if (audioRef.current) {
      audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
      }
    };
  }, [selectedSong]);

  // Play a selected song
  const playSong = (filename) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    const songUrl = `http://localhost:3001/songs/${filename}`;
    setSelectedSong(songUrl);
    setProgress(0);
    setIsPlaying(true);
  };

  // Handle play/pause toggle
  useEffect(() => {
    if (audioRef.current) {
      if (selectedSong) {
        audioRef.current.load();
        audioRef.current.play().catch(error => {
          console.error('Error playing audio:', error);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [selectedSong]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(error => {
          console.error('Error playing audio:', error);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  const togglePlayPause = () => {
    setIsPlaying(prevIsPlaying => !prevIsPlaying);
  };
  const handleCapture = async () => {
    if (!videoRef.current) return;
  
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    
    const imageBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg'));
    
    const formData = new FormData();
    formData.append('file', imageBlob, 'capture.jpg');
  
    try {
      const response = await fetch('http://localhost:3001/detect-emotion', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
  
      // Log the detected emotion for debugging
      console.log('Emotion detected:', data.emotion);
  
      if (data.emotion) {
        setEmotion(data.emotion);
        
        // Check if the emotion exists in the emotion map
        const emotionPrefix = emotionMap[data.emotion] || ''; // Default to empty string if not found
        
        console.log('Emotion prefix:', emotionPrefix); // Log the emotion prefix for debugging
  
        const emotionSongs = songs.filter(song => song.filename.startsWith(emotionPrefix));
        
        // Log filtered songs for debugging
        console.log('Filtered songs based on emotion:', emotionSongs);
        
        const updatedSongs = emotionSongs.map(song => ({
          ...song,
          displayName: removeEmotionPrefix(song.filename) // Update display name without emotion prefix
        }));
  
        setFilteredSongs(updatedSongs);
        
        // Play a random song from the filtered songs
        if (updatedSongs.length > 0) {
          const randomSong = updatedSongs[Math.floor(Math.random() * updatedSongs.length)];
          const songUrl = `http://localhost:3001/songs/${randomSong.filename}`;
          setSelectedSong(songUrl);
          setIsPlaying(true); // Start playing the random song
        }
      } else {
        console.error('Error detecting emotion:', data.error);
      }
    } catch (error) {
      console.error('Error capturing or sending image:', error);
    }
    
    if (videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    setShowCamera(false);
  };
  

  const emotionMap = {
    'angry': 'Angry/',
    'happy': 'Happy/',
    'neutral': 'Neutral/',
    'sad': 'Sad/',
    'surprise': 'Surprise/'
  };
  
  useEffect(() => {
    if (showCamera) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(error => {
          console.error('Error accessing camera:', error);
        });
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    }
  }, [showCamera]);
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-white">
      <h1 className="text-4xl font-bold mt-8 mb-8 text-white">Emo Tunes</h1>
  
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setShowCamera(true)}
          className="bg-blue-600 py-2 px-4 rounded-full shadow-lg hover:bg-blue-700 transition"
        >
          Capture your Emotion
        </button>
      </div>
  
      <div className="w-full max-w-2xl mb-8">
        <input
          type="text"
          placeholder="Search for songs, artists..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full py-3 px-5 rounded-full bg-gray-800 text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-300"
        />
      </div>
  
      {emotion && (
  <div className="text-2xl font-semibold bg-gray-800 text-pink-400 py-4 px-8 rounded-full mb-8">
    Detected Emotion: {emotion}
  </div>
)}

  
      {showCamera && (
        <div className="relative mb-8">
          <video ref={videoRef} autoPlay className="w-full max-w-lg rounded-lg" />
          <button
            onClick={handleCapture}
            className="bg-green-600 py-2 px-4 rounded-full shadow-lg hover:bg-green-700 transition absolute bottom-4 right-4"
          >
            Capture
          </button>
        </div>
      )}
  
      <div className="mt-16 w-full max-w-4xl">
        <div className="bg-gray-900 shadow-md rounded-lg p-6">
          <div className="relative mb-8">
            <div className="absolute top-0 left-0 w-full h-2 bg-pink-500 rounded-lg mb-7" style={{ width: `${progress}%` }}></div>
            <button
              onClick={togglePlayPause}
              className="bg-pink-500  text-white py-2 px-6 rounded-full shadow-lg hover:bg-pink-600 transition absolute right-4 top-4 -mt-5"
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <audio ref={audioRef} src={selectedSong} />
          </div>
        </div>
      </div>
  
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-8 w-full max-w-4xl">
        {filteredSongs.map(song => (
          <div
            key={song.filename}
            className="bg-gray-900 shadow-md rounded-lg p-6 cursor-pointer hover:bg-gray-800 transition"
            onClick={() => playSong(song.filename)}
          >
            <img
              src={song.imageUrl}
              alt="Album Art"
              className="w-full h-48 object-cover rounded-lg mb-4"
            />
            <h3 className="text-lg font-semibold text-white">{song.displayName}</h3>
          </div>
        ))}
      </div>
    </div>
  );
  
}

export default App;
