"use client";

import { Message } from "ai";
import { useState, useCallback } from "react";

import { Chat as PreviewChat } from "@/components/custom/chat";
import { LiveTranscript } from "@/components/custom/live-transcript";

// Component for the draggable resizer
function Resizer({ onResize }: { onResize: (newPosition: number) => void }) {
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    // Get the container and its dimensions
    const container = document.getElementById("resizable-container");
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      // Calculate the absolute position of the mouse relative to the container
      const mousePosition = moveEvent.clientX - containerRect.left;
      
      // Convert to percentage of container width
      const positionPercentage = (mousePosition / containerWidth) * 100;
      
      // Set the new position directly rather than using delta
      onResize(positionPercentage);
      
      // Prevent text selection during drag
      moveEvent.preventDefault();
    };
    
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [onResize]);
  
  return (
    <div
      className="w-1 bg-gray-300 hover:bg-gray-400 cursor-col-resize active:bg-blue-500 shrink-0 flex items-center justify-center"
      onMouseDown={handleMouseDown}
    >
      {/* Add visual handle dots */}
      <div className="flex flex-col gap-1">
        <div className="size-1 rounded-full bg-gray-500"></div>
        <div className="size-1 rounded-full bg-gray-500"></div>
        <div className="size-1 rounded-full bg-gray-500"></div>
      </div>
    </div>
  );
}

export function ResizableLayout({ 
  chatId, 
  initialMessages 
}: { 
  chatId: string;
  initialMessages: Array<Message>;
}) {
  // percentage of total width
  const [leftPanelWidth, setLeftPanelWidth] = useState(20); 
  
  const handleResize = useCallback((newPositionPercentage: number) => {
    // Directly set the width to the mouse position with constraints
    // Limit the resize range between 15% and 50%
    const newWidth = Math.min(Math.max(newPositionPercentage, 15), 50);
    setLeftPanelWidth(newWidth);
  }, []);

  return (
    <div id="resizable-container" className="flex h-screen p-2">
      {/* Live transcript Chat component */}
      <div 
        className="flex-1 pt-12 border rounded-md p-2"
        style={{ width: `${leftPanelWidth}%` }}
      >
        <div className="text-xs">
          <LiveTranscript />
        </div>
      </div>

      {/* Resizer handle */}
      <Resizer onResize={handleResize} />

      {/* Main Chat component with input */}
      <div 
        className="border rounded-md p-2 overflow-hidden"
        style={{ width: `${100 - leftPanelWidth}%` }}
      >
        <PreviewChat id={chatId} initialMessages={initialMessages} />
      </div>
      
    </div>
  );
}