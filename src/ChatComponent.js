import React, { useState } from 'react';
import { FaPaperPlane } from 'react-icons/fa';

const ChatComponent = ({ onPlaySong, onPlayRandomSong }) => {
  const [input, setInput] = useState('');
  const [chatLog, setChatLog] = useState([]);

  const handleSend = async () => {
    const response = await fetch('http://127.0.0.1:5000/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input }),
    });

    const data = await response.json();
    setChatLog([...chatLog, { user: input, bot: data.response }]);
    setInput('');

    if (data.song_name) {
      onPlaySong(data.song_name);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black text-gray-200 border border-gray-700 rounded-lg">
      <div className="flex-1 overflow-y-auto p-4">
        {chatLog.map((log, index) => (
          <div key={index} className="mb-4">
            <p className="text-blue-400">You: {log.user}</p>
            <p className="text-green-400">Bot: {log.bot}</p>
          </div>
        ))}
      </div>
      <div className="flex p-4 border-t border-gray-700">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 p-2 bg-gray-800 text-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Type your message..."
        />
        <button
          onClick={handleSend}
          className="bg-blue-600 text-white p-2 rounded-r-lg hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
        >
          <FaPaperPlane className="mr-2" /> Send
        </button>
      </div>
    </div>
  );
};

export default ChatComponent;