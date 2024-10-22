import React, { useState } from 'react';

const ChatComponent = () => {
  const [input, setInput] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [emotions, setEmotions] = useState([]);

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
  };

  const handlePlot = async () => {
    await fetch('http://localhost:5000/plot');
    alert('Plot generated successfully');
  };

  return (
    <div className="flex flex-col h-full">
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
          className="flex-1 p-2 bg-gray-800 text-gray-300 rounded-l-lg focus:outline-none"
        />
        <button
          onClick={handleSend}
          className="bg-blue-600 text-white p-2 rounded-r-lg hover:bg-blue-700 transition"
        >
          Send
        </button>
      </div>
      <button
        onClick={handlePlot}
        className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 transition mt-4"
      >
        Generate Plot
      </button>
    </div>
  );
};

export default ChatComponent;