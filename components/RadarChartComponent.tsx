
import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { MuscleAnalysis } from '../types';

interface RadarChartComponentProps {
  data: MuscleAnalysis;
}

const RadarChartComponent: React.FC<RadarChartComponentProps> = ({ data }) => {
  const chartData = [
    { subject: 'Chest', score: data.chest.score, fullMark: 10 },
    { subject: 'Abs', score: data.abs.score, fullMark: 10 },
    { subject: 'Arms', score: data.arms.score, fullMark: 10 },
    { subject: 'Back', score: data.back.score, fullMark: 10 },
    { subject: 'Legs', score: data.legs.score, fullMark: 10 },
  ];

  return (
    <div className="w-full h-64 md:h-96">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
          <PolarGrid stroke="#4A4A4A" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#FFFFFF', fontSize: 14 }} />
          <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: 'transparent' }} />
          <Radar name="Physique" dataKey="score" stroke="#31FF75" fill="#31FF75" fillOpacity={0.6} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1A1A1A',
              borderColor: '#31FF75',
              color: '#FFFFFF'
            }}
            labelStyle={{ color: '#FFFFFF', fontWeight: 'bold' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RadarChartComponent;
