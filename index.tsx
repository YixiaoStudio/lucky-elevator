import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
type FloorType = 'normal' | 'zombie' | 'gold' | 'cat' | 'bomb';
type GameStatus = 'input' | 'moving' | 'arrival' | 'gameover';

interface ProbabilityConfig {
  normal: number;
  zombie: number;
  gold: number;
  cat: number;
  bomb: number;
}

// --- Constants ---
const MIN_FLOOR = -3;
const MAX_FLOOR = 100;

const DEFAULT_PROBS: ProbabilityConfig = {
  bomb: 10,
  zombie: 33,
  gold: 20,
  cat: 17,
  normal: 20
};

// 音效资源
const SOUNDS = {
  click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  moving: 'https://assets.mixkit.co/active_storage/sfx/2006/2006-preview.mp3',
  ding: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
  gold: 'https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3',
  zombie: 'https://assets.mixkit.co/active_storage/sfx/1090/1090-preview.mp3',
  normal: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
  cat: 'https://assets.mixkit.co/active_storage/sfx/154/154-preview.mp3', 
  bomb: 'https://assets.mixkit.co/active_storage/sfx/808/808-preview.mp3'   
};

const App: React.FC = () => {
  const [currentFloor, setCurrentFloor] = useState(1);
  const [targetFloor, setTargetFloor] = useState<number | null>(null);
  const [inputStr, setInputStr] = useState("");
  const [status, setStatus] = useState<GameStatus>('input');
  const [floorType, setFloorType] = useState<FloorType>('normal');
  const [displayedFloor, setDisplayedFloor] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // 概率权重设置
  const [probs, setProbs] = useState<ProbabilityConfig>(DEFAULT_PROBS);

  const movingAudioRef = useRef<HTMLAudioElement | null>(null);

  const playSound = (key: keyof typeof SOUNDS, loop: boolean = false) => {
    if (isMuted) return;
    const audio = new Audio(SOUNDS[key]);
    audio.loop = loop;
    audio.play().catch(() => {});
    return audio;
  };

  const handleNumClick = (num: string) => {
    if (status !== 'input') return;
    playSound('click');
    if (inputStr.length >= 3) return;
    if (num === '-' && inputStr === "") { setInputStr("-"); return; }
    if (num === '-' && inputStr !== "") return;
    setInputStr(prev => prev + num);
  };

  const clearInput = () => {
    playSound('click');
    setInputStr("");
  };

  const startJourney = () => {
    const target = parseInt(inputStr || "1");
    if (isNaN(target) || target < MIN_FLOOR || target > MAX_FLOOR) {
      alert("请输入正确的楼层数字 (-3 到 100) 哦！");
      setInputStr("");
      return;
    }
    playSound('click');
    setTargetFloor(target);
    setStatus('moving');
    setInputStr("");
    movingAudioRef.current = playSound('moving', true) || null;
  };

  useEffect(() => {
    if (status === 'moving' && targetFloor !== null) {
      let step = displayedFloor < targetFloor ? 1 : -1;
      const interval = setInterval(() => {
        setDisplayedFloor(prev => {
          if (prev === targetFloor) {
            clearInterval(interval);
            handleArrival();
            return prev;
          }
          return prev + step;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [status, targetFloor, displayedFloor]);

  const handleArrival = () => {
    if (movingAudioRef.current) {
        movingAudioRef.current.pause();
        movingAudioRef.current = null;
    }
    playSound('ding');

    // 根据权重动态计算
    // Fix: Explicitly cast Object.values to number[] to resolve '+' operator errors in reduce.
    const totalWeight = (Object.values(probs) as number[]).reduce((a, b) => a + b, 0);
    const rand = Math.random() * totalWeight;
    
    let type: FloorType = 'normal';
    let cumulative = 0;

    const entries = [
      { type: 'bomb', weight: probs.bomb },
      { type: 'zombie', weight: probs.zombie },
      { type: 'gold', weight: probs.gold },
      { type: 'cat', weight: probs.cat },
      { type: 'normal', weight: probs.normal },
    ];

    for (const entry of entries) {
      cumulative += entry.weight;
      if (rand <= cumulative) {
        type = entry.type as FloorType;
        break;
      }
    }

    setFloorType(type);
    setCurrentFloor(targetFloor!);
    
    setTimeout(() => {
        if (type === 'bomb') {
            setStatus('gameover');
            playSound('bomb');
        } else {
            setStatus('arrival');
            playSound(type as keyof typeof SOUNDS);
        }
    }, 500);
  };

  const goBackToElevator = () => {
    playSound('click');
    setStatus('input');
    setFloorType('normal');
  };

  const restartGame = () => {
    playSound('click');
    setCurrentFloor(1);
    setDisplayedFloor(1);
    setTargetFloor(null);
    setInputStr("");
    setStatus('input');
    setFloorType('normal');
  };

  const updateProb = (key: keyof ProbabilityConfig, val: string) => {
    const num = parseInt(val) || 0;
    setProbs(prev => ({ ...prev, [key]: num }));
  };

  // Fix: Explicitly cast Object.values to number[] to resolve '+' operator errors in reduce.
  const getTotalProb = () => (Object.values(probs) as number[]).reduce((a, b) => a + b, 0);

  return (
    <div className="relative w-screen h-screen flex flex-col items-center justify-center bg-sky-100 overflow-hidden select-none">
      
      {/* 顶部控制组 */}
      <div className="absolute top-6 right-6 z-[60] flex gap-3">
        <button 
          onClick={() => { playSound('click'); setShowSettings(!showSettings); }}
          className="p-3 bg-white rounded-full shadow-lg text-2xl hover:scale-110 transition-transform"
          title="调整概率"
        >
          ⚙️
        </button>
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className="p-3 bg-white rounded-full shadow-lg text-2xl hover:scale-110 transition-transform"
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
      </div>

      {/* 概率调节面板 */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, x: 100 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 100 }}
            className="absolute top-24 right-6 z-[65] bg-white p-6 rounded-3xl shadow-2xl border-4 border-sky-200 w-72"
          >
            <h3 className="text-xl font-bold text-sky-700 mb-4 flex items-center gap-2">
              🧪 概率实验室
            </h3>
            <div className="space-y-4">
              {[
                { label: '💣 炸弹层', key: 'bomb', color: 'bg-red-500' },
                { label: '🧟 僵尸层', key: 'zombie', color: 'bg-purple-500' },
                { label: '💰 金币层', key: 'gold', color: 'bg-yellow-500' },
                { label: '🐱 猫咪层', key: 'cat', color: 'bg-pink-500' },
                { label: '🏠 普通层', key: 'normal', color: 'bg-emerald-500' },
              ].map((item) => (
                <div key={item.key}>
                  <div className="flex justify-between text-sm font-bold text-slate-600 mb-1">
                    <span>{item.label}</span>
                    <span>{Math.round((probs[item.key as keyof ProbabilityConfig] / getTotalProb()) * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" max="100" 
                    value={probs[item.key as keyof ProbabilityConfig]}
                    onChange={(e) => updateProb(item.key as keyof ProbabilityConfig, e.target.value)}
                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${item.color}`}
                  />
                </div>
              ))}
            </div>
            <button 
              onClick={() => { playSound('click'); setProbs(DEFAULT_PROBS); }}
              className="mt-6 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors"
            >
              恢复默认设置
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Floor Background */}
      <AnimatePresence>
        {status === 'arrival' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 flex items-center justify-around transition-colors duration-1000 ${
              floorType === 'zombie' ? 'bg-purple-900' : 
              floorType === 'gold' ? 'bg-yellow-400' : 
              floorType === 'cat' ? 'bg-pink-300' :
              'bg-emerald-400'
            }`}
          >
            <div className="grid grid-cols-4 gap-12 opacity-80">
                {Array.from({length: 12}).map((_, i) => (
                    <motion.span 
                        key={i}
                        initial={{ scale: 0 }} 
                        animate={{ scale: 1 }} 
                        transition={{ delay: i * 0.05 }}
                        className="text-8xl"
                    >
                        {floorType === 'zombie' ? '🧟' : floorType === 'gold' ? '💰' : floorType === 'cat' ? '🐱' : '🧸'}
                    </motion.span>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. The Elevator Unit */}
      <div className={`relative w-[320px] h-[480px] bg-slate-400 rounded-t-3xl border-8 border-slate-500 shadow-2xl flex flex-col items-center z-10 
        ${status === 'moving' ? 'animate-shaking' : ''} 
        ${status === 'gameover' ? 'grayscale brightness-50 rotate-12 translate-y-20' : ''}`}
      >
        <div className="w-36 h-14 bg-black border-4 border-slate-600 mt-6 rounded-lg flex items-center justify-center">
            <span className={`digital-font text-3xl font-bold ${status === 'gameover' ? 'text-red-900' : 'text-red-500'}`}>
                {status === 'gameover' ? 'ERR' : displayedFloor}
            </span>
        </div>

        <div className="relative w-full flex-grow bg-slate-600 mt-4 border-t-4 border-slate-700 overflow-hidden flex">
            <motion.div 
              animate={{ x: status === 'arrival' ? '-100%' : '0%' }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
              className="absolute left-0 w-1/2 h-full bg-slate-300 border-r-2 border-slate-400 z-20"
            />
            <motion.div 
              animate={{ x: status === 'arrival' ? '100%' : '0%' }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
              className="absolute right-0 w-1/2 h-full bg-slate-300 border-l-2 border-slate-400 z-20"
            />
            <div className="w-full h-full bg-slate-800 flex items-center justify-center relative">
                <motion.div 
                    animate={status === 'moving' ? { y: [0, -4, 0] } : {}}
                    transition={{ repeat: Infinity, duration: 0.4 }}
                    className="text-8xl"
                >
                    {status === 'gameover' ? '😵' : '🧒'}
                </motion.div>
                {status === 'gameover' && (
                    <div className="absolute inset-0 flex items-center justify-center flex-wrap opacity-60 pointer-events-none">
                        {Array.from({length: 20}).map((_, i) => <span key={i} className="text-4xl">💥</span>)}
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* 3. Game Over Overlay */}
      <AnimatePresence>
        {status === 'gameover' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-6 text-center"
          >
            <motion.h1 
              initial={{ scale: 0.5, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              className="text-7xl font-black text-red-600 mb-4"
            >
              GAME OVER!
            </motion.h1>
            <p className="text-3xl text-white mb-12 font-bold">
              砰！！！💥<br/>
              电梯被 100 个炸弹炸坏了！
            </p>
            <button 
              onClick={restartGame}
              className="bg-red-600 text-white px-12 py-6 rounded-3xl text-4xl font-black shadow-[0_10px_0_rgb(153,27,27)] active:translate-y-2 active:shadow-none"
            >
              重置电梯 🛠️
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Top Status Bar */}
      <AnimatePresence>
        {status === 'arrival' && (
          <motion.div 
            initial={{ y: -100 }}
            animate={{ y: 20 }}
            exit={{ y: -100 }}
            className="absolute top-0 w-full flex justify-center z-50 px-4"
          >
            <div className="bg-white/95 backdrop-blur-sm border-4 border-sky-400 px-10 py-4 rounded-full shadow-2xl text-center">
              <h2 className="text-3xl font-bold text-sky-700">
                {currentFloor} 层：
                {floorType === 'zombie' && "🧟 僵尸派对！"}
                {floorType === 'gold' && "💰 亮闪闪金币！"}
                {floorType === 'cat' && "🐱 猫咪天堂！"}
                {floorType === 'normal' && "🏠 温馨楼层"}
              </h2>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Bottom Action UI */}
      <AnimatePresence>
        {status === 'arrival' && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: -40, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-0 w-full flex justify-center z-50"
          >
            <button 
              onClick={goBackToElevator}
              className="bg-white text-sky-600 border-b-8 border-sky-200 px-12 py-5 rounded-3xl text-3xl font-black shadow-2xl hover:scale-105 active:scale-95 transition-all"
            >
              回到电梯 🚀
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. Input Control Panel */}
      <AnimatePresence>
        {status === 'input' && (
          <motion.div 
            initial={{ y: 400 }}
            animate={{ y: 0 }}
            exit={{ y: 400 }}
            className="mt-8 bg-white p-6 rounded-3xl shadow-2xl flex flex-col gap-4 border-t-8 border-sky-300 z-20"
          >
            <div className="flex justify-between items-center mb-1 px-2">
                <span className="text-xl font-bold text-slate-700">去哪一层？</span>
                <div className="bg-slate-100 px-5 py-2 rounded-xl text-3xl font-black w-24 text-center text-sky-600 border-2 border-sky-100">
                    {inputStr || "1"}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, '-', 0].map(n => (
                <button
                  key={n}
                  onClick={() => handleNumClick(n.toString())}
                  className="w-16 h-16 bg-sky-400 text-white text-3xl font-bold rounded-2xl shadow-[0_4px_0_rgb(14,165,233)] hover:bg-sky-500 active:shadow-none active:translate-y-1 transition-all"
                >
                  {n}
                </button>
              ))}
              <button onClick={clearInput} className="w-16 h-16 bg-red-400 text-white text-2xl font-bold rounded-2xl shadow-[0_4px_0_rgb(239,68,68)]">清空</button>
            </div>

            <button 
                onClick={startJourney}
                className="w-full bg-green-500 text-white py-5 rounded-2xl text-3xl font-black shadow-[0_6px_0_rgb(22,163,74)] hover:bg-green-600 active:shadow-none active:translate-y-1 transition-all"
            >
              出发咯！✨
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-6 text-slate-400 font-bold text-sm bg-white/50 px-4 py-1 rounded-full">
          范围 -3 到 100 | 您可以点击齿轮调整惊喜出现的概率
      </div>

      <style>{`
        @keyframes shaking {
            0% { transform: translate(1px, 1px) rotate(0deg); }
            25% { transform: translate(-1px, 1px) rotate(-0.5deg); }
            50% { transform: translate(1px, -1px) rotate(0.5deg); }
            75% { transform: translate(-1px, -1px) rotate(0deg); }
            100% { transform: translate(1px, 1px) rotate(0deg); }
        }
        .animate-shaking {
            animation: shaking 0.2s infinite ease-in-out;
        }
        input[type='range']::-webkit-slider-thumb {
            appearance: none;
            width: 20px;
            height: 20px;
            background: white;
            border: 3px solid #0ea5e9;
            border-radius: 50%;
            cursor: pointer;
        }
      `}</style>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<App />);
}