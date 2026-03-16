"use client";

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

// Define the model options
const MODEL_OPTIONS = [
  { id: 'gpt-4o-mini', name: 'GPT-4o mini' },
  { id: 'gpt-5-mini', name: 'GPT-5 mini' },
  { id: 'gpt-5.4', name: 'GPT-5.4' },
  { id: 'o4-mini', name: 'o4-mini' },
];

const LANGUAGE_OPTIONS = [
  { id: 'default', name: 'Default (follow system message)' },
  { id: 'python', name: 'Python' },
  { id: 'java', name: 'Java' },
  { id: 'javascript', name: 'JavaScript' },
  { id: 'typescript', name: 'TypeScript' },
  { id: 'cpp', name: 'C++' },
  { id: 'csharp', name: 'C#' },
  { id: 'go', name: 'Go' },
  { id: 'rust', name: 'Rust' },
  { id: 'swift', name: 'Swift' },
  { id: 'kotlin', name: 'Kotlin' },
  { id: 'ruby', name: 'Ruby' },
  { id: 'sql', name: 'SQL' },
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
    
    // Dispatch a custom event to notify the chat component about the settings change
    document.dispatchEvent(new CustomEvent('settingsChanged'));
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
  const getInitialModel = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedModel') || 'gpt-4o-mini';
    }
    return 'gpt-4o-mini';
  };

  const getInitialSystemMessage = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('systemMessage') || DEFAULT_SYSTEM_MESSAGE;
    }
    return DEFAULT_SYSTEM_MESSAGE;
  };

  const getInitialResumeText = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('resumeText') || '';
    }
    return '';
  };

  const getInitialResumeIncluded = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('resumeIncluded') === 'true';
    }
    return false;
  };

  const getInitialLanguage = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('preferredLanguage') || 'default';
    }
    return 'default';
  };

  const [selectedModel, setSelectedModel] = useState(getInitialModel());
  const [systemMessage, setSystemMessage] = useState(getInitialSystemMessage());
  const [resumeText, setResumeText] = useState(getInitialResumeText());
  const [resumeIncluded, setResumeIncluded] = useState(getInitialResumeIncluded());
  const [preferredLanguage, setPreferredLanguage] = useState(getInitialLanguage());
  const [captureToken, setCaptureToken] = useState<string | null>(null);
  const [captureLoading, setCaptureLoading] = useState(false);
  const [azureStatus, setAzureStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [openaiStatus, setOpenaiStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    fetch('/api/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (data.systemMessage != null) {
          setSystemMessage(data.systemMessage);
          localStorage.setItem('systemMessage', data.systemMessage);
        }
        if (data.resumeText != null) {
          setResumeText(data.resumeText);
          localStorage.setItem('resumeText', data.resumeText);
        }
        if (data.resumeIncluded != null) {
          setResumeIncluded(data.resumeIncluded);
          localStorage.setItem('resumeIncluded', String(data.resumeIncluded));
        }
      })
      .catch(() => {});
    fetch('/api/capture/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (data.token) setCaptureToken(data.token);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isOpen]);

  const handleTestAzure = async () => {
    const key = (typeof window !== 'undefined' && localStorage.getItem('azure_token'))
      || process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY || '';
    const region = (typeof window !== 'undefined' && localStorage.getItem('azure_region'))
      || process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION || '';

    if (!key || !region) {
      toast.error('Azure Speech key or region not configured');
      setAzureStatus('error');
      return;
    }

    setAzureStatus('testing');
    try {
      const res = await fetch('/api/azure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, region }),
      });
      const data = await res.json();
      if (data.valid) {
        setAzureStatus('success');
        toast.success('Azure Speech connected', { duration: 2000 });
      } else {
        setAzureStatus('error');
        toast.error(data.error || 'Azure Speech connection failed', { duration: 3000 });
      }
    } catch {
      setAzureStatus('error');
      toast.error('Azure Speech connection failed', { duration: 3000 });
    }
  };

  const handleTestOpenai = async () => {
    setOpenaiStatus('testing');
    try {
      const res = await fetch('/api/openai', { method: 'POST' });
      const data = await res.json();
      if (data.valid) {
        setOpenaiStatus('success');
        toast.success('OpenAI connected', { duration: 2000 });
      } else {
        setOpenaiStatus('error');
        toast.error(data.error || 'OpenAI connection failed', { duration: 3000 });
      }
    } catch {
      setOpenaiStatus('error');
      toast.error('OpenAI connection failed', { duration: 3000 });
    }
  };

  const handleGenerateToken = async () => {
    setCaptureLoading(true);
    try {
      const res = await fetch('/api/capture/token', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.token) {
        setCaptureToken(data.token);
        toast.success('Capture token generated');
      } else {
        toast.error('Failed to generate token');
      }
    } catch {
      toast.error('Failed to generate token');
    } finally {
      setCaptureLoading(false);
    }
  };

  const handleSave = async () => {
    localStorage.setItem('selectedModel', selectedModel);
    localStorage.setItem('systemMessage', systemMessage);
    localStorage.setItem('resumeText', resumeText);
    localStorage.setItem('resumeIncluded', String(resumeIncluded));
    localStorage.setItem('preferredLanguage', preferredLanguage);

    onSettingsUpdate(selectedModel, systemMessage);
    onOpenChange(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, resumeIncluded, systemMessage }),
      });
      if (res.ok) {
        toast.success('Settings saved successfully!', { duration: 1300 });
      } else {
        toast.error('Settings saved locally but failed to sync to server');
      }
    } catch {
      toast.error('Settings saved locally but failed to sync to server');
    }
  };

  const statusVariant = (s: typeof azureStatus) =>
    s === 'success' ? 'default' : s === 'error' ? 'destructive' : 'outline';

  const statusLabel = (s: typeof azureStatus, name: string) => {
    if (s === 'testing') return 'Testing...';
    if (s === 'success') return `${name} — Connected`;
    if (s === 'error') return `${name} — Failed (Retry)`;
    return `Test ${name}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[725px] max-h-[90vh] overflow-y-auto"
        forceMount
        onKeyDown={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>AI Assistant Settings</DialogTitle>
          <DialogDescription>
            Configure your AI model, system message, and test service connections
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          {/* --- AI Model Section --- */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold border-b pb-2">AI Model</h3>
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

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="language" className="text-right">
                Code Language
              </Label>
              <Select
                value={preferredLanguage}
                onValueChange={setPreferredLanguage}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <SelectItem key={lang.id} value={lang.id}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="systemMessage" className="text-right">
                System Message
              </Label>
              <Textarea
                id="systemMessage"
                value={systemMessage}
                onChange={(e) => setSystemMessage(e.target.value)}
                className="col-span-3 h-[200px]"
                placeholder="Enter system message"
              />
            </div>
          </div>

          {/* --- Resume Section --- */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-semibold">Resume</h3>
              <button
                type="button"
                role="switch"
                aria-checked={resumeIncluded}
                onClick={() => setResumeIncluded(!resumeIncluded)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  resumeIncluded ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block size-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                    resumeIncluded ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="resumeText" className="text-right">
                Resume Text
              </Label>
              <Textarea
                id="resumeText"
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                className={`col-span-3 h-[150px] transition-opacity ${!resumeIncluded ? 'opacity-40' : ''}`}
                placeholder="Paste your resume text here..."
                disabled={!resumeIncluded}
              />
            </div>
            {!resumeIncluded && resumeText && (
              <p className="text-xs text-muted-foreground text-right">Resume saved but not included in AI context</p>
            )}
          </div>

          {/* --- Connection Section --- */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold border-b pb-2">Connection</h3>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">OpenAI</Label>
              <div className="col-span-3">
                <Button
                  type="button"
                  variant={statusVariant(openaiStatus)}
                  onClick={handleTestOpenai}
                  disabled={openaiStatus === 'testing'}
                  className="w-full"
                >
                  {statusLabel(openaiStatus, 'OpenAI')}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Azure Speech</Label>
              <div className="col-span-3">
                <Button
                  type="button"
                  variant={statusVariant(azureStatus)}
                  onClick={handleTestAzure}
                  disabled={azureStatus === 'testing'}
                  className="w-full"
                >
                  {statusLabel(azureStatus, 'Azure Speech')}
                </Button>
              </div>
            </div>
          </div>

          {/* --- Screen Capture Section --- */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold border-b pb-2">Screen Capture</h3>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Agent Token</Label>
              <div className="col-span-3 space-y-2">
                {captureToken ? (
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-muted px-2 py-1 text-xs break-all select-all">
                      {captureToken}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(captureToken);
                        toast.success('Token copied');
                      }}
                    >
                      Copy
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateToken}
                      disabled={captureLoading}
                    >
                      Regenerate
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    onClick={handleGenerateToken}
                    disabled={captureLoading}
                    className="w-full"
                  >
                    {captureLoading ? 'Generating...' : 'Generate Token'}
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">
                  Paste this token into <code>tools/capture-agent/.env</code> on your MacBook to enable remote screen capture.
                </p>
              </div>
            </div>
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