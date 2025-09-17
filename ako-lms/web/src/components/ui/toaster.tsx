'use client'

import React from 'react'

interface ToasterProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

export function Toaster({ position = 'bottom-right' }: ToasterProps) {
  return (
    <div 
      className={`fixed z-50 flex flex-col gap-2 p-4 ${
        position === 'top-left' ? 'top-4 left-4' :
        position === 'top-right' ? 'top-4 right-4' :
        position === 'bottom-left' ? 'bottom-4 left-4' :
        'bottom-4 right-4'
      }`}
      role="region"
      aria-label="Toast notifications"
    >
      {/* Toast notifications will be rendered here */}
    </div>
  )
}
