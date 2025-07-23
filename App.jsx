"use client";
import { useState, useEffect } from "react";

export default function DictionaryApp() {
  const [word, setWord] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechUtterance, setSpeechUtterance] = useState(null);

  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();

      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = "en-US";

      recognitionInstance.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setWord(transcript.trim());
        fetchWordData(transcript.trim());
        setIsListening(false);
      };

      recognitionInstance.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        setError("Couldn't recognize speech. Please try again.");
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    }

    return () => {
      if (recognition) {
        recognition.abort();
      }
      if (speechUtterance) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognition) {
      setError("Speech recognition is not supported in your browser.");
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
      setError(null);
    }
  };

  const fetchWordData = async (searchWord = word) => {
    if (!searchWord) return;

    try {
      setError(null);
      const res = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${searchWord}`
      );
      const data = await res.json();

      if (data.title) {
        setError("Word not found.");
        setResult(null);
      } else {
        setResult(data[0]);
      }
    } catch (err) {
      setError("An error occurred while fetching data.");
    }
  };

  const playAudio = () => {
    if (result?.phonetics?.length) {
      const audioUrl = result.phonetics.find((p) => p.audio)?.audio;
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audio.play();
      } else {
        alert("No audio available for this word.");
      }
    }
  };

  const speakMeaning = () => {
    if (result && result.meanings && result.meanings.length > 0) {
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance();
      let meaningText = "";
      result.meanings.forEach((meaning) => {
        meaningText += `Part of speech: ${meaning.partOfSpeech}. `;
        meaning.definitions.forEach((def, index) => {
          meaningText += `Definition ${index + 1}: ${def.definition}. `;
          if (def.example) {
            meaningText += `Example: ${def.example}. `;
          }
        });
      });
      utterance.text = meaningText;
      utterance.onend = () => {
        setIsSpeaking(false);
        setSpeechUtterance(null);
      };
      window.speechSynthesis.speak(utterance);
      setSpeechUtterance(utterance);
    } else {
      alert("No meaning to speak.");
    }
  };

  const stopSpeaking = () => {
    if (speechUtterance) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeechUtterance(null);
    }
  };

  return (
    <div className="search-container">
      <h1>Dictionary Search</h1>
      <div className="search-bar">
        <input
          type="text"
          placeholder="Enter a word..."
          value={word}
          onChange={(e) => setWord(e.target.value)}
        />
        <button onClick={() => fetchWordData()}>Search</button>
        <button
          onClick={toggleListening}
          className={`voice-button ${isListening ? "listening" : ""}`}
        >
          {isListening ? "Listening..." : "🎤 Speak"}
        </button>
      </div>
      {isListening && <p className="listening-indicator">Listening... Speak now</p>}
      {error && <p className="error">{error}</p>}
      {result && (
        <div className="result-card">
          <h2>{result.word}</h2>
          <p className="phonetic">{result.phonetic || "No phonetic available"}</p>
          {result.phonetics?.some((p) => p.audio) && (
            <button onClick={playAudio} className="audio-button">
              🔊 Play Audio
            </button>
          )}
          <div className="meaning-section">
            <h3>Meaning:</h3>
            {result.meanings?.map((meaning, index) => (
              <div key={index} className="meaning">
                <p className="part-of-speech">{meaning.partOfSpeech}</p>
                <ul>
                  {meaning.definitions?.map((def, i) => (
                    <li key={i}>
                      {def.definition}
                      {def.example && <p style={{ fontStyle: "italic" }}>Example: {def.example}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )) || <p>No meanings found.</p>}
          </div>
          {isSpeaking ? (
            <button onClick={stopSpeaking}>🛑 Stop Speaking</button>
          ) : (
            <button onClick={speakMeaning}>🗣️ Speak Meaning</button>
          )}
        </div>
      )}
    </div>
  );
}