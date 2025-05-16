import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  TooltipProps,
  BarProps
} from 'recharts';

// Define interfaces for our data
interface CandlestickData {
  date: string;
  timeLabel: string;
  open: number;
  close: number;
  high: number;
  low: number;
}

// Sample data for the candlestick chart
const generateSampleData = (): CandlestickData[] => {
  const data: CandlestickData[] = [];
  let price = 160;
  
  const hourLabels = [
    '8:00 PM', '9:00 PM', '10:00 AM', '11:00 AM', 
    '12:00 PM', '1:00 PM', '2:00 PM'
  ];
  
  // Generate data points for the last few hours
  for (let i = 0; i < hourLabels.length; i++) {
    // Generate random price movements that create a similar pattern to the design
    const open = price;
    // Create more dramatic price changes to match the reference image
    const close = open + (Math.random() - 0.5) * 20;
    const high = Math.max(open, close) + Math.random() * 10;
    const low = Math.min(open, close) - Math.random() * 10;
    
    data.push({
      date: `Apr ${18 + i}`,
      timeLabel: hourLabels[i],
      open,
      close,
      high,
      low
    });
    
    price = close;
  }
  
  return data;
};

// Custom tooltip component for candlestick chart
interface CandlestickTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: CandlestickData }>;
}

const CandlestickTooltip: React.FC<CandlestickTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-black/80 p-2 border border-gray-800 rounded shadow-lg">
        <p className="text-white font-mono text-xs mb-0.5">{`${data.timeLabel}`}</p>
        <p className="text-white font-mono text-xs mb-0.5">{`O: ${data.open.toFixed(2)}`}</p>
        <p className="text-white font-mono text-xs mb-0.5">{`H: ${data.high.toFixed(2)}`}</p>
        <p className="text-white font-mono text-xs mb-0.5">{`L: ${data.low.toFixed(2)}`}</p>
        <p className="text-white font-mono text-xs">{`C: ${data.close.toFixed(2)}`}</p>
      </div>
    );
  }
  return null;
};

// Interface for candlestick props
interface CandlestickProps {
  x: number;
  y: number;
  width: number;
  height: number;
  open: number;
  close: number;
}

// Interface for line item props
interface LineItemProps {
  x: number;
  y: {
    open: number;
    close: number;
    high: number;
    low: number;
  };
  width: number;
  payload: CandlestickData;
}

export const ExchangeChart: React.FC = () => {
  const [data] = useState<CandlestickData[]>(generateSampleData());
  const [timeframe, setTimeframe] = useState<string>('1D');
  const currentPrice = 210.97;
  
  return (
    <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4 h-full min-h-[430px]">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center space-x-3">
          <h2 className="text-2xl font-bold text-white font-mono tracking-wide">SOL/COMP</h2>
          <span className="text-green-500 font-mono text-xl">+2.92%</span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-white font-mono text-xl tracking-wide">{`${currentPrice.toFixed(2)} USD`}</span>
          <div className="flex items-center space-x-1">
            <button className="p-1.5 bg-[#2a2b2e] rounded-md hover:bg-[#3a3b3e]">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-300">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0l-3.75-3.75M17.25 21L21 17.25" />
              </svg>
            </button>
            <button className="p-1.5 bg-[#2a2b2e] rounded-md hover:bg-[#3a3b3e]">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-300">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
            </button>
            <button className="p-1.5 bg-[#2a2b2e] rounded-md hover:bg-[#3a3b3e]">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-300">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex mb-3">
        <button className="px-4 py-1.5 text-sm text-white rounded-md hover:bg-[#2a2b2e] border border-gray-700 font-mono">1H</button>
        <button className="px-4 py-1.5 text-sm text-white rounded-md hover:bg-[#2a2b2e] border border-gray-700 font-mono ml-1">1D</button>
        <button className="px-4 py-1.5 text-sm text-white rounded-md hover:bg-[#2a2b2e] border border-gray-700 font-mono ml-1">1W</button>
        <button className="px-4 py-1.5 text-sm text-white rounded-md hover:bg-[#2a2b2e] border border-gray-700 font-mono ml-1">1M</button>
        <button className="px-4 py-1.5 text-sm text-white rounded-md hover:bg-[#2a2b2e] border border-gray-700 font-mono ml-1">All</button>
      </div>
      
      <div className="relative h-[320px] bg-transparent rounded mb-3 -mx-2">
        <div className="absolute top-1 right-5 text-gray-400 text-xs font-mono">
          USD
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 10, right: 70, left: 20, bottom: 20 }}
          >
            <XAxis 
              dataKey="timeLabel" 
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#999', fontSize: 10, fontFamily: 'monospace' }}
              padding={{ left: 30, right: 30 }}
              dy={10}
            />
            <YAxis 
              yAxisId="price"
              domain={['auto', 'auto']} 
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#999', fontSize: 10, fontFamily: 'monospace' }}
              orientation="right"
              tickFormatter={(value) => `${value.toFixed(2)}`}
              dx={10}
            />
            <Tooltip content={<CandlestickTooltip />} />
            
            {/* Up candles - green with enhanced vibrance */}
            <Bar
              dataKey={(entry: CandlestickData) => entry.open <= entry.close ? [entry.open, entry.close] : [0, 0]}
              barSize={10}
              fill="#00ff8c"
              yAxisId="price"
            />
            
            {/* Down candles - red with enhanced vibrance */}
            <Bar
              dataKey={(entry: CandlestickData) => entry.open > entry.close ? [entry.close, entry.open] : [0, 0]}
              barSize={10}
              fill="#ff3f5f"
              yAxisId="price"
            />
            
            {/* High and low wicks */}
            {data.map((item, index) => {
              const isUp = item.open <= item.close;
              return (
                <Line
                  key={`wick-${index}`}
                  type="monotone"
                  dataKey={() => [item.low, item.high]}
                  stroke={isUp ? "#00ff8c" : "#ff3f5f"}
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={false}
                  yAxisId="price"
                />
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-between items-center px-2 mt-1 text-center">
        <div className="flex flex-col items-start">
          <span className="text-gray-400 text-sm font-mono">Positions (5)</span>
          <span className="text-green-500 font-mono">pending</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-gray-400 text-sm font-mono">Orders (2)</span>
          <span className="text-white font-mono">active</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-gray-400 text-sm font-mono">Trades</span>
          <span className="text-white font-mono">history</span>
        </div>
      </div>
    </div>
  );
}; 