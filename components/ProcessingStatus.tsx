"use client"

import React from 'react';
import { Radio, Target, Sliders, Minimize2, Shield, CheckCircle2, Check } from 'lucide-react';

const SPINNER_BARS = [
  { delay: '-1.2s', rotate: '0'   }, { delay: '-1.1s', rotate: '30'  },
  { delay: '-1.0s', rotate: '60'  }, { delay: '-0.9s', rotate: '90'  },
  { delay: '-0.8s', rotate: '120' }, { delay: '-0.7s', rotate: '150' },
  { delay: '-0.6s', rotate: '180' }, { delay: '-0.5s', rotate: '210' },
  { delay: '-0.4s', rotate: '240' }, { delay: '-0.3s', rotate: '270' },
  { delay: '-0.2s', rotate: '300' }, { delay: '-0.1s', rotate: '330' },
];

function Spinner({ size = 24, color = '#a855f7' }: { size?: number; color?: string }) {
  return (
    <div style={{ width: size, height: size }}>
      <style>{`@keyframes spin-fade { 0% { opacity: 0.15 } 100% { opacity: 1 } }`}</style>
      <div className="relative top-1/2 left-1/2" style={{ width: size, height: size }}>
        {SPINNER_BARS.map((b, i) => (
          <div key={i}
            className="absolute h-[8%] w-[24%] -left-[10%] -top-[3.9%] rounded-[5px]"
            style={{ backgroundColor: color, animation: 'spin-fade 1.2s linear infinite', animationDelay: b.delay, transform: `rotate(${b.rotate}deg) translate(146%)` }}
          />
        ))}
      </div>
    </div>
  );
}

const STEPS = [
  { id: 0, label: 'Analyzing',          icon: Radio        },
  { id: 1, label: 'Matching Reference', icon: Target       },
  { id: 2, label: 'Applying EQ',        icon: Sliders      },
  { id: 3, label: 'Compressing',        icon: Minimize2    },
  { id: 4, label: 'Limiting',           icon: Shield       },
  { id: 5, label: 'Done',               icon: CheckCircle2 },
];

export default function ProcessingStatus({
  currentStep = 0,
  orientation = 'vertical',
}: {
  currentStep?: number;
  orientation?: 'vertical' | 'horizontal';
}) {
  const status = (id: number) => id < currentStep ? 'completed' : id === currentStep ? 'active' : 'pending';
  const isVertical = orientation === 'vertical';

  return (
    <div className="p-8 rounded-xl" style={{ backgroundColor: '#0F0E1C' }}>
      <div className={`flex ${isVertical ? 'flex-col space-y-6' : 'flex-row items-center space-x-8'}`}>
        {STEPS.map((step, index) => {
          const s = status(step.id);
          const Icon = step.icon;
          const isLast = index === STEPS.length - 1;

          return (
            <div key={step.id} className={`flex ${isVertical ? 'flex-row' : 'flex-col'} items-center ${isVertical ? 'w-full' : 'flex-1'}`}>
              <div className={`flex ${isVertical ? 'flex-row' : 'flex-col'} items-center ${isVertical ? 'flex-1' : 'w-full'}`}>

                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 border-2
                  ${s === 'completed' ? 'bg-green-500/20 border-green-500' : ''}
                  ${s === 'active'    ? 'bg-purple-500/20 border-purple-500' : ''}
                  ${s === 'pending'   ? 'bg-gray-800/50 border-gray-700' : ''}`}>
                  {s === 'completed' && <Check className="w-6 h-6 text-green-500" />}
                  {s === 'active'    && <Spinner size={24} color="#a855f7" />}
                  {s === 'pending'   && <Icon className="w-6 h-6 text-gray-600" />}
                </div>

                <div className={isVertical ? 'ml-4 flex-1' : 'mt-3 text-center'}>
                  <p className={`text-sm font-medium transition-colors duration-300
                    ${s === 'completed' ? 'text-green-400' : ''}
                    ${s === 'active'    ? 'text-purple-400' : ''}
                    ${s === 'pending'   ? 'text-gray-600' : ''}`}>
                    {step.label}
                  </p>
                  {s === 'active' && <p className="text-xs text-purple-300/60 mt-1">Processing...</p>}
                </div>

                {!isLast && (
                  <div className={`transition-colors duration-300
                    ${isVertical ? 'ml-7 w-0.5 h-6 my-2' : 'mx-4 h-0.5 flex-1'}
                    ${s === 'completed' ? 'bg-green-500' : 'bg-gray-700'}`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
