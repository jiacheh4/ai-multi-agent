"use client";

import React, { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';


// Define the model options
const MODEL_OPTIONS = [
  { id: 'o3-mini', name: 'ChatGPT o3-mini' },
  { id: 'gpt-4o-mini', name: 'ChatGPT 4o mini' },
  { id: 'gpt-3.5-turbo', name: 'ChatGPT 3.5 turbo' }
];

// Default system message
const DEFAULT_SYSTEM_MESSAGE = `
You are an Interview AI, playing the role of the interviewee (the user). 
    Your responses should be well-structured, using the following formats:
    
    ### For Resume Questions, or behaviour questions, use the STAR method (Situation, Task, Action, Result).
        # Reference details from resume and align response with the job description whenever possible.

    ### For Technical/Coding Questions (ignore this part if it is not coding question)
        # Problem Clarification (be very detailed):
          - Cliarify and Clearly define the problem, purpose, edge cases, and constraints.
          - Ask clarifying questions to ensure complete understanding.
        # Thought process and 3 possible approaches
          - Write your thought process and brainstorm multiple solution approaches.
          - List and explain at least three, starting with 1.naive solution, 2.enhanced solution and 3.more optimal approaches if any.
          - Explain the pros and cons, discussing algorithmic, data structure trade-offs and time complexities.
        # Step-by-Step Explanation:
          - Provide a detailed explanation of the approach you intend to implement.
          - Break down the algorithm or methodology into clear, logical steps.
        # Code:
          - Write the code in python if not specified.
          - Please use the more optimal solution approach
        # Test Cases:
          - Write additional test cases to ensure coverage
        # Complexity analysis
        # Potential Optimization

    ### For Other Questions (general format): 
        # Title
          - Provide a clear and concise title for your response.
        # Key Points:
          - Use **bold** text to highlight important concepts.
          - Consider using _italics_ for emphasis on specific terms.
          - For each key point, provide brief details, reason behind it, or examples to back up your statements. 
          - Ensure these examples are relevant and demonstrate your understanding of the topic.

    Remember:
    - Please format all code block/examples using triple backtick markdown syntax with language specification.
    - Use casual/conversational words, each explain in great detail
    - Ensure your answers are clear, logical, organized, detailed, and easy to read for maximum comprehension.
    - While the structure is essential, remain adaptable. If a question does not neatly fit into one of these categories, merge sections as appropriate while preserving clarity and thoroughness.`;

// Settings Trigger Component
export const ModelSettingsTrigger = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleSettingsUpdate = (model: string, systemMessage: string) => {
    // This is where you can add any additional logic when settings are updated
    console.log('Updated Model:', model);
    console.log('Updated System Message:', systemMessage.slice(0, 50), '...');
  };

  return (
    <>
      <button
        type="button"
        className="w-full text-left"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsSettingsOpen(true);
        }}
      >
        Settings
      </button>

      <ModelSettings 
        isOpen={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        onSettingsUpdate={handleSettingsUpdate}
      />
    </>
  );
};

// Main Settings Component
interface ModelSettingsProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSettingsUpdate: (model: string, systemMessage: string) => void;
}

const ModelSettings: React.FC<ModelSettingsProps> = ({
  isOpen, 
  onOpenChange, 
  onSettingsUpdate
}) => {
  // Read initial settings from localStorage
  const getInitialModel = () => {
    return localStorage.getItem('selectedModel') || 'o3-mini';
  };

  const getInitialSystemMessage = () => {
    return localStorage.getItem('systemMessage') || DEFAULT_SYSTEM_MESSAGE;
  };

  const [selectedModel, setSelectedModel] = useState(getInitialModel());
  const [systemMessage, setSystemMessage] = useState(getInitialSystemMessage());

  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem('selectedModel', selectedModel);
    localStorage.setItem('systemMessage', systemMessage);

    // Call parent update function
    onSettingsUpdate(selectedModel, systemMessage);
    
    // Close the dialog
    onOpenChange(false);
    toast.success('Settings saved successfully!', { duration: 1300 });

  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[725px]" forceMount>
        <DialogHeader>
          <DialogTitle>AI Assistant Settings</DialogTitle>
          <DialogDescription>
            Choose your AI model and system message
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Model Selection */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="model" className="text-right">
              Model
            </Label>
            <Select 
              value={selectedModel} 
              onValueChange={setSelectedModel}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* System Message */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="systemMessage" className="text-right">
              System Message
            </Label>
            <Textarea
              id="systemMessage"
              value={systemMessage}
              onChange={(e) => setSystemMessage(e.target.value)}
              className="col-span-3 h-[300px]"
              placeholder="Enter system message"
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ModelSettings;