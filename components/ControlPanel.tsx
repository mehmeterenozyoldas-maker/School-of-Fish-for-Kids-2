import React, { useState, useRef } from 'react';
import { SimulationParams, AnimationMode, ANIMATION_MODE_LABELS, PaletteType, GeometryType } from '../types';
import { PRESETS } from '../constants';
import { Sliders, Zap, Waves, Wind, Activity, Hexagon, Box, Aperture, AlignJustify, ChevronDown, ChevronUp, Settings2, Glasses, MonitorPlay, Fish, Video, Square } from 'lucide-react';

interface ControlPanelProps {
  params: SimulationParams;
  onChange: (newParams: Partial<SimulationParams>) => void;
  onPreset: (presetName: string) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ params, onChange, onPreset }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [editingField, setEditingField] = useState<string | null>(null);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleRange = (key: keyof SimulationParams, value: string) => {
    onChange({ [key]: parseFloat(value) });
  };

  const handleRecord = async () => {
    if (isRecording) {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        return;
    }

    try {
        let stream: MediaStream | null = null;
        let isCanvasStream = false;

        try {
            // Attempt 1: Standard Browser Screen Share (Captures UI + Canvas)
            // This might fail in iframes with restricted permissions
            stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    displaySurface: 'browser',
                } as any,
                audio: false 
            });
        } catch (err) {
            console.warn("Screen sharing disallowed or failed. Falling back to Canvas capture.", err);
            
            // Attempt 2: Direct Canvas Capture (Canvas Only, No UI)
            // Works in most constrained environments
            const canvas = document.querySelector('canvas') as HTMLCanvasElement & { captureStream: (fps: number) => MediaStream };
            if (canvas && typeof canvas.captureStream === 'function') {
                stream = canvas.captureStream(30);
                isCanvasStream = true;
            }
        }

        if (!stream) {
            alert("Unable to initialize recording. Please check browser permissions.");
            return;
        }

        // Use VP9 if available for better quality, fallback to default
        const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9') 
            ? 'video/webm; codecs=vp9' 
            : 'video/webm';

        const recorder = new MediaRecorder(stream, { mimeType });

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                chunksRef.current.push(e.data);
            }
        };

        recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `luminous-fish-${Date.now()}.webm`;
            a.click();
            URL.revokeObjectURL(url);
            
            chunksRef.current = [];
            setIsRecording(false);
            
            // Stop all stream tracks to remove "Sharing" banner (only applies if we got a real media stream)
            stream?.getTracks().forEach(track => track.stop());
        };

        recorder.start();
        setIsRecording(true);
        mediaRecorderRef.current = recorder;

        // If user stops sharing via browser UI (getDisplayMedia only)
        if (!isCanvasStream && stream.getVideoTracks().length > 0) {
            stream.getVideoTracks()[0].onended = () => {
                if (recorder.state !== 'inactive') {
                    recorder.stop();
                }
            };
        }

    } catch (err) {
        console.error("Screen recording failed or cancelled:", err);
        setIsRecording(false);
    }
  };

  const palettes: PaletteType[] = ['natural', 'neon', 'sunset', 'cyber', 'cherry', 'spectral', 'plasma', 'golden', 'frozen'];
  const modes = Object.keys(ANIMATION_MODE_LABELS).map(k => parseInt(k)) as AnimationMode[];

  return (
    <div className="absolute top-4 left-4 z-50 w-full max-w-[360px] text-white font-sans transition-all duration-500 ease-in-out">
      
      {/* Header / Toggle */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer flex items-center justify-between px-4 py-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-t-xl hover:bg-black/50 transition-colors"
      >
        <div className="flex items-center gap-3">
            <div className="p-1.5 bg-sky-500/20 rounded-md text-sky-400">
                <Settings2 size={16} />
            </div>
            <div>
                <h1 className="font-bold text-xs tracking-widest uppercase text-white/80">Simulation</h1>
                <div className="flex items-center gap-1.5 text-sky-300">
                    <span className="text-xs opacity-70">Mode:</span>
                    <span className="font-semibold text-sm">{ANIMATION_MODE_LABELS[params.mode]}</span>
                </div>
            </div>
        </div>
        <div className="text-white/40">
            {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {/* Main Controls */}
      <div className={`
          bg-black/40 backdrop-blur-xl border-x border-b border-white/10 rounded-b-xl overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
          ${isOpen ? 'max-h-[900px] opacity-100' : 'max-h-0 opacity-0 border-none'}
      `}>
        <div className="p-5 space-y-6">
            
            {/* Top Row: Design & Visuals */}
            <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    {/* Design Toggle */}
                    <div className="col-span-2 flex bg-black/30 p-1 rounded-lg border border-white/5">
                        <button
                            onClick={() => onChange({ geometry: 'organic' })}
                            className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-[10px] uppercase font-bold tracking-wider transition-all
                                ${params.geometry === 'organic' ? 'bg-sky-600 text-white shadow-md' : 'text-white/30 hover:text-white/60'}
                            `}
                        >
                            <Fish size={12} /> Organic
                        </button>
                        <button
                            onClick={() => onChange({ geometry: 'voxel' })}
                            className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-[10px] uppercase font-bold tracking-wider transition-all
                                ${params.geometry === 'voxel' ? 'bg-indigo-500 text-white shadow-md' : 'text-white/30 hover:text-white/60'}
                            `}
                        >
                            <Box size={12} /> Voxel
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button 
                        onClick={() => onChange({ stereo: !params.stereo })}
                        className={`flex items-center justify-center gap-2 py-2 rounded-lg border transition-all text-xs font-bold uppercase tracking-wide
                            ${params.stereo 
                                ? 'bg-red-500/20 border-red-500/50 text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.3)]' 
                                : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}
                        `}
                    >
                        <Glasses size={14} />
                        3D Anaglyph
                    </button>
                    <button 
                        onClick={() => onChange({ hologram: !params.hologram })}
                        className={`flex items-center justify-center gap-2 py-2 rounded-lg border transition-all text-xs font-bold uppercase tracking-wide
                            ${params.hologram
                                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.3)]' 
                                : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}
                        `}
                    >
                        <MonitorPlay size={14} />
                        Hologram
                    </button>
                </div>
            </div>

            {/* Mode Selector */}
            <div className="space-y-2">
                <label className="text-xs text-white/60 font-medium ml-1">Kinetic Mode</label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/40 rounded-lg border border-white/5 max-h-[140px] overflow-y-auto custom-scrollbar">
                    {modes.map((m) => (
                        <button
                            key={m}
                            onClick={() => onChange({ mode: m })}
                            className={`py-2 px-1 text-[9px] uppercase tracking-wide font-semibold rounded-md transition-all truncate
                                ${params.mode === m 
                                    ? 'bg-sky-500/20 text-sky-200 border border-sky-500/30' 
                                    : 'text-white/30 hover:text-white/70 hover:bg-white/5 border border-transparent'}
                            `}
                            title={ANIMATION_MODE_LABELS[m]}
                        >
                            {ANIMATION_MODE_LABELS[m]}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-px bg-white/10 w-full" />

            {/* Density & Speed Row */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <ControlRow 
                    label="Density" 
                    value={params.density} min={500} max={6000} step={100} 
                    onChange={(v) => handleRange('density', v)} 
                    isEditing={editingField === 'density'}
                    setEditing={(isEd) => setEditingField(isEd ? 'density' : null)}
                />
                <ControlRow 
                    label="Speed" 
                    value={params.speed} min={0.1} max={4.0} step={0.1} 
                    onChange={(v) => handleRange('speed', v)} 
                    suffix="x" 
                    isEditing={editingField === 'speed'}
                    setEditing={(isEd) => setEditingField(isEd ? 'speed' : null)}
                />
                <ControlRow 
                    label="Vert Fill" 
                    value={params.vertical} min={0.5} max={3.0} step={0.1} 
                    onChange={(v) => handleRange('vertical', v)} 
                    suffix="x" 
                    isEditing={editingField === 'vertical'}
                    setEditing={(isEd) => setEditingField(isEd ? 'vertical' : null)}
                />
                <ControlRow 
                    label="Chaos" 
                    value={params.jitter} min={0} max={0.5} step={0.01} 
                    onChange={(v) => handleRange('jitter', v)} 
                    isEditing={editingField === 'jitter'}
                    setEditing={(isEd) => setEditingField(isEd ? 'jitter' : null)}
                />
            </div>

            {/* Advanced Motion */}
            <div>
                <h3 className="text-[10px] uppercase tracking-widest text-white/40 mb-3 font-semibold">Morphology</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <ControlRow 
                        label="Fish Size" 
                        value={params.fishScale} min={0.3} max={3.0} step={0.1} 
                        onChange={(v) => handleRange('fishScale', v)} 
                        isEditing={editingField === 'fishScale'}
                        setEditing={(isEd) => setEditingField(isEd ? 'fishScale' : null)}
                    />
                    <ControlRow 
                        label="Tail Amp" 
                        value={params.tailAmp} min={0} max={0.8} step={0.01} 
                        onChange={(v) => handleRange('tailAmp', v)} 
                        isEditing={editingField === 'tailAmp'}
                        setEditing={(isEd) => setEditingField(isEd ? 'tailAmp' : null)}
                    />
                </div>
            </div>

            {/* Palette Select */}
             <div className="space-y-2">
                <label className="text-xs text-white/60 font-medium ml-1">Bio-Luminescence</label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/40 rounded-lg border border-white/5">
                    {palettes.map((p) => (
                        <button
                            key={p}
                            onClick={() => onChange({ palette: p })}
                            className={`py-2 text-[10px] uppercase tracking-wide font-semibold rounded-md transition-all
                                ${params.palette === p 
                                    ? 'bg-white/10 text-sky-300 shadow-sm border border-white/10' 
                                    : 'text-white/30 hover:text-white/60 hover:bg-white/5 border border-transparent'}
                            `}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* Presets & Actions Footer */}
        <div className="px-5 py-4 bg-black/40 border-t border-white/5">
            <div className="flex flex-wrap gap-2 justify-center">
                {Object.keys(PRESETS).map(key => (
                    <button
                        key={key}
                        onClick={() => onPreset(key)}
                        className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/5 hover:bg-sky-500/20 border border-white/10 hover:border-sky-500/50 text-white/60 hover:text-sky-200 transition-all"
                    >
                        {key}
                    </button>
                ))}
            </div>

             {/* Record Screen Button */}
             <div className="mt-4 pt-3 border-t border-white/5 flex justify-center">
                <button
                    onClick={handleRecord}
                    className={`
                        flex items-center gap-2 px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all border
                        ${isRecording 
                            ? 'bg-red-500/20 border-red-500 text-red-200 animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.4)]' 
                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white hover:border-white/20'}
                    `}
                >
                    {isRecording ? <Square size={12} fill="currentColor" /> : <Video size={14} />}
                    {isRecording ? 'Stop Recording' : 'Record Screen'}
                </button>
            </div>

             <div className="mt-3 text-center text-[10px] text-white/30 font-mono leading-tight">
                {params.stereo 
                    ? '⚠️ Requires Red/Cyan Anaglyph Glasses' 
                    : 'Interactive: Move Cursor to Repel Fish'}
            </div>
        </div>
      </div>
    </div>
  );
};

const ControlRow: React.FC<{
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    suffix?: string;
    onChange: (val: string) => void;
    isEditing: boolean;
    setEditing: (isEd: boolean) => void;
}> = ({ label, value, min, max, step, suffix = "", onChange, isEditing, setEditing }) => {
    
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        let val = parseFloat(e.target.value);
        if (isNaN(val)) val = value;
        // Clamp
        val = Math.max(min, Math.min(max, val));
        onChange(val.toString());
        setEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if(e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
        }
    };

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-end">
                <label className="text-xs text-white/60 font-medium">{label}</label>
                {isEditing ? (
                     <input 
                        type="number" 
                        autoFocus
                        defaultValue={value}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        className="w-16 text-xs text-sky-200 font-mono bg-sky-900/30 px-1.5 py-0.5 rounded border border-sky-500/50 outline-none"
                    />
                ) : (
                    <span 
                        onClick={() => setEditing(true)}
                        className="text-xs text-sky-200 font-mono bg-sky-900/30 px-1.5 rounded cursor-text hover:bg-sky-800/50 transition-colors"
                    >
                        {value.toFixed(step < 0.1 ? 2 : 1)}{suffix}
                    </span>
                )}
            </div>
            <input 
                type="range" 
                min={min} 
                max={max} 
                step={step} 
                value={value} 
                onChange={(e) => onChange(e.target.value)}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-sky-400 hover:accent-sky-300"
            />
        </div>
    );
};

export default ControlPanel;