'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Check, Camera, Clock, CheckCircle2, ChevronLeft, Building2 } from 'lucide-react'

export default function MobileChecklistDemo() {
  const [tasks, setTasks] = React.useState([
    { id: 1, text: 'Clean and disinfect all toilets and urinals (inside and out).', completed: true, requiresPhoto: false },
    { id: 2, text: 'Clean and polish sinks, mirrors, and fixtures (no streaks).', completed: false, requiresPhoto: false },
    { id: 3, text: 'Sweep and wet-mop floors with disinfectant.', completed: false, requiresPhoto: false },
    { id: 4, text: 'Refill toilet paper and hand soap dispensers.', completed: false, requiresPhoto: true, photoTaken: false },
    { id: 5, text: 'Empty sanitary bins and replace liners.', completed: false, requiresPhoto: false },
  ])

  const [time, setTime] = React.useState(0)

  // Simple timer effect for the demo
  React.useEffect(() => {
    const interval = setInterval(() => setTime((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const completedCount = tasks.filter(t => t.completed).length
  const progressPercent = (completedCount / tasks.length) * 100
  const isAllComplete = completedCount === tasks.length

  const toggleTask = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
  }

  const takePhoto = (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    // Simulate taking a photo
    setTasks(tasks.map(t => t.id === id ? { ...t, photoTaken: true, completed: true } : t))
  }

  return (
    <div className="bg-[#E4E4E7] min-h-screen p-4 sm:p-8 flex items-center justify-center font-sans">
      
      {/* Mobile Device Constraint Container */}
      <div className="w-full max-w-[400px] h-[800px] bg-[#FAFAFA] relative overflow-hidden shadow-2xl rounded-[2rem] border-[8px] border-[#09090B] flex flex-col">
        
        {/* Dynamic Island / Status Bar Spacer (Fake) */}
        <div className="h-6 w-full bg-[#FAFAFA]" />

        {/* TOP BAR */}
        <div className="px-5 py-4 bg-[#FFFFFF] border-b border-[#E4E4E7] sticky top-0 z-10">
          <div className="flex items-center justify-between mb-3">
            <button className="p-1.5 -ml-1.5 text-[#71717A] hover:bg-[#F4F4F5] rounded-full transition-colors">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F4F4F5] rounded-full">
              <Clock className="w-3.5 h-3.5 text-[#71717A]" />
              <span className="text-xs font-mono font-bold tracking-tight text-[#09090B]">{formatTime(time)}</span>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="p-2 bg-[#F4F4F5] rounded-lg mt-0.5">
              <Building2 className="w-4 h-4 text-[#09090B]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#09090B] leading-tight">Apex Tech Solutions</h2>
              <p className="text-xs text-[#71717A] mt-0.5">Restroom Sanitation</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717A]">Progress</span>
              <span className="text-[10px] font-bold text-[#09090B]">{completedCount}/{tasks.length} Tasks</span>
            </div>
            <div className="h-1.5 w-full bg-[#F4F4F5] rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-[#09090B]"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>

        {/* CHECKLIST CONTENT */}
        <div className="flex-1 overflow-y-auto p-5 pb-32 space-y-3">
          {tasks.map((task) => (
            <motion.div 
              key={task.id}
              onClick={() => {
                if (task.requiresPhoto && !task.photoTaken) return; // Force them to take photo
                toggleTask(task.id)
              }}
              whileTap={{ scale: 0.98 }}
              className={`p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                task.completed 
                  ? 'bg-[#F4F4F5] border-[#E4E4E7]' 
                  : 'bg-[#FFFFFF] border-[#09090B] shadow-[0_4px_0_0_#09090B]'
              }`}
            >
              <div className="flex gap-4 items-start">
                {/* Oversized Checkbox */}
                <div className={`mt-0.5 shrink-0 w-7 h-7 rounded-md border-2 flex items-center justify-center transition-colors ${
                  task.completed 
                    ? 'bg-[#10B981] border-[#10B981]' 
                    : 'bg-[#FFFFFF] border-[#E4E4E7]'
                }`}>
                  {task.completed && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                </div>

                {/* Task Text */}
                <div className="flex-1">
                  <p className={`text-sm font-medium leading-snug transition-colors ${
                    task.completed ? 'text-[#71717A] line-through' : 'text-[#09090B]'
                  }`}>
                    {task.text}
                  </p>

                  {/* Photo Requirement Logic */}
                  {task.requiresPhoto && !task.photoTaken && (
                    <button 
                      onClick={(e) => takePhoto(e, task.id)}
                      className="mt-3 flex items-center gap-2 w-full justify-center bg-[#E4E4E7] hover:bg-[#D4D4D8] text-[#09090B] py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                      Add Photo Proof
                    </button>
                  )}
                  {task.requiresPhoto && task.photoTaken && (
                    <div className="mt-3 flex items-center gap-2 text-[#10B981] text-xs font-bold uppercase tracking-widest bg-[#10B981]/10 px-3 py-2 rounded-lg w-fit">
                      <CheckCircle2 className="w-4 h-4" />
                      Photo Attached
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* BOTTOM STICKY ACTION */}
        <div className="absolute bottom-0 left-0 w-full p-5 bg-gradient-to-t from-[#FAFAFA] via-[#FAFAFA] to-transparent pt-12">
          <button 
            disabled={!isAllComplete}
            className={`w-full py-4 rounded-xl flex items-center justify-center text-sm font-bold uppercase tracking-widest transition-all duration-300 ${
              isAllComplete 
                ? 'bg-[#09090B] text-white shadow-[0_4px_14px_0_rgba(0,0,0,0.39)] translate-y-0' 
                : 'bg-[#E4E4E7] text-[#A1A1AA] cursor-not-allowed translate-y-2'
            }`}
          >
            {isAllComplete ? 'Complete Job' : 'Complete All Tasks'}
          </button>
        </div>

      </div>
    </div>
  )
}
