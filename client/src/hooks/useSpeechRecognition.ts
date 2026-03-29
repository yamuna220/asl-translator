import { useCallback, useEffect, useRef, useState } from 'react';

type SpeechCtor = new () => SpeechRecognition;

function getRecognitionCtor(): SpeechCtor | null {
  const w = window as Window & {
    SpeechRecognition?: SpeechCtor;
    webkitSpeechRecognition?: SpeechCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function useSpeechRecognition() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [supported, setSupported] = useState(true);
  const recRef = useRef<SpeechRecognition | null>(null);
  const gateRef = useRef(false);

  useEffect(() => {
    const Ctor = getRecognitionCtor();
    setSupported(!!Ctor);
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    if (recRef.current) {
      try {
        recRef.current.stop();
      } catch {
        /* noop */
      }
    }
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = (e: SpeechRecognitionEvent) => {
      let finalText = '';
      let interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      if (finalText) setTranscript((t) => (t + ' ' + finalText).trim());
      setInterim(interimText);
    };
    rec.onerror = (e: any) => {
      console.warn('Speech error:', e.error);
      if (e.error === 'no-speech' || e.error === 'aborted') {
          // Silent restart
          return;
      }
      setListening(false);
    };
    rec.onend = () => {
      // Auto-restart if we think we should still be listening
      if (gateRef.current) {
        try { rec.start(); } catch { setListening(false); }
      } else {
        setListening(false);
      }
    };
    recRef.current = rec;
    try {
      gateRef.current = true;
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, []);

  const stop = useCallback(() => {
    gateRef.current = false;
    try {
      recRef.current?.stop();
    } catch { /* noop */ }
    recRef.current = null;
    setListening(false);
    setInterim('');
  }, []);
  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterim('');
  }, []);

  return { listening, transcript, interim, interimFull: transcript + (interim ? ' ' + interim : ''), supported, start, stop, resetTranscript };
}
