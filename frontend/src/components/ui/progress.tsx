import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-3 w-full overflow-hidden rounded-full bg-slate-900/50 border border-slate-800/50 shadow-inner",
      className
    )}
    {...props}
  >
    {/* Background glow effect */}
    <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 via-purple-600/10 to-pink-600/10 blur-sm" />
    
    {/* Progress indicator with gradient and animations */}
    <ProgressPrimitive.Indicator
      className="h-full relative flex items-center justify-end transition-all duration-700 ease-out"
      style={{ 
        transform: `translateX(-${100 - (value || 0)}%)`,
        background: 'linear-gradient(90deg, #8b5cf6 0%, #a855f7 50%, #c026d3 100%)',
        boxShadow: '0 0 20px rgba(139, 92, 246, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
      }}
    >
      {/* Animated shine effect */}
      <div 
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"
        style={{
          backgroundSize: '200% 100%',
          animation: 'shimmer 2s infinite linear'
        }}
      />
      
      {/* Pulse effect at the end */}
      {value && value > 0 && (
        <div className="absolute right-0 w-2 h-full bg-white/50 animate-pulse rounded-r-full" />
      )}
    </ProgressPrimitive.Indicator>
    
    {/* Stripes overlay for texture */}
    <div 
      className="absolute inset-0 pointer-events-none opacity-20"
      style={{
        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.05) 10px, rgba(255,255,255,0.05) 20px)'
      }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }