import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label } from 'recharts';

const EmotionPlot = ({ data }) => {
  const priorityToEmotion = {
    6: 'joy',
    5: 'surprise',
    4: 'neutral',
    3: 'sadness',
    1: 'disgust',
    0: 'anger',
    2: 'fear'
  };

  const formatTooltip = (value) => {
    const emotion = priorityToEmotion[value];
    return [emotion, 'Emotion'];
  };

  return (
    <div className="bg-gray-900 p-6 rounded-lg shadow-lg">
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timestamp">
            <Label value="Time" offset={-5} position="insideBottom" />
          </XAxis>
          <YAxis>
            <Label value="Emotion" angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} />
          </YAxis>
          <Tooltip formatter={formatTooltip} />
          <Line type="monotone" dataKey="emotion" stroke="#8884d8" activeDot={{ r: 8 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default EmotionPlot;