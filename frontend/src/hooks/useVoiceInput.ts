import { useState, useEffect, useCallback } from 'react';

interface VoiceCommand {
  action: string;
  amount?: number;
  category?: string;
  notes?: string;
  date?: string;
}

interface VoiceState {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  confidence: number;
  error: string | null;
}

export const useVoiceInput = () => {
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isListening: false,
    isSupported: false,
    transcript: '',
    confidence: 0,
    error: null,
  });

  const [recognition, setRecognition] = useState<any>(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';
      recognitionInstance.maxAlternatives = 1;

      recognitionInstance.onstart = () => {
        setVoiceState(prev => ({ ...prev, isListening: true, error: null }));
      };

      recognitionInstance.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setVoiceState(prev => ({
          ...prev,
          transcript: finalTranscript || interimTranscript,
          confidence: event.results[event.results.length - 1]?.[0]?.confidence || 0,
        }));
      };

      recognitionInstance.onerror = (event: any) => {
        let errorMessage = 'Speech recognition error';
        
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'No speech detected';
            break;
          case 'audio-capture':
            errorMessage = 'Microphone not available';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone permission denied';
            break;
          case 'network':
            errorMessage = 'Network error';
            break;
          default:
            errorMessage = `Error: ${event.error}`;
        }

        setVoiceState(prev => ({
          ...prev,
          isListening: false,
          error: errorMessage,
        }));
      };

      recognitionInstance.onend = () => {
        setVoiceState(prev => ({ ...prev, isListening: false }));
      };

      setRecognition(recognitionInstance);
      setVoiceState(prev => ({ ...prev, isSupported: true }));
    } else {
      setVoiceState(prev => ({ ...prev, isSupported: false }));
    }
  }, []);

  const startListening = useCallback(() => {
    if (recognition && voiceState.isSupported) {
      try {
        recognition.start();
        setVoiceState(prev => ({ ...prev, transcript: '', error: null }));
      } catch (error) {
        setVoiceState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to start speech recognition',
        }));
      }
    }
  }, [recognition, voiceState.isSupported]);

  const stopListening = useCallback(() => {
    if (recognition && voiceState.isListening) {
      recognition.stop();
    }
  }, [recognition, voiceState.isListening]);

  const parseVoiceCommand = useCallback((transcript: string): VoiceCommand | null => {
    const text = transcript.toLowerCase().trim();
    
    // Command patterns
    const patterns = {
      addExpense: /(?:add|create|track|log)\s+(?:an?\s+)?expense\s+(?:of\s+)?(?:\$?(\d+(?:\.\d{2})?)\s+)?(?:for\s+)?(.+?)(?:\s+(?:on|for|dated?)\s+([a-z0-9\s]+))?$/i,
      quickAdd: /(?:\$?(\d+(?:\.\d{2})?)\s+(?:for\s+)?(.+?)(?:\s+(?:on|for|dated?)\s+([a-z0-9\s]+))?)/i,
      simpleAmount: /(?:\$?(\d+(?:\.\d{2})?))/i,
      addIncome: /(?:add|create|track|log)\s+(?:an?\s+)?income\s+(?:of\s+)?(?:\$?(\d+(?:\.\d{2})?)\s+)?(?:for\s+)?(.+?)(?:\s+(?:on|for|dated?)\s+([a-z0-9\s]+))?$/i,
    };

    // Try to match add expense pattern
    let match = text.match(patterns.addExpense);
    if (!match) {
      match = text.match(patterns.quickAdd);
    }

    if (match) {
      const amount = match[1] ? parseFloat(match[1]) : undefined;
      const categoryAndNotes = match[2] ? match[2].trim() : '';
      const dateText = match[3] ? match[3].trim() : '';

      // Extract category and notes
      const category = extractCategory(categoryAndNotes);
      const notes = extractNotes(categoryAndNotes, category);

      return {
        action: 'CREATE_EXPENSE',
        amount,
        category,
        notes,
        date: parseDate(dateText),
      };
    }

    // Simple amount only
    const amountMatch = text.match(patterns.simpleAmount);
    if (amountMatch) {
      return {
        action: 'CREATE_EXPENSE',
        amount: parseFloat(amountMatch[1]),
        category: 'Other',
        notes: transcript,
      };
    }

    return null;
  }, []);

  const extractCategory = (text: string): string => {
    const categories = [
      'food', 'dining', 'restaurant', 'groceries', 'grocery', 'supermarket',
      'transport', 'uber', 'taxi', 'gas', 'fuel', 'petrol',
      'entertainment', 'movie', 'netflix', 'spotify',
      'shopping', 'clothes', 'electronics',
      'healthcare', 'pharmacy', 'doctor', 'medicine',
      'bills', 'utilities', 'rent', 'insurance',
      'other'
    ];

    for (const category of categories) {
      if (text.includes(category)) {
        // Normalize category names
        switch (category) {
          case 'dining':
          case 'restaurant':
            return 'Food';
          case 'groceries':
          case 'grocery':
          case 'supermarket':
            return 'Groceries';
          case 'transport':
          case 'uber':
          case 'taxi':
          case 'gas':
          case 'fuel':
          case 'petrol':
            return 'Transport';
          case 'entertainment':
          case 'movie':
          case 'netflix':
          case 'spotify':
            return 'Entertainment';
          case 'shopping':
          case 'clothes':
          case 'electronics':
            return 'Shopping';
          case 'healthcare':
          case 'pharmacy':
          case 'doctor':
          case 'medicine':
            return 'Healthcare';
          case 'bills':
          case 'utilities':
          case 'rent':
          case 'insurance':
            return 'Bills';
          default:
            return category.charAt(0).toUpperCase() + category.slice(1);
        }
      }
    }

    return 'Other';
  };

  const extractNotes = (text: string, category: string): string => {
    // Remove category from text to get notes
    const categoryLower = category.toLowerCase();
    let notes = text.toLowerCase();

    // Remove category words
    const categoryWords = categoryLower.split(' ');
    for (const word of categoryWords) {
      notes = notes.replace(new RegExp(word, 'g'), '').trim();
    }

    // Clean up extra spaces
    notes = notes.replace(/\s+/g, ' ').trim();

    return notes || text; // Return original if no notes extracted
  };

  const parseDate = (text: string): string | undefined => {
    if (!text) return undefined;

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Handle relative dates
    if (text.includes('today')) {
      return today.toISOString().split('T')[0];
    }
    if (text.includes('yesterday')) {
      return yesterday.toISOString().split('T')[0];
    }
    if (text.includes('tomorrow')) {
      return tomorrow.toISOString().split('T')[0];
    }

    // Handle specific date patterns
    const dateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (dateMatch) {
      let [, day, month, year] = dateMatch;
      
      // Convert 2-digit year to 4-digit
      if (year.length === 2) {
        year = '20' + year;
      }

      const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }

    return undefined;
  };

  const resetTranscript = useCallback(() => {
    setVoiceState(prev => ({ ...prev, transcript: '', error: null }));
  }, []);

  return {
    voiceState,
    startListening,
    stopListening,
    parseVoiceCommand,
    resetTranscript,
  };
};
