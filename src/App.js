import React, { useState, useEffect, useRef } from 'react';
import { parseBlob } from 'music-metadata-browser';
import ChatComponent from './ChatComponent'; // Adjust the path as necessary
import { FiMessageCircle } from 'react-icons/fi'; // Import an icon for the chat button
import EmotionPlot from './EmotionPlot'; // Import the new EmotionPlot component
import './custom.css'; 

function App() {
  const [showCamera, setShowCamera] = useState(false);
  const [songs, setSongs] = useState([]);
  const [filteredSongs, setFilteredSongs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSong, setSelectedSong] = useState(null);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [emotion, setEmotion] = useState('');
  const [fetchedAlbumArt, setFetchedAlbumArt] = useState(new Set());
  const [isChatVisible, setIsChatVisible] = useState(false); // State to toggle chat visibility
  const [plotData, setPlotData] = useState([]); // State to store plot data
  const [showPlot, setShowPlot] = useState(false); // State to toggle plot visibility
  const audioRef = useRef(null);
  const videoRef = useRef(null);

  const emotionMap = {
    'angry': 'Angry/',
    'happy': 'Happy/',
    'neutral': 'Neutral/',
    'sad': 'Sad/',
    'surprise': 'Surprise/'
  };

  const removeEmotionPrefix = (filename) => {
    for (const prefix in emotionMap) {
      if (filename.startsWith(emotionMap[prefix])) {
        filename = filename.replace(emotionMap[prefix], '');
        break;
      }
    }
    return filename.endsWith('.mp3') ? filename.slice(0, -4) : filename;
  };

  useEffect(() => {
    const loadSongs = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/songs');
        if (response.ok) {
          const songList = await response.json();
          const songsWithDetails = songList.map(song => ({
            fullFilename: song,
            displayName: removeEmotionPrefix(song),
            imageUrl: null, // Placeholder for image
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

  useEffect(() => {
    if (searchQuery === "") {
      setFilteredSongs(songs);
    } else {
      setFilteredSongs(songs.filter(song =>
        song.displayName.toLowerCase().includes(searchQuery.toLowerCase())
      ));
    }
  }, [searchQuery, songs]);

  useEffect(() => {
    const handleTimeUpdate = () => {
      if (audioRef.current && audioRef.current.duration) {
        setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
      }
    };

    const currentAudio = audioRef.current;
    if (currentAudio) {
      currentAudio.addEventListener('timeupdate', handleTimeUpdate);
    }
    return () => {
      if (currentAudio) {
        currentAudio.removeEventListener('timeupdate', handleTimeUpdate);
      }
    };
  }, [selectedSong]);

  const playSong = (identifier) => {
    let song = songs.find(song => song.displayName === identifier);
    if (!song) {
      song = songs.find(song => song.fullFilename === identifier);
    }
    if (song) {
      const songUrl = `http://localhost:3001/songs/${song.fullFilename}`;
      setSelectedSong(songUrl);
      setProgress(0);
      setIsPlaying(true);
    } else {
      console.error('Song not found:', identifier);
    }
  };

  const playRandomSong = () => {
    if (songs.length > 0) {
      const randomSong = songs[Math.floor(Math.random() * songs.length)];
      const songUrl = `http://localhost:3001/songs/${randomSong.fullFilename}`;
      setSelectedSong(songUrl);
      setProgress(0);
      setIsPlaying(true);
    } else {
      console.error('No songs available to play.');
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      if (selectedSong) {
        audioRef.current.src = selectedSong; // Set the audio source
        audioRef.current.play().catch(error => {
          console.error('Error playing audio:', error);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [selectedSong]);

  useEffect(() => {
    if (audioRef.current && selectedSong) {
      if (isPlaying) {
        if (audioRef.current.paused) {
          audioRef.current.play().catch(error => {
            console.error('Error playing audio:', error);
          });
        }
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, selectedSong]);

  const getAlbumArt = async (fileUrl, songIndex) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const metadata = await parseBlob(blob);

      console.log(`Metadata for ${fileUrl}:`, metadata);
      const picture = metadata.common.picture;

      if (picture && picture.length > 0) {
        const imageUrl = URL.createObjectURL(new Blob([picture[0].data]));
        setSongs(prevSongs => {
          const updatedSongs = [...prevSongs];
          updatedSongs[songIndex].imageUrl = imageUrl;
          return updatedSongs;
        });
        console.log(`Album art set for ${fileUrl}`);
      } else {
        console.warn(`No album art found for ${fileUrl}`);
      }
    } catch (error) {
      console.error('Error fetching album art:', error);
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current) {
      console.error('Video element is null');
      return;
    }
  
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
  
    const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
    const formData = new FormData();
    formData.append('file', imageBlob, 'capture.jpg');
  
    try {
      const response = await fetch('http://localhost:3001/detect-emotion', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      console.log('Emotion detected:', data.emotion);
  
      if (data.emotion) {
        setEmotion(data.emotion);
        const emotionPrefix = emotionMap[data.emotion] || '';
        const emotionSongs = songs.filter(song => song.fullFilename.startsWith(emotionPrefix));
        console.log('Filtered songs based on emotion:', emotionSongs);
  
        const updatedSongs = emotionSongs.map(song => ({
          ...song,
          displayName: removeEmotionPrefix(song.fullFilename)
        }));
        setFilteredSongs(updatedSongs);
  
        if (updatedSongs.length > 0) {
          const randomSong = updatedSongs[Math.floor(Math.random() * updatedSongs.length)];
          const songUrl = `http://localhost:3001/songs/${randomSong.fullFilename}`;
          setSelectedSong(songUrl);
          setIsPlaying(true);
        }
      } else {
        console.error('Error detecting emotion:', data.error);
      }
    } catch (error) {
      console.error('Error capturing or sending image:', error);
    }
  
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
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

  useEffect(() => {
    songs.forEach((song, index) => {
      if (!song.imageUrl && !fetchedAlbumArt.has(song.fullFilename)) { // Check if the imageUrl is already set and if the album art has already been fetched
        const songUrl = `http://localhost:3001/songs/${song.fullFilename}`;
        getAlbumArt(songUrl, index);
        setFetchedAlbumArt(prev => new Set(prev).add(song.fullFilename)); // Mark the song as having its album art fetched
      }
    });
  }, [songs, fetchedAlbumArt]);

  const fetchPlot = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/plot');
      if (response.ok) {
        const data = await response.json();
        const plotData = data.timestamps.map((timestamp, index) => ({
          timestamp,
          emotion: data.emotions[index]
        }));
        setPlotData(plotData);
        setShowPlot(true);
      } else {
        console.error('Error fetching plot:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching plot:', error);
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white relative">
      {!showPlot ? (
        <>
          <h1 className="text-5xl font-extrabold mt-8 mb-8 text-white drop-shadow-lg glowing-text">
            Emo Tunes
          </h1>
          <div className="w-full max-w-2xl mb-8">
            <input
              type="text"
              placeholder="Search for songs, artists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-3 px-5 rounded-full bg-gray-800 text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-300 shadow-lg"
            />
          </div>

          <div className="flex gap-4 mb-8">
            <button
              onClick={() => setShowCamera(true)}
              className="glow-on-hover"
            >
              Capture your Emotion
            </button>
            <button
              onClick={fetchPlot}
              className="glow-on-hover"
            >
              Track your mood
            </button>
          </div>
  
          {emotion && (
            <div className="text-2xl font-semibold bg-gray-800 text-pink-400 py-4 px-8 rounded-full mb-8 shadow-lg">
              Detected Emotion: {emotion}
            </div>
          )}
  
          {showCamera && (
            <div className="relative mb-8">
              <video ref={videoRef} autoPlay className="w-full max-w-lg rounded-lg shadow-lg" />
              <button
                onClick={handleCapture}
                className="bg-green-500 py-3 px-6 rounded-full shadow-lg hover:bg-green-600 transition transform hover:scale-105 absolute bottom-4 right-4"
              >
                Capture
              </button>
            </div>
          )}
  
          <div className="mt-16 w-full max-w-4xl">
            <div className="bg-gray-900 shadow-md rounded-lg p-6">
              <div className="relative mb-8">
                <div className="absolute top-0 left-0 w-600 h-2 bg-cyan-500 rounded-lg mb-7" style={{ width: `${progress}%` }}></div>
                <button
                  onClick={() => selectedSong && setIsPlaying(prev => !prev)}
                  className="absolute right-4 top-4 -mt-5 glow-on-hover1 "
                >
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
                <audio ref={audioRef} src={selectedSong} onError={(e) => console.error('Error loading audio:', e)} />
              </div>
              {selectedSong && (
                <div className="text-center mt-4 text-lg font-semibold text-white">
                  Now Playing: {songs.find(song => `http://localhost:3001/songs/${song.fullFilename}` === selectedSong)?.displayName}
                </div>
              )}
            </div>
          </div>
  
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-8 w-full max-w-4xl">
            {filteredSongs.map((song) => (
              <div
                key={song.fullFilename}
                className="bg-gray-900 shadow-md rounded-lg p-6 cursor-pointer hover:bg-gray-800 transition transform hover:scale-105"
                onClick={() => playSong(song.fullFilename)}
              >
                <img
                  src={song.imageUrl || 'https://cdn.pixabay.com/photo/2016/05/16/00/10/music-1394746_1280.jpg'}
                  alt="Album Art"
                  className="w-full h-48 object-cover rounded-lg mb-4 shadow-lg"
                />
                <h3 className="text-lg font-semibold text-white">{song.displayName}</h3>
              </div>
            ))}
          </div>
  
          {/* Floating chat button */}
          <button
            className="fixed bottom-10 right-10 bg-teal-500 p-4 rounded-full shadow-lg hover:bg-teal-600 transition transform hover:scale-110"
            onClick={() => setIsChatVisible(!isChatVisible)}
          >
            <FiMessageCircle size={24} />
          </button>
  
          {/* Conditionally render the ChatComponent */}
          {isChatVisible && (
            <div className="fixed bottom-20 right-10 w-80 h-4/5 bg-white shadow-lg rounded-lg z-50">
              <ChatComponent onPlaySong={playSong} onPlayRandomSong={playRandomSong} />
            </div>
          )}
        </>
      ) : (
        <div className="mt-8 w-full max-w-4xl">
          <h2 className="text-3xl font-bold mb-4">Mood Tracker</h2>
          <EmotionPlot data={plotData} />
          <button
            onClick={() => setShowPlot(false)}
            className="bg-red-500 py-3 px-6 rounded-full shadow-lg hover:bg-red-600 transition transform hover:scale-105 mt-4"
          >
            Back to Home
          </button>
        </div>
      )}
    </div>
  );
}

export default App;